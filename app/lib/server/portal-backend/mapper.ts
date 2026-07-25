import type { UseCaseBundle } from "@/lib/server/bundle";
import { parseUrn } from "@/lib/urn";
import type { OwnBrokerConfig } from "@/types/install-options";
import type { DatasetLifecycleStatus, UseCase } from "@/types/use-cases";

/**
 * CORE-IR → portal-backend payload mapper.
 *
 * Contract target: the **Model-Forge-integrated portal-backend** (MR !694,
 * `feat/integrate-model-forge`). Every request-body shape below mirrors the
 * branch's executable Bruno contract (`api/portal-backend/bruno-api/
 * dataset-saga-postgis` + `dataset-saga-workflow`, read 2026-07-25); live
 * verification against the branch dev stack is still pending (Phase 0 of the
 * migration plan, meta-repo note `2026-07-25-mr694-code-verification-and-
 * migration-plan.md`). Facts from the 2026-07-14 live spike the branch keeps:
 *
 *  - a DataStructure carries no URN/title fields; the JSON Schema goes on the
 *    *version* as `model` (+ `dataStructureVersionSource: "OWN"`);
 *  - `createdFromDataSource: false` must be sent explicitly — omitting it lets the
 *    DTO's null overwrite the entity default and the insert dies with a DB
 *    NOT_NULL violation (400), although OpenAPI does not mark it required;
 *  - datasource `configuration` (MQTT) = `urls[]`, `topics[]`, `qos`;
 *  - a dataset needs a non-blank `description`, or `stage` rejects it.
 *
 * What changed with !694 (URN-native CORE artifacts):
 *
 *  - create responses return server-minted **CORE URN pins** in the body
 *    (`modelUrn` on a datastructure version, `configurationUrn` on
 *    datasource/datasink). URNs are never hand-constructed (the new grammar has
 *    a server-derived disambiguator segment) — always read back and thread on;
 *  - the pipeline `model` is the CORE `kind` graph (nodes `start`/`source`/
 *    `mapping`/`sink`/`end` referencing resources by `sourceRef`/`sinkRef`/
 *    `mappingRef` URNs); the React-Flow editor state moved to `styles`, which
 *    still carries portal-UUID `entityId`s — Bruno sends both representations;
 *  - a FROST sink's `configuration` is **empty** `{}` (the saga resolves the
 *    schema through the graph); POSTGIS takes `{tableName, element: <modelUrn>}`;
 *  - the dataset declares its serving APIs via `namedApis` (STA for FROST).
 *
 * Source of truth = the use case's CORE-IR bundle (`fetchUseCaseBundle`): a dataset
 * manifest, one JSON Schema per datastructure element, and — optionally — a
 * pipeline flow graph (`core-ir/pipeline.json`, still the React-Flow editor
 * shape; converted to the CORE graph here, kept entityId-rebound as `styles`).
 * When no pipeline is bundled the model is an empty placeholder, so the release
 * saga's NiFi step rejects it and compensates — the install lands on READY, not
 * AVAILABLE, until real content arrives in the bundle. (The FROST Bruno flow
 * proves a mapping-less `source → sink` graph provisions fine, so bundled
 * graphs without mapping nodes stay valid.)
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

/** `POST /datastructures` body for one CORE-IR element. [!694 Bruno: dataset-saga-postgis/2] */
export function toDatastructureCreateBody(
  element: UseCaseBundle["elements"][number],
): Record<string, unknown> {
  const { name } = parseUrn(element.ref);
  return {
    name,
    description: `Installed by the marketplace from ${element.ref}`,
    // Explicit — omitting it triggers a DB NOT_NULL violation (see module docs).
    createdFromDataSource: false,
    // Sent empty exactly like the Bruno contract — versions are attached via the
    // nested endpoint, role assignments are not the marketplace's concern.
    dataStructureVersionIds: [],
    assignments: [],
  };
}

/**
 * `POST /datastructures/{id}/versions` body carrying the JSON Schema.
 * [!694 Bruno: dataset-saga-postgis/2a — response returns the minted `modelUrn` pin]
 *
 * The bundle's `$id` (its CORE URN) is STRIPPED from the model: Model Forge is
 * the URN authority and mints the canonical `$id`/URN on write (the new grammar
 * carries a server-derived disambiguator a bundle URN can never guess). The
 * Bruno contract likewise submits models without `$id`. The bundle URN stays
 * recorded on the install (`provisionedResources` name/version + the catalog
 * ref); the minted URN comes back as the response's `modelUrn`.
 */
