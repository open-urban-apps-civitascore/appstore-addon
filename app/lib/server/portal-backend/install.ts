import { fetchUseCaseBundle, type UseCaseBundle } from "@/lib/server/bundle";
import { getInstallStore, type InstallStore } from "@/lib/server/install-store";
import { createAuthHeaderProvider, requiredPortalBackendEnv } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import {
  buildInstallPlan,
  readDatasetState,
  toDatasetBody,
  toDatasinkBody,
  toDatasourceBody,
  toLifecycleStatus,
  toPipelineBody,
} from "@/lib/server/portal-backend/mapper";
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
 * The sequence below was **verified live on 2026-07-14** (meta-repo spike doc,
 * "Update (2026-07-14)"). The backend enforces a *release cascade* — an entity may
 * only be linked once it is AVAILABLE — so creates and releases interleave:
 *
 *   for each datastructure: create → create version → release version → release structure
 *   → create datasource (links the released version) → release datasource
 *   → create dataset (DRAFT) → create datasink (BEFORE the pipeline — the pipeline
 *     links it) → create pipeline (links datasource + datasink)
 *   → stage (DRAFT→READY) → release (READY→AVAILABLE, async saga)
 *   → poll until `pendingSagaType` clears, then read the true outcome
 *     (AVAILABLE = provisioned; READY = saga failed and was compensated)
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
  /** Post-release saga polling; injectable so tests run in milliseconds. */
  poll?: { intervalMs: number; timeoutMs: number };
}

export interface InstallOutcome {
  record: InstalledUseCase;
  /** false = an existing install was reused (idempotent), not created anew. */
  created: boolean;
}

const DEFAULT_POLL = { intervalMs: 2_000, timeoutMs: 60_000 };

/** Build the production dependencies from environment configuration. */
export function defaultInstallDeps(): InstallDeps {
  return {
    client: new PortalBackendClient({
      baseUrl: requiredPortalBackendEnv("PORTAL_BACKEND_BASE_URL"),
      authProvider: createAuthHeaderProvider(),
    }),
    store: getInstallStore(),
    fetchBundle: fetchUseCaseBundle,
    now: () => new Date(),
  };
}

function step(label: string, method: string, path: string, status: number): ProvisioningStep {
  return { label, method, path, status };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Provision a use case via the portal-backend, recording the install locally.
 *
 * Idempotent: if this use case is already recorded and its dataset still exists on
 * the backend, the existing install is reused (its live status refreshed) rather
 * than creating a duplicate. A `409 Conflict` on release (a saga already in flight)
 * is likewise treated as "already provisioning", not an error.
 */
export async function installUseCase(useCase: UseCase, deps?: InstallDeps): Promise<InstallOutcome> {
  const d = deps ?? defaultInstallDeps();

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
    // Stale record: the dataset was deleted out-of-band. Drop it and reinstall.
    await d.store.remove(useCase.id);
  }

  // ── Fresh provisioning ───────────────────────────────────────────────────────
  const bundle = await d.fetchBundle(useCase.source);
  const plan = buildInstallPlan(bundle);
  const steps: ProvisioningStep[] = [];
  const structures: ProvisionedResources["dataStructures"] = [];

  // 1. Datastructures — create, attach the versioned schema, then release BOTH the
  //    version and the structure itself (the backend only links AVAILABLE parents).
  for (const ds of plan.datastructures) {
    const created = await d.client.createDatastructure(ds.createBody);
    steps.push(step(`datastructure ${ds.name}`, "POST", "/datastructures", created.status));

    const version = await d.client.createDatastructureVersion(created.id, ds.versionBody);
    steps.push(
      step(`datastructure version ${ds.name}@${ds.version}`, "POST", `/datastructures/${created.id}/versions`, version.status),
    );

    const versionRelease = await d.client.releaseDatastructureVersion(created.id, version.id);
    steps.push(
      step(`release version ${ds.name}@${ds.version}`, "POST", `/datastructures/${created.id}/versions/${version.id}/release`, versionRelease),
    );

    const structureRelease = await d.client.releaseDatastructure(created.id);
    steps.push(
      step(`release datastructure ${ds.name}`, "POST", `/datastructures/${created.id}/release`, structureRelease),
    );

    structures.push({ id: created.id, versionId: version.id, name: ds.name, version: ds.version });
  }

  // The version the datasource + FROST sink wire to. Convention: the bundle's first
  // element is the primary structure. TODO(content): make this an explicit bundle field.
  const primaryVersionId = structures[0]?.versionId;
  if (!primaryVersionId) {
    throw new Error(`Use case ${useCase.id}: bundle contains no datastructures to install.`);
  }

  // 2. Datasource — links the released version; must itself be released before the
  //    pipeline may link it.
  const datasource = await d.client.createDatasource(
    toDatasourceBody(useCase, bundle, primaryVersionId),
  );
  steps.push(step("datasource", "POST", "/datasources", datasource.status));

  const datasourceRelease = await d.client.releaseDatasource(datasource.id);
  steps.push(step("release datasource", "POST", `/datasources/${datasource.id}/release`, datasourceRelease));

  // 3. Dataset — created in DRAFT (the aggregate root of the use case).
  const dataset = await d.client.createDataset(toDatasetBody(bundle));
  const datasetId = dataset.id;
  steps.push(step("dataset (DRAFT)", "POST", "/datasets", dataset.status));

  // 4. Datasink FIRST (the pipeline links it via dataSinkIds), then the pipeline.
  const datasink = await d.client.createDatasink(datasetId, toDatasinkBody(primaryVersionId));
  steps.push(step("datasink (FROST)", "POST", `/datasets/${datasetId}/datasinks`, datasink.status));

  const pipeline = await d.client.createPipeline(
    datasetId,
    toPipelineBody(bundle, datasource.id, datasink.id),
  );
  steps.push(step("pipeline", "POST", `/datasets/${datasetId}/pipelines`, pipeline.status));

  // 5. Lifecycle: stage validates the pipeline wiring (DRAFT→READY)…
  const stageStatus = await d.client.stageDataset(datasetId);
  steps.push(step("stage (DRAFT→READY)", "POST", `/datasets/${datasetId}/stage`, stageStatus));

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
  //    before the saga finishes — a single read lies. Poll until `pendingSagaType`
  //    clears; only then is `dataSetStatus` the true outcome.
  const { status, sagaOutcome } = await awaitSagaOutcome(d, datasetId);
  if (sagaOutcome) steps.push(step(sagaOutcome, "GET", `/datasets/${datasetId}`, 200));

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
    provisioningTrace: { provisionedAt: d.now().toISOString(), steps },
    provisionedResources: {
      dataStructures: structures,
      dataSourceId: datasource.id,
      dataSinkId: datasink.id,
      pipelineId: pipeline.id,
    },
  } satisfies InstalledUseCase);

  await d.store.save(record);
  return { record, created: true };
}

