import type { UseCaseBundle } from "@/lib/server/bundle";
import { parseUrn } from "@/lib/urn";
import type { DatasetLifecycleStatus, UseCase } from "@/types/use-cases";

/**
 * CORE-IR → portal-backend payload mapper.
 *
 * Every request-body shape below was **verified live against a running
 * CivitasCore v2 portal-backend on 2026-07-14** (see the meta-repo spike doc
 * `2026-07-13-portal-backend-install-spike.md`, "Update (2026-07-14)"), replacing
 * the earlier guesses. Key facts baked in here:
 *
 *  - a DataStructure carries no URN/title fields; the JSON Schema goes on the
 *    *version* as `model` (+ `dataStructureVersionSource: "OWN"`);
 *  - `createdFromDataSource: false` must be sent explicitly — omitting it lets the
 *    DTO's null overwrite the entity default and the insert dies with a DB
 *    NOT_NULL violation (400), although OpenAPI does not mark it required;
 *  - the DataSet does NOT reference datastructures; the graph is wired via
 *    `DataSource.dataStructureVersionId`, `Pipeline.dataSourceIds/dataSinkIds`
 *    and the FROST sink's `configuration.dataStructureVersionId`;
 *  - datasource `configuration` (MQTT) = `urls[]`, `topics[]`, `qos` — strictly
 *    validated only in the backend's OnRelease group;
 *  - a dataset needs a non-blank `description`, or `stage` rejects it.
 *
 * Source of truth = the use case's CORE-IR bundle (`fetchUseCaseBundle`): a dataset
 * manifest plus one JSON Schema per datastructure element. The bundle does not
 * (yet) carry a datasource config or a pipeline flow graph, so those are
 * synthesized as clearly-marked placeholders (`TODO(content)`). Consequence: the
 * release saga's NiFi step rejects the empty pipeline `model` ("pipeline graph has
 * no datasource node") and compensates — the install lands on READY, not
 * AVAILABLE, until real content arrives in the bundle.
 */

/** Connector types the portal-backend's datasource endpoint accepts. */
export type DatasourceConnectorType = "MQTT" | "SQL";

export interface DatastructurePlanItem {
  /** CORE URN of the element (from the bundle). */
  ref: string;
  name: string;
  version: string;
  /** Body for `POST /datastructures`. */
  createBody: Record<string, unknown>;
  /** Body for `POST /datastructures/{id}/versions`. */
  versionBody: Record<string, unknown>;
}

/**
 * The static part of the install plan. Only the datastructure bodies can be built
 * up front: datasource, datasink and pipeline all reference **server-assigned ids**
 * (the released version id, the datasource/datasink ids), so the orchestrator
 * builds those bodies mid-sequence with the ids it has just received.
 */
export interface PortalBackendInstallPlan {
  datastructures: DatastructurePlanItem[];
  /** Non-wire summary reused by the install store / UI. */
  summary: {
    datasetTitle: string;
    datasetDescription: string;
    dataStructures: { name: string; version: string }[];
  };
}

/** `POST /datastructures` body for one CORE-IR element. [verified 2026-07-14] */
export function toDatastructureCreateBody(
  element: UseCaseBundle["elements"][number],
): Record<string, unknown> {
  const { name } = parseUrn(element.ref);
  return {
    name,
    description: `Installed by the marketplace from ${element.ref}`,
    // Explicit — omitting it triggers a DB NOT_NULL violation (see module docs).
    createdFromDataSource: false,
  };
}

/**
 * `POST /datastructures/{id}/versions` body carrying the JSON Schema.
 * [verified 2026-07-14]
 *
 * The bundle's `$id` (its CORE URN) is STRIPPED from the model: on version
 * release the backend validates that a present `$id` derives from the
 * server-assigned DataStructure UUID (`DataStructureVersionService.validateModelId`
 * / `CoreUrn.matchesId`) — a bundle URN can never satisfy that, since the UUID
 * only exists after the create. `$id` is optional, so omitting it skips the
 * check; the bundle URN stays recorded on the install (`provisionedResources`
 * name/version + the catalog ref).
 */
export function toDatastructureVersionBody(
  element: UseCaseBundle["elements"][number],
): Record<string, unknown> {
  const { name, version } = parseUrn(element.ref);
  const { $id: _bundleUrn, ...model } = element.schema;
  return {
    dataStructureVersionSource: "OWN",
    version,
    modelName: name,
    model,
  };
}

/**
 * `POST /datasources` body. Shape verified 2026-07-14; the *values* are a
 * placeholder MQTT connector because the CORE-IR bundle carries no connection
 * details yet. The linked datastructure version must already be AVAILABLE
 * (released), and so must its parent datastructure — the backend rejects the
 * create otherwise.
 */