export function toDatastructureVersionBody(
  element: UseCaseBundle["elements"][number],
): Record<string, unknown> {
  const { name, version } = parseUrn(element.ref);
  const { $id: _bundleUrn, ...model } = element.schema;
  return {
    dataStructureVersionSource: "OWN",
    version,
    description: `Installed by the marketplace from ${element.ref}`,
    modelName: name,
    model,
    // The structure editor's canvas state — none exists for an imported schema.
    styles: {},
  };
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
        qos: 1,
        ...(ownBroker.username ? { user: ownBroker.username } : {}),
        ...(ownBroker.password ? { password: ownBroker.password } : {}),
      }
    : {
        // Demo preset: the marketplace's own mosquitto (demo-broker/
        // docker-compose.yml), joined to the platform stack's civitas-network.
        // [live 2026-07-25] The dev stack has NO in-cluster MQTT broker
        // (civitas-frost runs an HTTP-only FROST image — nothing on :1883), and
        // the public broker.hivemq.com drops connections (EOF/32109) — both made
        // NiFi's ConsumeMQTT show a red runtime error on the portal dataset
        // page. The demo simulator publishes via host port 1884; the topic is
        // silent (but healthily connected) until it does.
        urls: ["tcp://civitas-mosquitto:1883"],
        topics: [`civitas/${useCase.id}`],
        qos: 1,
      };
  return {
    name: `${bundle.dataset.title} – Source`,
    description: `Installed by the marketplace for ${useCase.id}`,
    connectorType,
    configuration,
    // MUST be null at create [live 2026-07-25]: the create-time version lookup
    // cannot authorize the link yet and 404s ("DataSource with id '<versionId>'
    // not found" — DataSourceService makes missing and unauthorized look alike).
    // The link happens right after via PATCH ({@link toDatasourcePatchBody}),
    // exactly like the Bruno flow (create → patch → release).
    dataStructureVersionId: null,
    assignments: [],
  };
}

/**
 * `PATCH /datasources/{id}` body linking the released datastructure version.
 * [!694 Bruno: dataset-saga-postgis/4 — the only field the patch carries]
 */
export function toDatasourcePatchBody(dataStructureVersionId: string): Record<string, unknown> {
  return { dataStructureVersionId };
}

/**
 * `POST /datasets` body (creates the DRAFT). [!694 Bruno: saga step "create dataset", both variants]
 * The dataset does NOT reference datastructures; a non-blank description is
 * REQUIRED or `stage` fails later. `namedApis` declares how the provisioned data
 * is served through the gateway — the SensorThings API, matching the FROST sink
 * that is the marketplace's (only) supported storage today.
 */
export function toDatasetBody(bundle: UseCaseBundle): Record<string, unknown> {
  return {
    name: bundle.dataset.title,
    description: bundle.dataset.description?.trim() || bundle.dataset.title,
    openDataAccess: false,
    namedApis: [{ name: "Things", slug: "things", standard: "STA", version: "1.1" }],
  };
}

/** Sink kinds the portal-backend's datasink endpoint accepts. */
export type DatasinkType = "FROST" | "POSTGIS";

/**
 * `POST /datasets/{id}/datasinks` body.
 * [!694 Bruno: dataset-saga-workflow/4c (FROST) + dataset-saga-postgis/6 (POSTGIS)]
 *
 * A FROST sink's configuration is now EMPTY — the saga resolves the persisted
 * schema through the pipeline graph's refs (pre-!694 it carried
 * `dataStructureVersionId`). A POSTGIS sink takes `{tableName, element}` where
 * `element` is a datastructure version's minted `modelUrn`; the bundle carries
 * no `tableName` yet, so the orchestrator still rejects POSTGIS upfront (see
 * install.ts). The type comes from the bundle's pipeline sink node (via
 * {@link readSinkType}); FROST is the default when no pipeline is bundled.
 * The response returns the sink's minted `configurationUrn` pin — the pipeline
 * graph's `sinkRef`.
 */
export function toDatasinkBody(sinkType: DatasinkType = "FROST"): Record<string, unknown> {
  return {
    dataSinkType: sinkType,
    configuration: {},
  };
}

