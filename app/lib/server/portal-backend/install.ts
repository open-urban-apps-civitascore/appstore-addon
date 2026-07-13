import { fetchUseCaseBundle, type UseCaseBundle } from "@/lib/server/bundle";
import { getInstallStore, type InstallStore } from "@/lib/server/install-store";
import { createAuthHeaderProvider, requiredPortalBackendEnv } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import {
  buildInstallPlan,
  readLifecycleStatus,
  toPipelineBody,
} from "@/lib/server/portal-backend/mapper";
import {
  installedUseCaseSchema,
  type DatasetLifecycleStatus,
  type InstalledUseCase,
  type ProvisioningStep,
  type UseCase,
} from "@/types/use-cases";

/**
 * Install orchestrator: the single install path for the marketplace. It drives the
 * portal-backend call sequence and DataSet lifecycle that provision a *running* use
 * case (FROST project, APISIX route, NiFi pipeline), in the contract's required
 * order:
 *
 *   datastructure(s) → datasource → dataset(DRAFT) → pipeline + datasink
 *     → stage(DRAFT→READY) → release(READY→AVAILABLE, async)
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
}

export interface InstallOutcome {
  record: InstalledUseCase;
  /** false = an existing install was reused (idempotent), not created anew. */
  created: boolean;
}

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
      const status = readLifecycleStatus(live) ?? existing.status;
      const record = withStatus(existing, status);
      await d.store.save(record);
      return { record, created: false };
    }
    // Stale record: the dataset was deleted out-of-band. Drop it and reinstall.
    await d.store.remove(useCase.id);
  }

  // ── Fresh provisioning ───────────────────────────────────────────────────────
  const bundle = await d.fetchBundle(useCase.source);
  const plan = buildInstallPlan(useCase, bundle);
  const steps: ProvisioningStep[] = [];

  // 1. Datastructures: create, attach the versioned schema, release the version.
  for (const ds of plan.datastructures) {
    const created = await d.client.createDatastructure(ds.createBody);
    steps.push(step(`datastructure ${ds.name}`, "POST", "/datastructures", created.status));

    const version = await d.client.createDatastructureVersion(created.id, ds.versionBody);
    steps.push(
      step(`datastructure version ${ds.name}@${ds.version}`, "POST", `/datastructures/${created.id}/versions`, version.status),
    );

    const releaseStatus = await d.client.releaseDatastructureVersion(created.id, version.id);
    steps.push(
      step(`release datastructure version ${ds.name}`, "POST", `/datastructures/${created.id}/versions/${version.id}/release`, releaseStatus),
    );
  }

  // 2. Datasource (connection details / secrets — placeholder for now).
  const datasource = await d.client.createDatasource(plan.datasource);
  steps.push(step("datasource", "POST", "/datasources", datasource.status));

  // 3. Dataset — created in DRAFT (the aggregate root of the use case).
  const dataset = await d.client.createDataset(plan.dataset);
  const datasetId = dataset.id;
  steps.push(step("dataset (DRAFT)", "POST", "/datasets", dataset.status));

  // 4. Pipeline + datasink, nested under the dataset. The pipeline references the
  //    datasource's server-assigned id, hence built here (not in the static plan).
  const pipeline = await d.client.createPipeline(
    datasetId,
    toPipelineBody(bundle, datasource.id, plan.datastructureRefs[0]),
  );
  steps.push(step("pipeline", "POST", `/datasets/${datasetId}/pipelines`, pipeline.status));

  const datasink = await d.client.createDatasink(datasetId, plan.datasink);
  steps.push(step("datasink", "POST", `/datasets/${datasetId}/datasinks`, datasink.status));

  // 5. Lifecycle: stage validates the pipeline (DRAFT→READY)…
  const stageStatus = await d.client.stageDataset(datasetId);
  steps.push(step("stage (DRAFT→READY)", "POST", `/datasets/${datasetId}/stage`, stageStatus));

  // …then release triggers the async provisioning saga (READY→AVAILABLE).
  const release = await d.client.releaseDataset(datasetId);
  steps.push(
    step(
      release.kind === "in-flight" ? "release (409 saga already in flight)" : "release (READY→AVAILABLE)",
      "POST",
      `/datasets/${datasetId}/release`,
      release.status,
    ),
  );

  // 6. Release is asynchronous. Read the current state once; while the saga runs
  //    the dataset is not yet AVAILABLE, so we report PROVISIONING and let the
  //    installed view reflect the transition to AVAILABLE later.
  const status = await resolvePostReleaseStatus(d, datasetId);

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
  } satisfies InstalledUseCase);

  await d.store.save(record);
  return { record, created: true };
}

/**
 * Uninstall = tear down the provisioned infrastructure and drop the local record.
 * A released (AVAILABLE / provisioning) dataset is `unrelease`d first — which tears
 * down the FROST/APISIX/NiFi infrastructure and returns it to DRAFT — then deleted.
 * Returns false when nothing is installed for this use case.
 */
export async function uninstallUseCase(useCaseId: string, deps?: InstallDeps): Promise<boolean> {
  const d = deps ?? defaultInstallDeps();

  const record = await d.store.get(useCaseId);
  if (!record) return false;

  const datasetId = record.id;
  const live = await d.client.getDataset(datasetId);
  if (live === null) {
    // Already gone on the backend — just drop the stale local record.
    await d.store.remove(useCaseId);
    return true;
  }

  const status = readLifecycleStatus(live) ?? record.status;
  if (status === "AVAILABLE" || status === "PROVISIONING") {
    // AVAILABLE→DRAFT; this is the teardown of the provisioned infrastructure.
    await d.client.unreleaseDataset(datasetId);
  }

  // A DRAFT dataset can be deleted directly (it is DRAFT again after unrelease).
  await d.client.deleteDataset(datasetId);
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
  const status = readLifecycleStatus(live) ?? record.status;
  return status === record.status ? record : withStatus(record, status);
}

/** Read the dataset state after release; default to PROVISIONING while the saga runs. */
async function resolvePostReleaseStatus(
  deps: InstallDeps,
  datasetId: string,
): Promise<DatasetLifecycleStatus> {
  // The release already succeeded; this status read is best-effort, so a transient
  // read failure resolves to PROVISIONING rather than failing the whole install.
  const live = await deps.client.getDataset(datasetId).catch(() => null);
  return readLifecycleStatus(live) ?? "PROVISIONING";
}

function withStatus(record: InstalledUseCase, status: DatasetLifecycleStatus): InstalledUseCase {
  return {
    ...record,
    status,
    createdDataset: { ...record.createdDataset, status },
  };
}
