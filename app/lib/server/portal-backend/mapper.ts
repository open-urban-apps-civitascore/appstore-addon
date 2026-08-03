import { PortalBackendError } from "@/lib/server/portal-backend/errors";
import type { UseCaseBundle } from "@/lib/server/bundle";
import { parseUrn } from "@/lib/urn";
import type { OwnBrokerConfig } from "@/types/install-options";
import type { DatasetLifecycleStatus, UseCase } from "@/types/use-cases";

/**
 * CORE-IR → portal-backend payload mapper.
 *
 * Every request body below was **verified live on 2026-08-03** by running the whole
 * sequence against the branch stack by hand (meta-repo
 * `docs/tasks/2026-08-03-install-starts-demo-data.md`, "Phase 0 — Result"). It
 * targets the Model-Forge-integrated backend, which changed most of the payloads:
 *
 *  - a DataStructure carries no URN/title fields; the JSON Schema goes on the
 *    *version* as `model` (+ `dataStructureVersionSource: "OWN"`), and the version
 *    create answers with the **minted `modelUrn`** — the handle everything
 *    downstream references;
 *  - `createdFromDataSource: false` must be sent explicitly — omitting it lets the
 *    DTO's null overwrite the entity default and the insert dies with a DB
 *    NOT_NULL violation (400), although OpenAPI does not mark it required;
 *  - a datasource is created with `dataStructureVersionId: null` and PATCHed
 *    afterwards; a create-time link is rejected;
 *  - datasource `configuration` (MQTT) = `urls[]`, `topics[]`, `client_id`, `qos`;
 *  - a sink references its row schema by **URN** (`configuration.element`), not by
 *    version id; POSTGIS additionally needs a non-blank `tableName`;
 *  - a mapping is a first-class artifact created before the pipeline, which then
 *    references it by `mappingRef`;
 *  - the pipeline `model` is a CORE graph (nodes keyed by `kind`, refs by URN);
 *    `styles` still carries the React-Flow graph the portal editor renders from;
 *  - a dataset needs a non-blank `description`, or `stage` rejects it.
 *
 * Source of truth = the use case's CORE-IR bundle (`fetchUseCaseBundle`): a dataset
 * manifest and one JSON Schema per datastructure element. The bundle's
 * `core-ir/pipeline.json` is deliberately **not** read: it is a React-Flow drawing
 * in the pre-Model-Forge format, and for a single-source/single-sink use case the
 * graph is fully determined anyway, so it is synthesized here (see
 * {@link buildCorePipelineModel}). TODO(content): once bundles ship CORE artifact
 * documents, install the graph they declare instead.
 */

/** Connector types the portal-backend's datasource endpoint accepts. */
export type DatasourceConnectorType = "MQTT" | "SQL";

/**
 * A CORE URN's `name` segment accepts letters and digits ONLY (`CoreUrn.NAME` in
 * the config-adapter). Model Forge's own minter is more permissive — its
 * `UrnParser.sanitize` keeps `_`, `.` and `-` — so a name like `traffic_counter`
 * mints a URN that Model Forge stores happily and the NiFi mapping compiler then
 * rejects at deploy time ("source is not a valid CORE URN"), after the sink table
 * has already been created. The saga compensates and the install lands on READY
 * with nothing pointing at the cause.
 *
 * So every name we hand the backend is stripped here. [verified live 2026-08-03 —
 * this cost one full saga run]
 */
export function toUrnSafeName(name: string): string {
  const stripped = name.replace(/[^A-Za-z0-9]/g, "");
  return stripped || "Element";
}

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
    name: toUrnSafeName(name),
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
    // The minted URN's name segment comes from here — it must be URN-safe.
    modelName: toUrnSafeName(name),
    model,
  };
}

/** The minted `modelUrn` a version-create answered with — every later payload's handle. */
export function readModelUrn(versionBody: unknown): string | null {
  if (!versionBody || typeof versionBody !== "object") return null;
  const urn = (versionBody as { modelUrn?: unknown }).modelUrn;
  return typeof urn === "string" && urn ? urn : null;
}

/** The minted `configurationUrn` a datasource/datasink create answered with. */
export function readConfigurationUrn(createdBody: unknown): string | null {
  if (!createdBody || typeof createdBody !== "object") return null;
  const urn = (createdBody as { configurationUrn?: unknown }).configurationUrn;
  return typeof urn === "string" && urn ? urn : null;
}

