import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { UseCaseBundle } from "@/lib/server/bundle";
import {
  bindPipelineModel,
  buildInstallPlan,
  readDatasetState,
  readSinkType,
  toDatasetBody,
  toDatasinkBody,
  toDatasourceBody,
  toDatastructureCreateBody,
  toDatastructureVersionBody,
  toLifecycleStatus,
  toPipelineBody,
} from "@/lib/server/portal-backend/mapper";
import type { UseCase } from "@/types/use-cases";

const DS_REF = "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.2.0";

const USE_CASE = { id: "baumkataster-starter" } as UseCase;

const BUNDLE: UseCaseBundle = {
  dataset: {
    id: "urn:core:platform:civitas:dataset:common:Baumkataster:1.0.0",
    title: "Baumkataster Starter",
    description: "Demo dataset.",
    version: "1.0.0",
    dataStructureRefs: [DS_REF],
  },
  elements: [{ ref: DS_REF, schema: { $id: DS_REF, title: "TreeRecord", type: "object" } }],
  source: { repoUrl: "https://gitlab.com/example/baumkataster", gitIdentifier: "v1.0.0" },
};

// Shapes below were verified against a live portal-backend on 2026-07-14.
describe("mapper — verified portal-backend payload shapes", () => {
  test("datastructure create body: name + explicit createdFromDataSource, no urn/title", () => {
    const body = toDatastructureCreateBody(BUNDLE.elements[0]);
    assert.equal(body.name, "TreeRecord");
    // Omitting this triggers a DB NOT_NULL violation on the backend.
    assert.equal(body.createdFromDataSource, false);
    assert.ok(!("urn" in body), "no urn field — the backend has none");
    assert.ok(!("title" in body), "no title field — the backend has none");
  });

  test("version body: source OWN, version from URN, schema under `model`", () => {
    const body = toDatastructureVersionBody(BUNDLE.elements[0]);
    assert.equal(body.dataStructureVersionSource, "OWN");
    assert.equal(body.version, "1.2.0");
    assert.equal(body.modelName, "TreeRecord");
    const { $id: _bundleUrn, ...schemaWithoutId } = BUNDLE.elements[0].schema;
    assert.deepEqual(body.model, schemaWithoutId);
    assert.ok(!("schema" in body), "the JSON schema field is `model`, not `schema`");
  });

  test("strips the bundle $id from the model — release validates $id against the server UUID", () => {
    const body = toDatastructureVersionBody(BUNDLE.elements[0]) as Record<string, any>;
    assert.ok(!("$id" in body.model), "a bundle URN $id would be rejected on version release");
    assert.equal(body.model.title, "TreeRecord", "the rest of the schema is untouched");
  });

  test("datasource body: `configuration` (urls/topics/qos) + dataStructureVersionId", () => {
    const body = toDatasourceBody(USE_CASE, BUNDLE, "v-123") as Record<string, any>;
    assert.equal(body.connectorType, "MQTT");
    assert.equal(body.dataStructureVersionId, "v-123");
    assert.ok(Array.isArray(body.configuration.urls) && body.configuration.urls.length > 0);
    assert.ok(Array.isArray(body.configuration.topics) && body.configuration.topics.length > 0);
    assert.equal(typeof body.configuration.qos, "number");
    assert.ok(!("config" in body), "the field is `configuration`, not `config`");
  });

  test("dataset body: no datastructure refs, non-blank description (stage requires it)", () => {
    const body = toDatasetBody(BUNDLE);
    assert.equal(body.name, "Baumkataster Starter");
    assert.equal(body.description, "Demo dataset.");
    assert.equal(body.openDataAccess, false);
    assert.ok(!("datastructureRefs" in body), "the dataset does not reference datastructures");
    assert.ok(!("version" in body), "the dataset input carries no version");

    const noDescription = toDatasetBody({
      ...BUNDLE,
      dataset: { ...BUNDLE.dataset, description: "  " },
    });
    assert.equal(noDescription.description, "Baumkataster Starter", "falls back to the title");
  });

  test("datasink body: dataSinkType FROST + configuration.dataStructureVersionId", () => {
    const body = toDatasinkBody("v-123") as Record<string, any>;
    assert.equal(body.dataSinkType, "FROST");
    assert.deepEqual(body.configuration, { dataStructureVersionId: "v-123" });
  });

  test("pipeline body: dataSourceIds + dataSinkIds arrays and a model object", () => {
    const body = toPipelineBody(BUNDLE, "src-1", "sink-1") as Record<string, any>;
    assert.deepEqual(body.dataSourceIds, ["src-1"]);
    assert.deepEqual(body.dataSinkIds, ["sink-1"]);
    assert.equal(typeof body.model, "object");
    assert.ok(!("steps" in body), "no `steps` field — the flow lives in `model`");
  });

  test("buildInstallPlan carries one item per element + the summary", () => {
    const plan = buildInstallPlan(BUNDLE);
    assert.equal(plan.datastructures.length, 1);
    assert.equal(plan.datastructures[0].name, "TreeRecord");
    assert.equal(plan.datastructures[0].version, "1.2.0");
    assert.deepEqual(plan.summary.dataStructures, [{ name: "TreeRecord", version: "1.2.0" }]);
    assert.equal(plan.summary.datasetTitle, "Baumkataster Starter");
  });
});

