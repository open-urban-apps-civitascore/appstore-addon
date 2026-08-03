import { fetchUseCaseBundle, type UseCaseBundle } from "@/lib/server/bundle";
import { getInstallStore, type InstallStore } from "@/lib/server/install-store";
import { getMockInstallDeps } from "@/lib/server/mock/deps";
import { isMockMode } from "@/lib/server/mock/mode";
import { createAuthHeaderProvider, requiredPortalBackendEnv } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import { PortalBackendError } from "@/lib/server/portal-backend/errors";
import {
  buildInstallPlan,
  demoTableName,
  demoTopic,
  readConfigurationUrn,
  readDatasetState,
  readModelUrn,
  toDatasetBody,
  toDatasinkBody,
  toDatasourceBody,
  toLifecycleStatus,
  toMappingBody,
  toPipelineBody,
  toUrnSafeName,
  type DatasinkType,
  type PipelineRefs,
} from "@/lib/server/portal-backend/mapper";
import {
  createSimulatorClient,
  simulatorBrokerUrl,
  type SimulatorClient,
} from "@/lib/server/simulator/client";
import { scenarioFor } from "@/lib/server/simulator/scenarios";
import {
  DEFAULT_ACTIVATION_OPTIONS,
  DEFAULT_INSTALL_OPTIONS,
  type ActivationOptions,
  type InstallOptions,
} from "@/types/install-options";
import {
  installedUseCaseSchema,
  type DatasetLifecycleStatus,
  type InstalledUseCase,
  type ProvisionedResources,
  type ProvisioningStep,
  type UseCase,
} from "@/types/use-cases";

/**
 * Install orchestrator: the single install path for the marketplace. It drives the
 * portal-backend call sequence and DataSet lifecycle that provision a *running* use
 * case (FROST project, APISIX routes, NiFi pipeline).
 *
 * The sequence below was **verified live on 2026-08-03** by running it by hand
 * against the Model-Forge-integrated backend (meta-repo
 * `docs/tasks/2026-08-03-install-starts-demo-data.md`, "Phase 0 — Result"). The
 * backend enforces a *release cascade* — an entity may only be linked once it is
 * AVAILABLE — so creates and releases interleave:
 *
 *   for each datastructure: create → create version → release version → release structure
 *   → create datasource (version NOT linked yet) → PATCH the released version onto
 *     it → release datasource
 *   → create dataset (DRAFT) → create datasink (BEFORE the pipeline — the pipeline
 *     links it) → create mapping → create pipeline (links datasource + datasink,
 *     references source/mapping/sink by minted URN)
 *   → stage (DRAFT→READY) → release (READY→AVAILABLE, async saga)
 *   → poll until `pendingSagaType` clears, then read the true outcome
 *     (AVAILABLE = provisioned; READY = saga failed and was compensated)
 *   → register the demo simulation, but only once AVAILABLE (MQTT keeps no
 *     history: anything published before NiFi subscribed is lost, and that failure
 *     is indistinguishable from a broken pipeline)
 *
 * Ids are not knowable in advance: every artifact's URN is minted by the server, so
 * each create's response feeds the next payload. That ref-map is what the sequence
 * is really carrying.
 *
 * If ANY step throws mid-sequence, everything created so far is torn down again
 * (best-effort, same bottom-up cascade as uninstall) before the error propagates —
 * otherwise released-but-unrecorded resources would be stranded on the backend,
 * invisible to both the idempotency check and uninstall.
 *
 * Responsibilities split cleanly: the {@link PortalBackendClient} knows endpoints +
 * transport, the mapper knows payload field names, this module knows *sequence and
 * lifecycle*. Collaborators are injected ({@link InstallDeps}) so tests can run the
 * whole sequence against a mocked HTTP server.
 */

export interface InstallDeps {
  client: PortalBackendClient;
  store: InstallStore;
  fetchBundle: (source: UseCase["source"]) => Promise<UseCaseBundle>;
  now: () => Date;
  /**
   * The demo data generator. Optional on purpose: an instance without it installs
   * use cases normally and simply offers no demo data — a *demo tool* must not
   * become a hard dependency of the install path.
   */
  simulator?: SimulatorClient;
  /** Post-release saga polling; injectable so tests run in milliseconds. */
  poll?: { intervalMs: number; timeoutMs: number };
  /**
   * Whether `installUseCase` blocks until the release saga settles.
   *
   * Defaults to **true** (tests + the CLI smoke assert the terminal outcome
   * directly). The **app opts out** (`false`): the install then returns as
   * PROVISIONING the moment the saga starts, and the installed view polls the
   * PROVISIONING → AVAILABLE/READY transition. A blocking wait would otherwise
   * hold the HTTP request open for the whole saga (up to a minute on the real
   * backend) and hide the transition from the UI.
   */
  awaitSaga?: boolean;
}