/**
 * `POST /datasources` body. Shape verified 2026-07-14. Without an override the
 * *values* are the demo/preset MQTT connector (the in-cluster FROST broker) —
 * the "demo source" of the D10 install fork. With an {@link OwnBrokerConfig}
 * override (the "own broker" fork branch) the user's connection details are
 * used instead; credentials go ONLY into this backend payload, never into the
 * install record, the trace, or logs (D3). The linked datastructure version
 * must already be AVAILABLE (released), and so must its parent datastructure —
 * the backend rejects the create otherwise.
 */
export function toDatasourceBody(
  useCase: UseCase,
  bundle: UseCaseBundle,
  ownBroker?: OwnBrokerConfig,
): Record<string, unknown> {
  const connectorType: DatasourceConnectorType = "MQTT";
  const configuration: Record<string, unknown> = ownBroker
    ? {
        urls: [ownBroker.url],
        topics: [ownBroker.topic],
        client_id: demoClientId(useCase.id),
        qos: 1,
        ...(ownBroker.username ? { user: ownBroker.username } : {}),
        ...(ownBroker.password ? { password: ownBroker.password } : {}),
      }
    : {
        // The bundled simulation broker. This used to read `tcp://civitas-frost:1883`
        // — a port Docker publishes because the FROST image declares it, with nothing
        // listening behind it. A demo install subscribed to nothing, forever, and
        // reported no error anywhere. [fixed 2026-08-03]
        urls: [demoBrokerUrl()],
        topics: [demoTopic(useCase.id)],
        client_id: demoClientId(useCase.id),
        qos: 1,
      };
  return {
    name: `${bundle.dataset.title} – Source`,
    description: `Installed by the marketplace for ${useCase.id}`,
    connectorType,
    configuration,
    // Never at create time — the backend rejects the link here. The released
    // version is attached afterwards with PATCH /datasources/{id}.
    dataStructureVersionId: null,
  };
}

// ── Demo transport: one derivation, two consumers ────────────────────────────
// The topic the datasource subscribes to and the topic the generator publishes on
// MUST be the same string. Deriving both from these helpers is what makes drift
// impossible — and a drift here is invisible: the pipeline provisions, the
// generator reports success, and nothing ever arrives.

/** In-cluster address of the bundled simulation broker (NiFi is the consumer). */
export function demoBrokerUrl(): string {
  return process.env.MARKETPLACE_DEMO_BROKER_URL?.trim() || "tcp://civitas-mosquitto:1883";
}

/** The topic a use case's demo data flows on. */
export function demoTopic(useCaseId: string): string {
  return `civitas/${useCaseId}`;
}

/**
 * MQTT client id for this use case's NiFi consumer.
 *
 * Not cosmetic: left unset, every deployed `ConsumeMQTT` connects as
 * `civitas-nifi-consumer`, and flows sharing an id kick each other off the broker
 * — 1881 of 1886 connections on the dev machine ended "session taken over". The
 * symptom is messages silently stopping, which is miserable to debug.
 */
export function demoClientId(useCaseId: string): string {
  return `nifi-${useCaseId}`;
}

/**
 * The PostGIS table a use case's rows land in. Derived, not authored: it only has
 * to be a stable, valid Postgres identifier, and one per use case. Underscores are
 * fine here — unlike in a URN name segment ({@link toUrnSafeName}), nothing
 * validates this against the CORE grammar.
 *
 * TODO(content): let the bundle name its own table.
 */