describe("mapper — dataset state reading (poll criterion)", () => {
  test("reads dataSetStatus and pendingSagaType", () => {
    assert.deepEqual(readDatasetState({ dataSetStatus: "READY", pendingSagaType: "CREATE" }), {
      backendStatus: "READY",
      pendingSagaType: "CREATE",
    });
    assert.deepEqual(readDatasetState({ dataSetStatus: "AVAILABLE", pendingSagaType: null }), {
      backendStatus: "AVAILABLE",
      pendingSagaType: null,
    });
    assert.deepEqual(readDatasetState(null), { backendStatus: null, pendingSagaType: null });
    assert.deepEqual(readDatasetState({ dataSetStatus: "BOGUS" }), {
      backendStatus: null,
      pendingSagaType: null,
    });
  });

  test("a pending saga projects to PROVISIONING regardless of the raw status", () => {
    assert.equal(
      toLifecycleStatus({ backendStatus: "AVAILABLE", pendingSagaType: "CREATE" }),
      "PROVISIONING",
    );
    assert.equal(toLifecycleStatus({ backendStatus: "AVAILABLE", pendingSagaType: null }), "AVAILABLE");
    assert.equal(toLifecycleStatus({ backendStatus: "READY", pendingSagaType: null }), "READY");
    assert.equal(toLifecycleStatus({ backendStatus: null, pendingSagaType: null }), null);
  });
});