/**
 * Uninstall = tear down whatever the install created, in the verified bottom-up
 * order (references block deletion hard with 400/409):
 *
 *   AVAILABLE → unrelease (infra teardown saga) → poll · READY → unstage
 *   → delete pipeline → delete datasink → delete dataset
 *   → unrelease + delete datasource → unrelease + delete datastructures
 *
 * Records written before `provisionedResources` existed fall back to removing only
 * the dataset. Returns false when nothing is installed for this use case.
 */
export async function uninstallUseCase(useCaseId: string, deps?: InstallDeps): Promise<boolean> {
  const d = deps ?? defaultInstallDeps();

  const record = await d.store.get(useCaseId);
  if (!record) return false;

  const datasetId = record.id;
  const resources = record.provisionedResources;
  const live = await d.client.getDataset(datasetId);

  if (live !== null) {
    const state = readDatasetState(live);

    if (state.backendStatus === "AVAILABLE" || state.pendingSagaType !== null) {
      // AVAILABLE→DRAFT; this tears down the provisioned infrastructure via its own
      // async saga — wait for it before deleting anything underneath.
      await d.client.unreleaseDataset(datasetId);
      await awaitSagaOutcome(d, datasetId);
    } else if (state.backendStatus === "READY") {
      await d.client.unstageDataset(datasetId);
    }

    if (resources?.pipelineId) await d.client.deletePipeline(datasetId, resources.pipelineId);
    if (resources?.dataSinkId) await d.client.deleteDatasink(datasetId, resources.dataSinkId);
    await d.client.deleteDataset(datasetId);
  }

  // Below-dataset resources exist independently of the dataset row, so clean them
  // up even when the dataset itself was already gone.
  if (resources?.dataSourceId) {
    await d.client.unreleaseDatasource(resources.dataSourceId).catch(() => undefined);
    await d.client.deleteDatasource(resources.dataSourceId);
  }
  for (const structure of resources?.dataStructures ?? []) {
    await d.client.unreleaseDatastructure(structure.id).catch(() => undefined);
    await d.client.deleteDatastructure(structure.id);
  }

  await d.store.remove(useCaseId);
  return true;
}

/**
 * Best-effort live status for a stored install (used by the installed-list view).
 * Falls back to the record's stored status if the backend has no newer state.
 */
export async function refreshInstalledUseCaseStatus(
  record: InstalledUseCase,
  deps?: InstallDeps,
): Promise<InstalledUseCase> {
  const d = deps ?? defaultInstallDeps();
  const live = await d.client.getDataset(record.id);
  const status = live === null ? record.status : (toLifecycleStatus(readDatasetState(live)) ?? record.status);
  return status === record.status ? record : withStatus(record, status);
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
      const outcome =
        state.backendStatus === "AVAILABLE"
          ? "saga succeeded (AVAILABLE)"
          : state.backendStatus === "READY"
            ? "saga failed — compensated back to READY"
            : `saga finished (${state.backendStatus})`;
      return { status: state.backendStatus, sagaOutcome: outcome };
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