// A pipeline model node whose type identifies the single source / single sink.
// NODE types (React-Flow graph) are NOT the DataSink RESOURCE type: the source node
// is `dataSource`; the sink node is `frost` (→ FROST resource) or `geoPersistence`
// (→ POSTGIS resource). Confirmed in config-adapter `NodeKind` (the only Role.SINK
// kinds are `frost`/`geoPersistence`) and the portal pipeline-editor node vocabulary.
const SOURCE_NODE_TYPES = new Set(["dataSource"]);
const SINK_NODE_TYPES = new Set(["frost", "geoPersistence"]);

/**
 * Re-bind a bundled pipeline model to this instance. The React-Flow model the
 * portal editor produces embeds the *authoring instance's* datasource/datasink
 * UUIDs on each node's `data.entityId`; on install those resources get fresh
 * server-assigned ids, so we rewrite the source node's `entityId` to the created
 * datasource id and the sink node's to the created datasink id. Matching is by node
 * `type` — FlowPath guarantees exactly one source and one sink. Everything else
 * (edges keyed by node `id`, layout) is copied through untouched. Pure: the input
 * model is deep-cloned, never mutated.
 */
export function bindPipelineModel(
  model: Record<string, unknown>,
  dataSourceId: string,
  dataSinkId: string,
): Record<string, unknown> {
  const clone = structuredClone(model);
  const nodes = clone.nodes;
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as { type?: unknown; data?: Record<string, unknown> };
      if (typeof n.type !== "string" || !n.data || typeof n.data !== "object") continue;
      if (SOURCE_NODE_TYPES.has(n.type)) n.data.entityId = dataSourceId;
      else if (SINK_NODE_TYPES.has(n.type)) n.data.entityId = dataSinkId;
    }
  }
  return clone;
}

/**
 * The sink type (`FROST`/`POSTGIS`) declared by the bundle's pipeline sink node, so
 * the created DataSink matches the flow graph. Defaults to `FROST` when no pipeline
 * is bundled or no sink node is found.
 */
export function readSinkType(pipeline: Record<string, unknown> | undefined): DatasinkType {
  const nodes = pipeline?.nodes;
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      const t = (node as { type?: unknown })?.type;
      if (t === "geoPersistence") return "POSTGIS";
      if (t === "frost") return "FROST";
    }
  }
  return "FROST";
}

/**
 * Everything the pipeline body needs to wire the graph to THIS instance's
 * freshly created resources: the portal UUIDs (for `dataSourceIds`/`dataSinkIds`
 * and the `styles` entityIds) and the minted CORE URN pins (for the model's
 * `sourceRef`/`sinkRef`).
 */
export interface PipelineWiring {
  dataSourceId: string;
  dataSinkId: string;
  /** The datasource's minted `configurationUrn` (create-response pin). */
  dataSourceConfigUrn: string;
  /** The datasink's minted `configurationUrn` (create-response pin). */
  dataSinkConfigUrn: string;
}

// React-Flow editor node `type` → CORE graph node `kind`. The editor vocabulary
// is what bundles carry (`core-ir/pipeline.json`); the CORE vocabulary is what
// the config-adapter deploys (NodeKind: start/end/cron/source/mapping/sink).
const RF_TYPE_TO_CORE_KIND: Record<string, string> = {
  start: "start",
  end: "end",
  cron: "cron",
  dataSource: "source",
  frost: "sink",
  geoPersistence: "sink",
};

/**
 * Convert a bundled React-Flow pipeline graph to the CORE `kind` graph the
 * !694 backend stores and the config-adapter provisions from
 * [Bruno: saga step "create pipeline", both variants]:
 *
 *   - node `type` maps to `kind` ({@link RF_TYPE_TO_CORE_KIND}); `source` nodes
 *     get `sourceRef` = the datasource's `configurationUrn`, `sink` nodes get
 *     `sinkRef` = the datasink's `configurationUrn` (URN refs replace the old
 *     `data.entityId` UUID rebinding);
 *   - labels and positions carry over (`label`, `x-ui-position`);
 *   - edges reduce to `{id, source, target}` — the editor's `type: "smoothstep"`
 *     etc. is presentation, which lives in `styles`.
 *
 * A bundled `mapping` node would need a first-class Mapping artifact created via
 * `POST /mappings` for its `mappingRef` — no bundle carries one yet (the format
 * gains mapping documents in Phase 2 of the migration plan), so it throws
 * loudly instead of posting a graph the saga cannot resolve. Unknown node types
 * throw for the same reason.
 */