export function demoTableName(useCaseId: string): string {
  const slug = useCaseId.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return `uc_${slug || "usecase"}`;
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

/** Sink kinds the portal-backend's datasink endpoint accepts. */
export type DatasinkType = "FROST" | "POSTGIS";

/**
 * `POST /datasets/{id}/datasinks` body. [verified 2026-08-03]
 *
 * A sink names its row schema by **versioned CORE URN** (`configuration.element`,
 * a Model-Forge soft reference), not by version id — that is what the deploy engine
 * resolves the table's columns from. POSTGIS additionally needs a non-blank
 * `tableName` (backend `PostgisConfiguration`, enforced by the NiFi
 * `PostgisSinkStage`).
 *
 * The response carries the minted `configurationUrn`, which the pipeline's sink
 * node references as `sinkRef`.
 */
export function toDatasinkBody(
  elementUrn: string,
  sinkType: DatasinkType,
  tableName?: string,
): Record<string, unknown> {
  return {
    dataSinkType: sinkType,
    configuration:
      sinkType === "POSTGIS" ? { tableName, element: elementUrn } : { element: elementUrn },
  };
}

/**
 * `POST /mappings` body — an **identity** mapping: every field copied to itself,
 * source structure and target structure the same one.
 *
 * Nothing here needs translating: the message the sensor publishes and the row the
 * table stores have the same fields. The mapping exists because the pipeline
 * refuses a storage sink whose `element` is empty, and `element` is only ever
 * filled from a mapping's target. So this is a translation that translates nothing,
 * present to answer a question the editor asks in an awkward place. (Upstream
 * candidate: a passthrough sink could answer it from its own selected structure —
 * see the 07-28 exploration note, finding F1.)
 *
 * Reusing one structure for both ends is explicitly allowed and deploys —
 * [verified live 2026-08-03].
 *
 * @throws PortalBackendError when the element is not flat. A nested property means
 * a geometry column and a cross-structure `$ref`, neither of which this install
 * path handles yet; failing here beats a saga that compensates ten minutes later
 * with the table already created and dropped.
 */
export function toMappingBody(
  elementUrn: string,
  schema: Record<string, unknown>,
  title: string,
): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  const names = Object.keys(properties);
  if (names.length === 0) {
    throw new PortalBackendError(
      `The use case's data structure declares no properties, so no mapping can be built.`,
      422,
    );
  }

  const SCALARS = new Set(["string", "number", "integer", "boolean"]);
  const nested = names.filter((name) => {
    const property = properties[name] as { type?: unknown; $ref?: unknown } | null;
    if (!property || typeof property !== "object") return true;
    if (typeof property.$ref === "string") return true;
    return typeof property.type !== "string" || !SCALARS.has(property.type);
  });
  if (nested.length > 0) {
    throw new PortalBackendError(
      `The marketplace can only install use cases whose data structure is flat; ` +
        `${nested.join(", ")} ${nested.length === 1 ? "is" : "are"} nested or a reference. ` +
        `Geometry and referenced structures are not supported yet.`,
      501,
    );
  }

  return {
    source: elementUrn,
    target: elementUrn,
    title,
    fields: Object.fromEntries(names.map((name) => [`$.${name}`, `$.${name}`])),
  };
}

/**
 * The URNs and ids the pipeline graph is built from — every one of them minted by
 * the backend during the install, none of them knowable in advance.
 */
export interface PipelineRefs {
  /** `configurationUrn` of the created datasource. */
  sourceRef: string;
  /** `versionedUrn` of the created mapping. */
  mappingRef: string;
  /** `configurationUrn` of the created datasink. */
  sinkRef: string;
  /** Portal ids, for `dataSourceIds`/`dataSinkIds` and the editor's node data. */
  dataSourceId: string;
  dataSinkId: string;
  /** Sink node kind — decides the React-Flow node type in `styles`. */
  sinkType: DatasinkType;
  /** POSTGIS only: shown on the storage node in the editor. */
  tableName?: string;
}

// Node ids must be UUIDs. Fixed constants are fine: exactly one pipeline exists per
// installed dataset, so they never collide with each other.
const NODE_START = "5a1e0000-0000-4000-8000-000000000001";
const NODE_SOURCE = "5a1e0000-0000-4000-8000-000000000002";
const NODE_MAPPING = "5a1e0000-0000-4000-8000-000000000003";
const NODE_SINK = "5a1e0000-0000-4000-8000-000000000004";
const NODE_END = "5a1e0000-0000-4000-8000-000000000005";

const POSITIONS: Record<string, { x: number; y: number }> = {
  [NODE_START]: { x: 360, y: -40 },
  [NODE_SOURCE]: { x: 140, y: 100 },
  [NODE_MAPPING]: { x: 320, y: 100 },
  [NODE_SINK]: { x: 520, y: 100 },
  [NODE_END]: { x: 740, y: 80 },
};

const EDGES: { id: string; source: string; target: string }[] = [
  { id: "5a1e0000-0000-4000-8000-0000000000e1", source: NODE_START, target: NODE_SOURCE },
  { id: "5a1e0000-0000-4000-8000-0000000000e2", source: NODE_SOURCE, target: NODE_MAPPING },
  { id: "5a1e0000-0000-4000-8000-0000000000e3", source: NODE_MAPPING, target: NODE_SINK },
  { id: "5a1e0000-0000-4000-8000-0000000000e4", source: NODE_SINK, target: NODE_END },
];

/**
 * The CORE Pipeline document the config-adapter provisions from: nodes keyed by
 * `kind`, wired to their artifacts by URN. [verified 2026-08-03]
 *
 * Synthesized rather than installed from the bundle. For one source and one sink
 * the chain is fully determined — `start → source → mapping → sink → end` — so
 * there is nothing to read; and what the bundle carries is a React-Flow drawing in
 * a format this backend no longer consumes. See the module docs.
 */