// A minimal React-Flow pipeline model, shaped like the portal editor's output
// (Start → dataSource → frost sink → End), with authoring-instance entityIds.
const PIPELINE_MODEL = {
  nodes: [
    { id: "n-start", type: "start", data: { label: "Start" }, position: { x: 0, y: 0 } },
    {
      id: "n-src",
      type: "dataSource",
      data: { label: "DataSource", entityId: "AUTHORED-SRC", entityType: "datasource" },
      position: { x: 1, y: 0 },
    },
    {
      id: "n-sink",
      type: "frost",
      data: { label: "Sink", entityId: "AUTHORED-SINK", entityType: "frost" },
      position: { x: 2, y: 0 },
    },
    { id: "n-end", type: "end", data: { label: "End" }, position: { x: 3, y: 0 } },
  ],
  edges: [
    { id: "e1", source: "n-start", target: "n-src", type: "smoothstep" },
    { id: "e2", source: "n-src", target: "n-sink", type: "smoothstep" },
    { id: "e3", source: "n-sink", target: "n-end", type: "smoothstep" },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe("mapper — pipeline model binding", () => {
  test("bindPipelineModel rebinds the source/sink entityIds by node type", () => {
    const bound = bindPipelineModel(PIPELINE_MODEL, "NEW-SRC", "NEW-SINK") as {
      nodes: { type: string; data: Record<string, unknown> }[];
      edges: unknown[];
      viewport: unknown;
    };
    const byType = (t: string) => bound.nodes.find((n) => n.type === t)!;
    assert.equal(byType("dataSource").data.entityId, "NEW-SRC");
    assert.equal(byType("frost").data.entityId, "NEW-SINK");
    // start/end untouched (no entityId); edges + layout copied through
    assert.ok(!("entityId" in byType("start").data));
    assert.equal(bound.edges.length, 3);
    assert.deepEqual(bound.viewport, { x: 0, y: 0, zoom: 1 });
  });

  test("bindPipelineModel is pure — the input model is not mutated", () => {
    const before = JSON.stringify(PIPELINE_MODEL);
    bindPipelineModel(PIPELINE_MODEL, "X", "Y");
    assert.equal(JSON.stringify(PIPELINE_MODEL), before);
  });

  test("bindPipelineModel also rebinds a geoPersistence (geo/POSTGIS) sink node", () => {
    const geoModel = {
      nodes: [
        { id: "s", type: "dataSource", data: { entityId: "OLD-SRC" } },
        { id: "k", type: "geoPersistence", data: { entityId: "OLD-SINK" } },
      ],
      edges: [],
    };
    const bound = bindPipelineModel(geoModel, "NEW-SRC", "NEW-SINK") as {
      nodes: { type: string; data: { entityId?: string } }[];
    };
    assert.equal(bound.nodes.find((n) => n.type === "dataSource")?.data.entityId, "NEW-SRC");
    assert.equal(bound.nodes.find((n) => n.type === "geoPersistence")?.data.entityId, "NEW-SINK");
  });

  test("readSinkType reads the sink node type (geoPersistence → POSTGIS); defaults to FROST", () => {
    assert.equal(readSinkType(PIPELINE_MODEL), "FROST");
    assert.equal(readSinkType({ nodes: [{ type: "geoPersistence" }] }), "POSTGIS");
    assert.equal(readSinkType(undefined), "FROST");
    assert.equal(readSinkType({}), "FROST");
  });

  test("toDatasinkBody honours the sink type", () => {
    assert.equal((toDatasinkBody("v", "POSTGIS") as Record<string, unknown>).dataSinkType, "POSTGIS");
    assert.equal((toDatasinkBody("v") as Record<string, unknown>).dataSinkType, "FROST");
  });

  test("toPipelineBody uses the bundled model (rebound) in BOTH model and styles", () => {
    const body = toPipelineBody({ ...BUNDLE, pipeline: PIPELINE_MODEL }, "src-9", "sink-9") as {
      model: { nodes: { type: string; data: Record<string, unknown> }[] };
      styles: { nodes: { type: string; data: Record<string, unknown> }[] };
      dataSourceIds: string[];
      dataSinkIds: string[];
    };
    assert.notDeepEqual(body.model, {}, "not the empty placeholder");
    const byType = (t: string) => body.model.nodes.find((n) => n.type === t)!;
    assert.equal(byType("dataSource").data.entityId, "src-9");
    assert.equal(byType("frost").data.entityId, "sink-9");
    assert.deepEqual(body.dataSourceIds, ["src-9"]);
    assert.deepEqual(body.dataSinkIds, ["sink-9"]);
    // `styles` must carry the same graph — the editor renders from `styles`, not `model`
    assert.deepEqual(body.styles, body.model);
  });

  test("toPipelineBody sends an empty model+styles when no pipeline is bundled (back-compat)", () => {
    const body = toPipelineBody(BUNDLE, "s", "d") as Record<string, unknown>;
    assert.deepEqual(body.model, {});
    assert.deepEqual(body.styles, {});
  });
});