export function toDatasourceBody(
  useCase: UseCase,
  bundle: UseCaseBundle,
  dataStructureVersionId: string,
): Record<string, unknown> {
  // TODO(content): real connection details (and their secret parameters) must come
  // from an extended CORE-IR bundle — this stand-in points at the local FROST
  // broker so the config passes the backend's OnRelease validation.
  const connectorType: DatasourceConnectorType = "MQTT";
  return {
    name: `${bundle.dataset.title} – Source`,
    description: `Installed by the marketplace for ${useCase.id}`,
    connectorType,
    configuration: {
      urls: ["tcp://civitas-frost:1883"],
      topics: [`civitas/${useCase.id}`],
      qos: 1,
    },
    dataStructureVersionId,
  };
}

/**
 * `POST /datasets` body (creates the DRAFT). [verified 2026-07-14]
 * The dataset does NOT reference datastructures (that was a pre-spike guess); a
 * non-blank description is REQUIRED or `stage` fails later.
 */
export function toDatasetBody(bundle: UseCaseBundle): Record<string, unknown> {
  return {
    name: bundle.dataset.title,
    description: bundle.dataset.description?.trim() || bundle.dataset.title,
    openDataAccess: false,
  };
}

/**
 * `POST /datasets/{id}/datasinks` body. [verified 2026-07-14]
 * A FROST sink's whole configuration is the datastructure *version* it persists.
 */
export function toDatasinkBody(dataStructureVersionId: string): Record<string, unknown> {
  return {
    dataSinkType: "FROST",
    configuration: { dataStructureVersionId },
  };
}

/**
 * `POST /datasets/{id}/pipelines` body. Shape verified 2026-07-14
 * (`dataSourceIds` + `dataSinkIds`, both must reference AVAILABLE resources; the
 * datasink must therefore be created BEFORE the pipeline).
 *
 * `model` is the NiFi flow graph the config-adapter deploys (roles
 * SOURCE/TRANSFORM/SINK, edges, optional cron trigger — see FlowPath.derive).
 * TODO(content): we send an empty graph until the CORE-IR bundle carries a real
 * one, so the release saga's NiFi step fails ("pipeline graph has no datasource
 * node") and compensates — expected until #3/#5 lands. Shortcut for the format:
 * build one pipeline in the portal UI and GET it as a template.
 */
export function toPipelineBody(
  bundle: UseCaseBundle,
  dataSourceId: string,
  dataSinkId: string,
): Record<string, unknown> {
  return {
    name: `${bundle.dataset.title} – Pipeline`,
    description: `Installed by the marketplace`,
    model: {},
    dataSourceIds: [dataSourceId],
    dataSinkIds: [dataSinkId],
  };
}

/** Build the static install plan from a use case's CORE-IR bundle. */
export function buildInstallPlan(bundle: UseCaseBundle): PortalBackendInstallPlan {
  const datastructures: DatastructurePlanItem[] = bundle.elements.map((element) => {
    const { name, version } = parseUrn(element.ref);
    return {
      ref: element.ref,
      name,
      version,
      createBody: toDatastructureCreateBody(element),
      versionBody: toDatastructureVersionBody(element),
    };
  });

  return {
    datastructures,
    summary: {
      datasetTitle: bundle.dataset.title,
      datasetDescription: bundle.dataset.description?.trim() || bundle.dataset.title,
      dataStructures: datastructures.map(({ name, version }) => ({ name, version })),
    },
  };
}

/** What `GET /datasets/{id}` actually tells us about provisioning. */
export interface DatasetState {
  /** The backend's own lifecycle value (`dataSetStatus`): DRAFT | READY | AVAILABLE. */
  backendStatus: "DRAFT" | "READY" | "AVAILABLE" | null;
  /** Non-null while a saga is in flight (CREATE/UPDATE/DELETE) — the 409 guard. */
  pendingSagaType: string | null;
}

/**
 * Read the dataset's provisioning state. [verified 2026-07-14] The status field
 * is `dataSetStatus`; `pendingSagaType` is set while a saga runs and cleared on
 * saga end (success or compensated). The pair is the reliable poll criterion:
 * wait until `pendingSagaType` is null, then `dataSetStatus` is the true outcome
 * (AVAILABLE = provisioned; READY = saga failed and was compensated).
 */
export function readDatasetState(datasetBody: unknown): DatasetState {
  if (!datasetBody || typeof datasetBody !== "object") {
    return { backendStatus: null, pendingSagaType: null };
  }
  const record = datasetBody as Record<string, unknown>;

  const rawStatus = record.dataSetStatus;
  const backendStatus =
    rawStatus === "DRAFT" || rawStatus === "READY" || rawStatus === "AVAILABLE"
      ? rawStatus
      : null;

  const rawSaga = record.pendingSagaType;
  const pendingSagaType = typeof rawSaga === "string" && rawSaga ? rawSaga : null;

  return { backendStatus, pendingSagaType };
}

/**
 * Project the backend state onto the app's lifecycle status. PROVISIONING is an
 * app-level pseudo-state meaning "a saga is still in flight".
 */
export function toLifecycleStatus(state: DatasetState): DatasetLifecycleStatus | null {
  if (state.pendingSagaType !== null) return "PROVISIONING";
  return state.backendStatus;
}