export interface InstallOutcome {
  record: InstalledUseCase;
  /** false = an existing install was reused (idempotent), not created anew. */
  created: boolean;
}

const DEFAULT_POLL = { intervalMs: 2_000, timeoutMs: 60_000 };

/** Build the production dependencies from environment configuration. */
export function defaultInstallDeps(): InstallDeps {
  // Mock mode: same orchestrator, mock collaborators (in-memory backend,
  // fixture bundles, separate seeded store) — see lib/server/mock/.
  if (isMockMode()) return getMockInstallDeps();

  return {
    client: new PortalBackendClient({
      baseUrl: requiredPortalBackendEnv("PORTAL_BACKEND_BASE_URL"),
      authProvider: createAuthHeaderProvider(),
    }),
    store: getInstallStore(),
    fetchBundle: fetchUseCaseBundle,
    now: () => new Date(),
    simulator: createSimulatorClient(),
    // Return PROVISIONING immediately; the installed view polls the saga outcome.
    awaitSaga: false,
  };
}

function step(label: string, method: string, path: string, status: number): ProvisioningStep {
  return { label, method, path, status };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Where an installed use case's data lands.
 *
 * PostGIS, not FROST — for one reason: the FROST sink in passthrough mode accepts
 * only the SensorThings envelope (`{things:[…], observations:[…]}`), which is not
 * what a sensor emits and not what the demo generator produces. PostGIS takes the
 * device's own flat record, so a real sensor is a drop-in replacement for the
 * simulation. The FROST route needs mapped mode and is a separate piece of work.
 */
const INSTALL_SINK_TYPE: DatasinkType = "POSTGIS";

/** The element everything wires to, plus the ids and URNs already minted for it. */
interface PrimaryElement {
  structureId: string;
  versionId: string;
  /** URN-safe name — the same one the backend minted the URN from. */
  name: string;
  /** Minted model URN: the sink's `element` and the mapping's `source`/`target`. */
  elementUrn: string;
  /** The element's JSON Schema, from the bundle — the mapping is derived from it. */
  schema: Record<string, unknown>;
}

/**
 * Resolve the use case's primary element from what the install has created so far.
 * Everything here is server-minted, so a missing piece means an earlier step's
 * response did not carry what it was supposed to — better to say so than to send
 * `undefined` into a payload and debug a saga.
 */
function resolvePrimaryElement(
  useCase: UseCase,
  bundle: UseCaseBundle,
  resources: ProvisionedResources,
): PrimaryElement {
  const structure = resources.dataStructures.at(-1);
  const element = bundle.elements.at(-1);
  if (!structure || !element) {
    throw new PortalBackendError(
      `Use case ${useCase.id}: bundle contains no datastructures to install.`,
      422,
    );
  }
  if (!structure.modelUrn) {
    throw new PortalBackendError(
      `Use case ${useCase.id}: the portal-backend did not return a model URN for ` +
        `${structure.name}, so the pipeline's sink and mapping cannot reference it.`,
      502,
    );
  }
  return {
    structureId: structure.id,
    versionId: structure.versionId,
    name: toUrnSafeName(structure.name),
    elementUrn: structure.modelUrn,
    schema: element.schema,
  };
}

/**
 * Create → PATCH → release the datasource, returning its minted `configurationUrn`
 * (the pipeline's `sourceRef`). Shared by install and activation.
 */
async function provisionDataSource(
  d: InstallDeps,
  useCase: UseCase,
  bundle: UseCaseBundle,
  dataSource: InstallOptions["dataSource"],
  resources: ProvisionedResources,
  steps: ProvisioningStep[],
  /** Prefixes the trace labels, so a later activation is distinguishable from the install. */
  labelPrefix = "",
): Promise<string> {
  const primary = resources.dataStructures.at(-1);
  const created = await d.client.createDatasource(
    toDatasourceBody(useCase, bundle, dataSource.mode === "own" ? dataSource.config : undefined),
  );
  resources.dataSourceId = created.id;
  steps.push(
    step(
      `${labelPrefix}${dataSource.mode === "own" ? "datasource (own broker)" : "datasource (demo broker)"}`,
      "POST",
      "/datasources",
      created.status,
    ),
  );

  const patchStatus = await d.client.patchDatasource(created.id, {
    dataStructureVersionId: primary?.versionId,
  });
  steps.push(step("attach datastructure version", "PATCH", `/datasources/${created.id}`, patchStatus));

  const releaseStatus = await d.client.releaseDatasource(created.id);
  steps.push(step("release datasource", "POST", `/datasources/${created.id}/release`, releaseStatus));

  const configurationUrn = readConfigurationUrn(created.body);
  if (!configurationUrn) {
    throw new PortalBackendError(
      "The portal-backend did not return a configuration URN for the data source, so the pipeline cannot reference it.",
      502,
    );
  }
  return configurationUrn;
}

/**
 * Sink → mapping → pipeline. Strictly ordered: the sink must exist before the
 * pipeline can list it, and both the sink's and the mapping's minted URNs go into
 * the pipeline graph, so nothing here can be built in advance.
 */
async function provisionFlow(
  d: InstallDeps,
  useCase: UseCase,
  bundle: UseCaseBundle,
  datasetId: string,
  primary: PrimaryElement,
  sourceRef: string,
  resources: ProvisionedResources,
  steps: ProvisioningStep[],
): Promise<void> {
  const tableName = demoTableName(useCase.id);

  const datasink = await d.client.createDatasink(
    datasetId,
    toDatasinkBody(primary.elementUrn, INSTALL_SINK_TYPE, tableName),
  );
  resources.dataSinkId = datasink.id;
  steps.push(
    step(`datasink (${INSTALL_SINK_TYPE} → ${tableName})`, "POST", `/datasets/${datasetId}/datasinks`, datasink.status),
  );
  const sinkRef = readConfigurationUrn(datasink.body);
  if (!sinkRef) {
    throw new PortalBackendError(
      "The portal-backend did not return a configuration URN for the data sink, so the pipeline cannot reference it.",
      502,
    );
  }

  // The mapping translates nothing (source structure == target structure) — it is
  // there because a storage sink's `element` is only ever filled from a mapping's
  // target, and the pipeline refuses to save without it. See toMappingBody.
  const mappingBody = toMappingBody(primary.elementUrn, primary.schema, `${primary.name}-identity`);
  const mapping = await d.client.createMapping(mappingBody);
  resources.mappingLogicalUrn = mapping.logicalUrn;
  steps.push(step("mapping (identity)", "POST", "/mappings", 200));

  const refs: PipelineRefs = {
    sourceRef,
    mappingRef: mapping.versionedUrn,
    sinkRef,
    dataSourceId: resources.dataSourceId!,
    dataSinkId: datasink.id,
    sinkType: INSTALL_SINK_TYPE,
    tableName,
  };
  const pipeline = await d.client.createPipeline(
    datasetId,
    toPipelineBody(bundle, refs, { ...mappingBody, positions: {} }, {
      id: primary.structureId,
      versionId: primary.versionId,
      name: primary.name,
    }),
  );
  resources.pipelineId = pipeline.id;
  steps.push(step("pipeline", "POST", `/datasets/${datasetId}/pipelines`, pipeline.status));
}

/**
 * Start the demo data flowing — best-effort, and only once the dataset is really
 * AVAILABLE. Earlier is worse than useless: MQTT keeps no history, so everything
 * published before NiFi has subscribed is lost, and the symptom (an empty table)
 * is indistinguishable from a broken pipeline.
 *
 * Never for `own`: publishing test traffic onto a municipality's real broker is
 * not ours to do. Never a thrown error: the install has already succeeded.
 */
async function registerSimulation(
  d: InstallDeps,
  record: InstalledUseCase,
): Promise<InstalledUseCase> {
  if (!d.simulator) return record;
  if (record.dataSourceMode !== "demo") return record;
  if (record.status !== "AVAILABLE") return record;
  if (record.simulation && !record.simulation.error) return record;

  const scenario = scenarioFor(record.useCaseId);
  // No scenario means no demo mode for this use case. We never fabricate one from
  // the JSON Schema: it produces `vehicleCount: 0` forever, or four million cars a
  // minute — worse than showing nothing.
  if (!scenario) return record;

  const topic = demoTopic(record.useCaseId);
  const outcome = await d.simulator.register(record.id, {
    brokerUrl: simulatorBrokerUrl(),
    topic,
    scenario,
  });

  return {
    ...record,
    simulation: {
      id: record.id,
      topic,
      registeredAt: d.now().toISOString(),
      ...(outcome.ok ? {} : { error: outcome.error }),
    },
  };
}

/**
 * Provision a use case via the portal-backend, recording the install locally.
 *
 * Idempotent: if this use case is already recorded and its dataset still exists on
 * the backend, the existing install is reused (its live status refreshed) rather
 * than creating a duplicate — the options of the *first* install stand. A `409
 * Conflict` on release (a saga already in flight) is likewise treated as "already
 * provisioning", not an error.
 *
 * `options` is the pre-install fork (D10): data source demo/own/later + go-live
 * release/stage. Omitted → the one-click demo path (demo source, release now).
 */
export async function installUseCase(
  useCase: UseCase,
  deps?: InstallDeps,
  options?: InstallOptions,
): Promise<InstallOutcome> {
  const d = deps ?? defaultInstallDeps();
  const opts = options ?? DEFAULT_INSTALL_OPTIONS;

  // ── Idempotent reuse ─────────────────────────────────────────────────────────
  const existing = await d.store.get(useCase.id);
  if (existing) {
    const live = await d.client.getDataset(existing.id);
    if (live !== null) {
      const status = toLifecycleStatus(readDatasetState(live)) ?? existing.status;
      const record = withStatus(existing, status);
      await d.store.save(record);
      return { record, created: false };
    }
    // Stale record: the dataset was deleted out-of-band (e.g. portal UI). The
    // datasource + datastructures exist independently of the dataset row, and this
    // record is the ONLY holder of their ids — tear them down before dropping it,
    // or they are orphaned forever and the reinstall duplicates them.
    await teardownBackendResources(d, existing.id, existing.provisionedResources);
    await d.store.remove(useCase.id);
  }

  // ── Fresh provisioning ───────────────────────────────────────────────────────
  const bundle = await d.fetchBundle(useCase.source);
  const plan = buildInstallPlan(bundle);
  const steps: ProvisioningStep[] = [];

  // Filled as the sequence progresses; on a mid-sequence failure this is exactly
  // what the rollback needs to tear down.
  const partial: ProvisionedResources = { dataStructures: [] };
  let datasetId: string | null = null;

  try {
    // 1. Datastructures — create, attach the versioned schema, then release BOTH the
    //    version and the structure itself (the backend only links AVAILABLE parents).
    for (const ds of plan.datastructures) {
      const created = await d.client.createDatastructure(ds.createBody);
      steps.push(step(`datastructure ${ds.name}`, "POST", "/datastructures", created.status));

      const version = await d.client.createDatastructureVersion(created.id, ds.versionBody);
      steps.push(
        step(`datastructure version ${ds.name}@${ds.version}`, "POST", `/datastructures/${created.id}/versions`, version.status),
      );
      // Track as soon as both ids exist — a failure below must clean this up too.
      // The minted `modelUrn` comes back on THIS response and nowhere else.
      partial.dataStructures.push({
        id: created.id,
        versionId: version.id,
        name: ds.name,
        version: ds.version,
        modelUrn: readModelUrn(version.body) ?? undefined,
      });

      const versionRelease = await d.client.releaseDatastructureVersion(created.id, version.id);
      steps.push(
        step(`release version ${ds.name}@${ds.version}`, "POST", `/datastructures/${created.id}/versions/${version.id}/release`, versionRelease),
      );

      const structureRelease = await d.client.releaseDatastructure(created.id);
      steps.push(
        step(`release datastructure ${ds.name}`, "POST", `/datastructures/${created.id}/release`, structureRelease),
      );
    }

    // The structure the datasource, the mapping and the sink all wire to. The
    // bundle's `dataStructureRefs` are in DEPENDENCY order ("a referenced element
    // comes before its user" — see bundle.ts), so the top-level record the use case
    // is about comes LAST. TODO(content): make this an explicit bundle field.
    const primary = resolvePrimaryElement(useCase, bundle, partial);

    let status: DatasetLifecycleStatus;

    if (opts.dataSource.mode === "later") {
      // D10 "configure later": no data source exists yet, so nothing below the
      // dataset can be built (a pipeline may only link an AVAILABLE datasource,
      // and stage requires a wired pipeline). Install a DRAFT shell — the released
      // datastructures + the dataset — and let the post-install activation
      // complete the graph once the source is configured.
      const dataset = await d.client.createDataset(toDatasetBody(bundle));
      datasetId = dataset.id;
      steps.push(step("dataset (DRAFT — datasource deferred)", "POST", "/datasets", dataset.status));
      status = "DRAFT";
    } else {
      // 2. Datasource — created WITHOUT the version (a create-time link is
      //    rejected), then PATCHed, then released so the pipeline may link it.
      //    "own" carries the user's broker config into the backend payload
      //    (credentials never touch the record/trace — D3); "demo" points at the
      //    bundled simulation broker.
      const sourceRef = await provisionDataSource(d, useCase, bundle, opts.dataSource, partial, steps);

      // 3. Dataset — created in DRAFT (the aggregate root of the use case).
      const dataset = await d.client.createDataset(toDatasetBody(bundle));
      datasetId = dataset.id;
      steps.push(step("dataset (DRAFT)", "POST", "/datasets", dataset.status));

      // 4. Sink → mapping → pipeline, in that order: the pipeline references all
      //    three by minted URN, so none of it can be built ahead of time.
      await provisionFlow(d, useCase, bundle, datasetId, primary, sourceRef, partial, steps);

      // 5. Lifecycle: stage validates the pipeline wiring (DRAFT→READY)…
      const stageStatus = await d.client.stageDataset(datasetId);
      steps.push(step("stage (DRAFT→READY)", "POST", `/datasets/${datasetId}/stage`, stageStatus));

      if (opts.goLive === "stage") {
        // D10 "stage for review": stop at READY. Releasing is a privileged,
        // reviewed action (DATASET_RELEASE) — an authorised human takes it live
        // later via the post-install activation.
        status = "READY";
      } else {
        // …then release triggers the async provisioning saga (READY→AVAILABLE).
        const release = await d.client.releaseDataset(datasetId);
        steps.push(
          step(
            release.kind === "in-flight" ? "release (409 saga already in flight)" : "release (saga started)",
            "POST",
            `/datasets/${datasetId}/release`,
            release.status,
          ),
        );

        // 6. The saga is asynchronous AND the status flips optimistically to AVAILABLE
        //    before it finishes — a single read lies. Two modes (see InstallDeps.awaitSaga):
        //    - await (tests/CLI): poll until `pendingSagaType` clears, then record the true
        //      outcome (AVAILABLE = provisioned, READY = compensated).
        //    - the app (awaitSaga=false): return NOW as PROVISIONING and let the installed
        //      view poll the transition — a blocking wait would hold the HTTP request open
        //      for the whole saga and hide PROVISIONING → AVAILABLE from the UI.
        if (d.awaitSaga ?? true) {
          const outcome = await awaitSagaOutcome(d, datasetId);
          status = outcome.status;
          if (outcome.sagaOutcome) steps.push(step(outcome.sagaOutcome, "GET", `/datasets/${datasetId}`, 200));
        } else {
          // Right after release the dataset is optimistically AVAILABLE with a pending
          // CREATE saga → projects to PROVISIONING (readDatasetState / toLifecycleStatus).
          const live = await d.client.getDataset(datasetId).catch(() => null);
          status = toLifecycleStatus(readDatasetState(live)) ?? "PROVISIONING";
        }
      }
    }

    // Non-empty answers to the bundle's installQuestions — free text, no secrets
    // (broker credentials live only in the datasource payload above).
    const answers = Object.fromEntries(
      Object.entries(opts.answers)
        .map(([question, answer]) => [question, answer.trim()])
        .filter(([, answer]) => answer !== ""),
    );

    // Role bindings chosen in the install wizard (role key → group). Recorded so
    // the installation view can show who got what; creating the assignments on
    // the backend is milestone work, not part of this install path.
    // `?? {}` because callers may hand in a hand-built options object rather than
    // a schema-parsed one (tests, CLI) — a missing optional axis must behave like
    // "not chosen", never throw.
    const assignedRoles = Object.fromEntries(
      Object.entries(opts.roleAssignments ?? {})
        .map(([role, group]) => [role, group.trim()])
        .filter(([, group]) => group !== ""),
    );

    const record = installedUseCaseSchema.parse({
      id: datasetId,
      useCaseId: useCase.id,
      useCaseTitle: useCase.title,
      installedAt: d.now().toISOString(),
      status,
      source: "portal-backend",
      createdDataset: {
        name: plan.summary.datasetTitle,
        description: plan.summary.datasetDescription,
        openDataAccess: false,
        status,
      },
      createdDataStructures: plan.summary.dataStructures,
      datasetRef: useCase.modelForge,
      installAnswers: Object.keys(answers).length > 0 ? answers : undefined,
      dataSourceMode: opts.dataSource.mode,
      roleAssignments: Object.keys(assignedRoles).length > 0 ? assignedRoles : undefined,
      provisioningTrace: { provisionedAt: d.now().toISOString(), steps },
      provisionedResources: partial,
    } satisfies InstalledUseCase);

    // Demo data, if this install is already live. In the app it never is yet
    // (`awaitSaga: false` returns at PROVISIONING), so the usual entry point is
    // `refreshInstalledUseCaseStatus` — this branch covers the blocking callers.
    const withSimulation = await registerSimulation(d, record);

    await d.store.save(withSimulation);
    return { record: withSimulation, created: true };
  } catch (error) {
    // Roll back whatever this attempt created (best-effort): without a stored
    // record these resources would be invisible to uninstall AND to the
    // idempotency check, and a retry would provision a duplicate graph.
    await teardownBackendResources(d, datasetId, partial).catch((cleanupError) => {
      console.error(
        `[portal-backend] install rollback for '${useCase.id}' left resources behind:`,
        cleanupError,
        "created so far:",
        JSON.stringify({ datasetId, ...partial }),
      );
    });
    throw error;
  }
}

/**
 * Uninstall = tear down whatever the install created, in the verified bottom-up
 * order. Records written before `provisionedResources` existed fall back to
 * removing only the dataset. Returns false when nothing is installed.
 */
export async function uninstallUseCase(useCaseId: string, deps?: InstallDeps): Promise<boolean> {
  const d = deps ?? defaultInstallDeps();

  const record = await d.store.get(useCaseId);
  if (!record) return false;

  // Stop the demo data FIRST, and best-effort: publishing into a half-torn-down
  // pipeline is noise, and an unreachable generator must not block an uninstall.
  if (record.simulation && d.simulator) {
    await d.simulator.unregister(record.simulation.id);
  }

  await teardownBackendResources(d, record.id, record.provisionedResources);
  await d.store.remove(useCaseId);
  return true;
}

/**
 * Post-install activation — the second half of D10. Completes what the install
 * fork deferred, branching on the dataset's LIVE status:
 *
 *   - DRAFT ("configure later"): build the missing half of the graph — datasource
 *     (demo preset or the user's own broker) → release → datasink → pipeline →
 *     stage — then release (or stop at READY when `goLive: "stage"`).
 *   - READY ("stage for review", or a compensated saga): release — the privileged
 *     human action taking it live. Releasing a compensated-READY simply retries.
 *   - AVAILABLE / saga in flight: nothing to do — returns the record unchanged.
 *
 * Failure semantics differ from install: a mid-activation failure must NOT tear
 * down the previously-valid DRAFT — instead everything created so far is merged
 * into the record (so uninstall can clean it up) and the error propagates; the
 * next activation attempt removes those leftovers first and builds fresh.
 *
 * Returns null when this use case is not installed at all.
 */
export async function activateInstalledUseCase(
  useCase: UseCase,
  deps?: InstallDeps,
  options?: ActivationOptions,
): Promise<InstalledUseCase | null> {
  const d = deps ?? defaultInstallDeps();
  const opts = options ?? DEFAULT_ACTIVATION_OPTIONS;

  const record = await d.store.get(useCase.id);
  if (!record) return null;

  const live = await d.client.getDataset(record.id);
  if (live === null) {
    throw new PortalBackendError(
      "Der Datensatz existiert auf dem Portal-Backend nicht mehr — bitte deinstallieren und neu installieren.",
      409,
    );
  }
  const state = readDatasetState(live);
  if (state.pendingSagaType !== null || state.backendStatus === "AVAILABLE") {
    // Saga in flight or already live — activation has nothing to do.
    return record;
  }

  const steps: ProvisioningStep[] = [];
  const resources: ProvisionedResources = {
    dataStructures: record.provisionedResources?.dataStructures ?? [],
  };

  if (state.backendStatus === "DRAFT") {
    const bundle = await d.fetchBundle(useCase.source);
    const primary = resolvePrimaryElement(useCase, bundle, resources);

    // Leftovers from a previously failed activation attempt: remove them first
    // (best-effort), then build fresh — re-linking half-created children is not
    // worth the complexity.
    const leftovers = record.provisionedResources;
    if (leftovers?.pipelineId) await d.client.deletePipeline(record.id, leftovers.pipelineId).catch(() => undefined);
    if (leftovers?.mappingLogicalUrn) await d.client.deleteMapping(leftovers.mappingLogicalUrn).catch(() => undefined);
    if (leftovers?.dataSinkId) await d.client.deleteDatasink(record.id, leftovers.dataSinkId).catch(() => undefined);
    if (leftovers?.dataSourceId) {
      await d.client.unreleaseDatasource(leftovers.dataSourceId).catch(() => undefined);
      await d.client.deleteDatasource(leftovers.dataSourceId).catch(() => undefined);
    }

    try {
      const sourceRef = await provisionDataSource(
        d,
        useCase,
        bundle,
        opts.dataSource,
        resources,
        steps,
        "activate: ",
      );
      await provisionFlow(d, useCase, bundle, record.id, primary, sourceRef, resources, steps);

      const stageStatus = await d.client.stageDataset(record.id);
      steps.push(step("stage (DRAFT→READY)", "POST", `/datasets/${record.id}/stage`, stageStatus));
    } catch (error) {
      // Keep everything created so far on the record — uninstall relies on these
      // ids, and the next activation attempt clears them before building fresh.
      await d.store
        .save(appendActivation(record, resources, steps, "DRAFT"))
        .catch(() => undefined);
      throw error;
    }
  } else {
    // READY: the graph exists (stage-for-review or a compensated saga) — keep
    // whatever child ids the record already carries.
    resources.dataSourceId = record.provisionedResources?.dataSourceId;
    resources.dataSinkId = record.provisionedResources?.dataSinkId;
    resources.pipelineId = record.provisionedResources?.pipelineId;
    resources.mappingLogicalUrn = record.provisionedResources?.mappingLogicalUrn;
  }

  let status: DatasetLifecycleStatus = "READY";
  if (opts.goLive === "release") {
    const release = await d.client.releaseDataset(record.id);
    steps.push(
      step(
        release.kind === "in-flight" ? "release (409 saga already in flight)" : "release (saga started)",
        "POST",
        `/datasets/${record.id}/release`,
        release.status,
      ),
    );

    if (d.awaitSaga ?? true) {
      const outcome = await awaitSagaOutcome(d, record.id);
      status = outcome.status;
      if (outcome.sagaOutcome) steps.push(step(outcome.sagaOutcome, "GET", `/datasets/${record.id}`, 200));
    } else {
      const liveAfter = await d.client.getDataset(record.id).catch(() => null);
      status = toLifecycleStatus(readDatasetState(liveAfter)) ?? "PROVISIONING";
    }
  }

  const updated = await registerSimulation(d, appendActivation(record, resources, steps, status));
  await d.store.save(updated);
  return updated;
}

/** Merge activation results into a record: resources, appended trace steps, status. */
function appendActivation(
  record: InstalledUseCase,
  resources: ProvisionedResources,
  steps: ProvisioningStep[],
  status: DatasetLifecycleStatus,
): InstalledUseCase {
  const trace = record.provisioningTrace;
  return withStatus(
    {
      ...record,
      provisionedResources: resources,
      provisioningTrace:
        steps.length === 0
          ? trace
          : {
              provisionedAt: trace?.provisionedAt ?? new Date().toISOString(),
              steps: [...(trace?.steps ?? []), ...steps],
            },
    },
    status,
  );
}

/**
 * The verified bottom-up teardown cascade (references block deletion hard with
 * 400/409). Shared by uninstall and the install-failure rollback:
 *
 *   saga in flight? → WAIT for it first (unrelease during a saga hits the 409
 *   guard, and the branch must be chosen on the true post-saga status)
 *   → AVAILABLE: unrelease (infra-teardown saga) + wait · READY: unstage
 *   → delete pipeline → delete datasink → delete dataset
 *   → unrelease + delete datasource → unrelease + delete datastructures
 *
 * The unrelease calls on datasource/datastructures are best-effort (a rolled-back
 * install may leave them in DRAFT, where unrelease 4xxes); the deletes are not.
 */
async function teardownBackendResources(
  deps: InstallDeps,
  datasetId: string | null,
  resources: ProvisionedResources | undefined,
): Promise<void> {
  if (datasetId !== null) {
    const live = await deps.client.getDataset(datasetId);
    if (live !== null) {
      let state = readDatasetState(live);

      // A saga in flight guards the dataset with 409s — wait for it to settle,
      // then re-read; the TRUE status decides the branch (a compensated CREATE
      // saga ends at READY, which needs unstage, not unrelease).
      if (state.pendingSagaType !== null) {
        await awaitSagaOutcome(deps, datasetId);
        state = readDatasetState(await deps.client.getDataset(datasetId));
      }

      if (state.backendStatus === "AVAILABLE") {
        // Tears down the provisioned infrastructure via the async DELETE saga.
        // On success the dataset lands on READY (NOT DRAFT — verified in
        // DataSetService.handleSagaCompleted), and the nested deletes below
        // require a DRAFT parent — so use the saga outcome and unstage.
        await deps.client.unreleaseDataset(datasetId);
        const { status } = await awaitSagaOutcome(deps, datasetId);
        if (status === "PROVISIONING") {
          // Poll timeout: deleting while the teardown saga still runs would only
          // produce 400/409s — stop cleanly and let the caller retry later.
          throw new PortalBackendError(
            "The dataset's teardown saga is still in progress — retry the uninstall shortly.",
            503,
          );
        }
        if (status === "READY") {
          await deps.client.unstageDataset(datasetId);
        }
      } else if (state.backendStatus === "READY") {
        await deps.client.unstageDataset(datasetId);
      }

      if (resources?.pipelineId) await deps.client.deletePipeline(datasetId, resources.pipelineId);
      // After the pipeline, before the sink: `force` unlinks the mapping from any
      // dataset still referencing it, so a leftover `mappingRef` cannot block it.
      if (resources?.mappingLogicalUrn) await deps.client.deleteMapping(resources.mappingLogicalUrn);
      if (resources?.dataSinkId) await deps.client.deleteDatasink(datasetId, resources.dataSinkId);
      await deps.client.deleteDataset(datasetId);
    }
  }

  // Below-dataset resources exist independently of the dataset row, so clean them
  // up even when the dataset itself was never created / is already gone.
  if (resources?.dataSourceId) {
    await deps.client.unreleaseDatasource(resources.dataSourceId).catch(() => undefined);
    await deps.client.deleteDatasource(resources.dataSourceId);
  }
  for (const structure of resources?.dataStructures ?? []) {
    await deps.client.unreleaseDatastructure(structure.id).catch(() => undefined);
    await deps.client.deleteDatastructure(structure.id);
  }
}

/**
 * Best-effort live status for a stored install (used by the installed-list view).
 * Falls back to the record's stored status if the backend has no newer state.
 *
 * This is also where demo data starts. The app installs asynchronously
 * (`awaitSaga: false`), so at install time the dataset is still PROVISIONING and
 * NiFi has not subscribed yet; this poll is the first moment AVAILABLE is known,
 * and registering any earlier would publish into a broker nobody is listening to.
 * The updated record is persisted, so the registration happens once, not on every
 * poll.
 */
export async function refreshInstalledUseCaseStatus(
  record: InstalledUseCase,
  deps?: InstallDeps,
): Promise<InstalledUseCase> {
  const d = deps ?? defaultInstallDeps();
  const live = await d.client.getDataset(record.id);
  const status = live === null ? record.status : (toLifecycleStatus(readDatasetState(live)) ?? record.status);

  if (status === record.status) {
    // A retry path: the status is settled but a previous registration failed (the
    // generator was down). Trying again here costs one call and makes the demo
    // self-healing once it comes back.
    const retried = await registerSimulation(d, record);
    if (retried !== record) await d.store.save(retried).catch(() => undefined);
    return retried;
  }

  // The status settled since the record was written (e.g. the async install
  // returned PROVISIONING and the saga has now finished): carry the new status
  // AND complete the trace with the saga-outcome step the async path left off.
  const settled = withStatus(withSagaOutcomeStep(record, status), status);
  const withSimulation = await registerSimulation(d, settled);
  await d.store.save(withSimulation).catch(() => undefined);
  return withSimulation;
}

/**
 * Wait for the release/unrelease saga to finish: poll `GET /datasets/{id}` until
 * `pendingSagaType` is null (saga ended — success or compensated), then read the
 * true `dataSetStatus`. On timeout, report PROVISIONING and let the installed view
 * catch up later. Read failures resolve to PROVISIONING rather than failing the
 * whole install — the lifecycle call itself already succeeded.
 */
async function awaitSagaOutcome(
  deps: InstallDeps,
  datasetId: string,
): Promise<{ status: DatasetLifecycleStatus; sagaOutcome: string | null }> {
  const poll = deps.poll ?? DEFAULT_POLL;
  const deadline = Date.now() + poll.timeoutMs;

  for (;;) {
    const live = await deps.client.getDataset(datasetId).catch(() => null);
    const state = readDatasetState(live);

    if (live !== null && state.pendingSagaType === null && state.backendStatus !== null) {
      return { status: state.backendStatus, sagaOutcome: sagaOutcomeLabel(state.backendStatus) };
    }

    if (Date.now() >= deadline) {
      return { status: "PROVISIONING", sagaOutcome: "saga still in flight (poll timeout)" };
    }
    await sleep(poll.intervalMs);
  }
}

function withStatus(record: InstalledUseCase, status: DatasetLifecycleStatus): InstalledUseCase {
  return {
    ...record,
    status,
    createdDataset: { ...record.createdDataset, status },
  };
}

/** The saga-outcome trace label for a settled dataset status. */
function sagaOutcomeLabel(status: DatasetLifecycleStatus): string {
  return status === "AVAILABLE"
    ? "saga succeeded (AVAILABLE)"
    : status === "READY"
      ? "saga failed — compensated back to READY"
      : `saga finished (${status})`;
}

/**
 * Complete an async install's trace. The app returns PROVISIONING before the saga
 * finishes, so its trace stops at "release (saga started)". When the status later
 * settles, append the saga-outcome step the blocking path would have recorded.
 * Idempotent (skips when an outcome step is already present); a no-op for a
 * non-terminal status or a traceless record.
 */
function withSagaOutcomeStep(record: InstalledUseCase, status: DatasetLifecycleStatus): InstalledUseCase {
  const trace = record.provisioningTrace;
  if (!trace || (status !== "AVAILABLE" && status !== "READY")) return record;
  if (trace.steps.at(-1)?.label.startsWith("saga ")) return record;
  return {
    ...record,
    provisioningTrace: {
      ...trace,
      steps: [...trace.steps, step(sagaOutcomeLabel(status), "GET", `/datasets/${record.id}`, 200)],
    },
  };
}