export function buildCorePipelineModel(refs: PipelineRefs): Record<string, unknown> {
  return {
    nodes: [
      { id: NODE_START, kind: "start", label: "Start", "x-ui-position": POSITIONS[NODE_START] },
      {
        id: NODE_SOURCE,
        kind: "source",
        label: "MQTT Source",
        sourceRef: refs.sourceRef,
        "x-ui-position": POSITIONS[NODE_SOURCE],
      },
      {
        id: NODE_MAPPING,
        kind: "mapping",
        label: "Mapping",
        mappingRef: refs.mappingRef,
        "x-ui-position": POSITIONS[NODE_MAPPING],
      },
      {
        id: NODE_SINK,
        kind: "sink",
        label: refs.sinkType === "POSTGIS" ? "Geospatial Data Storage" : "SensorThings",
        sinkRef: refs.sinkRef,
        "x-ui-position": POSITIONS[NODE_SINK],
      },
      { id: NODE_END, kind: "end", label: "End", "x-ui-position": POSITIONS[NODE_END] },
    ],
    edges: EDGES,
  };
}

/**
 * The React-Flow graph the portal's pipeline EDITOR renders from. It ignores
 * `model` entirely (`createSessionFromBackendDTO` reads `dto.styles`), so sending
 * only the CORE document provisions a working pipeline that opens as an empty
 * canvas — which reads as a broken install to anyone who looks.
 */
export function buildPipelineStyles(
  refs: PipelineRefs,
  mappingConfig: Record<string, unknown>,
  structure: { id: string; versionId: string; name: string },
): Record<string, unknown> {
  const sinkNodeType = refs.sinkType === "POSTGIS" ? "geoPersistence" : "frost";
  return {
    viewport: { x: 0, y: 0, zoom: 1 },
    nodePositions: POSITIONS,
    nodes: [
      {
        id: NODE_START,
        type: "start",
        position: POSITIONS[NODE_START],
        data: { nodeType: "start", label: "Start", configured: true },
      },
      {
        id: NODE_SOURCE,
        type: "dataSource",
        position: POSITIONS[NODE_SOURCE],
        data: {
          label: "MQTT Source",
          configured: true,
          entityType: "datasource",
          entityId: refs.dataSourceId,
          configurationUrn: refs.sourceRef,
          entityMetadata: { connector: "MQTT" },
        },
      },
      {
        id: NODE_MAPPING,
        type: "mapping",
        position: POSITIONS[NODE_MAPPING],
        data: {
          label: "Mapping",
          configured: true,
          mappingRef: refs.mappingRef,
          mappingLogicalUrn: refs.mappingRef,
          mappingConfig,
          sourceDatastructureId: structure.id,
          sourceVersionId: structure.versionId,
          sourceName: structure.name,
          targetDatastructureId: structure.id,
          targetVersionId: structure.versionId,
          targetName: structure.name,
        },
      },
      {
        id: NODE_SINK,
        type: sinkNodeType,
        position: POSITIONS[NODE_SINK],
        data: {
          label: refs.sinkType === "POSTGIS" ? "Geospatial Data Storage" : "SensorThings",
          configured: true,
          entityType: refs.sinkType === "POSTGIS" ? "persistence" : "sink",
          entityId: refs.dataSinkId,
          configurationUrn: refs.sinkRef,
          ...(refs.tableName ? { tableName: refs.tableName } : {}),
          dataStructureVersionId: `${structure.id}/${structure.versionId}`,
          dataStructureName: structure.name,
        },
      },
      {
        id: NODE_END,
        type: "end",
        position: POSITIONS[NODE_END],
        data: { nodeType: "end", label: "End", configured: true },
      },
    ],
    edges: EDGES.map((edge) => ({ ...edge, type: "smoothstep", data: { label: "" } })),
  };
}

/**
 * `POST /datasets/{id}/pipelines` body. [verified 2026-08-03]
 * `dataSourceIds` must reference AVAILABLE (released) datasources; datasinks have
 * NO release lifecycle — the sink merely has to be created before the pipeline so
 * its id exists for `dataSinkIds`.
 */
export function toPipelineBody(
  bundle: UseCaseBundle,
  refs: PipelineRefs,
  mappingConfig: Record<string, unknown>,
  structure: { id: string; versionId: string; name: string },
): Record<string, unknown> {
  return {
    name: `${bundle.dataset.title} – Pipeline`,
    description: `Installed by the marketplace`,
    model: buildCorePipelineModel(refs), // provisioned by the config-adapter (NiFi)
    styles: buildPipelineStyles(refs, mappingConfig, structure), // rendered by the editor
    dataSourceIds: [refs.dataSourceId],
    dataSinkIds: [refs.dataSinkId],
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