export function toCorePipelineModel(
  model: Record<string, unknown>,
  wiring: PipelineWiring,
): Record<string, unknown> {
  const rfNodes = Array.isArray(model.nodes) ? model.nodes : [];
  const rfEdges = Array.isArray(model.edges) ? model.edges : [];

  const nodes = rfNodes.map((rfNode) => {
    const rf = rfNode as {
      id?: unknown;
      type?: unknown;
      position?: { x?: unknown; y?: unknown };
      data?: { label?: unknown };
    };
    const id = typeof rf.id === "string" ? rf.id : "";
    const type = typeof rf.type === "string" ? rf.type : "";
    if (type === "mapping") {
      throw new Error(
        "The bundled pipeline contains a mapping node, which the marketplace cannot install yet (it requires creating a first-class Mapping artifact for its mappingRef). Remove the mapping node or wait for mapping-document bundle support.",
      );
    }
    const kind = RF_TYPE_TO_CORE_KIND[type];
    if (!id || !kind) {
      throw new Error(
        `The bundled pipeline contains a node the marketplace cannot convert to the CORE graph (id: ${id || "?"}, type: ${type || "?"}).`,
      );
    }

    const node: Record<string, unknown> = { id, kind };
    const label = rf.data?.label;
    if (typeof label === "string" && label) node.label = label;
    if (typeof rf.position?.x === "number" && typeof rf.position?.y === "number") {
      node["x-ui-position"] = { x: rf.position.x, y: rf.position.y };
    }
    if (kind === "source") node.sourceRef = wiring.dataSourceConfigUrn;
    if (kind === "sink") node.sinkRef = wiring.dataSinkConfigUrn;
    return node;
  });

  const edges = rfEdges.map((rfEdge) => {
    const rf = rfEdge as { id?: unknown; source?: unknown; target?: unknown };
    if (
      typeof rf.id !== "string" ||
      typeof rf.source !== "string" ||
      typeof rf.target !== "string"
    ) {
      throw new Error("The bundled pipeline contains an edge without id/source/target.");
    }
    return { id: rf.id, source: rf.source, target: rf.target };
  });

  return { nodes, edges };
}

/**
 * `POST /datasets/{id}/pipelines` body. [!694 Bruno: saga step "create pipeline", both variants]
 * `dataSourceIds` must reference AVAILABLE (released) datasources; datasinks have
 * NO release lifecycle — the sink merely has to be created before the pipeline so
 * its id exists for `dataSinkIds`.
 *
 * The flow graph is stored in **two** representations, and Bruno sends both:
 * `model` is the CORE `kind` graph the config-adapter (NiFi) provisions from —
 * resources referenced by URN ({@link toCorePipelineModel}); `styles` is the
 * React-Flow editor state the portal pipeline editor renders — still keyed by
 * portal UUIDs, so the bundle graph goes in entityId-rebound
 * ({@link bindPipelineModel}), exactly like the old dual-field contract. When no
 * pipeline is bundled an empty graph is sent, which the NiFi step rejects → the
 * saga compensates to READY (unchanged semantics).
 */
export function toPipelineBody(
  bundle: UseCaseBundle,
  wiring: PipelineWiring,
): Record<string, unknown> {
  return {
    name: `${bundle.dataset.title} – Pipeline`,
    description: `Installed by the marketplace`,
    model: bundle.pipeline ? toCorePipelineModel(bundle.pipeline, wiring) : {},
    styles: bundle.pipeline
      ? bindPipelineModel(bundle.pipeline, wiring.dataSourceId, wiring.dataSinkId)
      : {},
    dataSourceIds: [wiring.dataSourceId],
    dataSinkIds: [wiring.dataSinkId],
  };
}

/**
 * Read a server-minted CORE URN pin (`modelUrn`, `configurationUrn`, …) off a
 * create-response body. Returns undefined when absent — which, for fields the
 * !694 contract guarantees, means the backend on the other side is pre-!694
 * (the caller decides whether that is fatal).
 */
export function readUrnPin(body: unknown, field: string): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value.startsWith("urn:") ? value : undefined;
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
