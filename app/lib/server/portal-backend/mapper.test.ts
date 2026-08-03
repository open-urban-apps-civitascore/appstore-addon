import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { UseCaseBundle } from "@/lib/server/bundle";
import {
  buildCorePipelineModel,
  buildInstallPlan,
  demoClientId,
  demoTableName,
  demoTopic,
  readConfigurationUrn,
  readDatasetState,
  readModelUrn,
  toDatasetBody,
  toDatasinkBody,
  toDatasourceBody,
  toDatastructureCreateBody,
  toDatastructureVersionBody,
  toLifecycleStatus,
  toMappingBody,
  toPipelineBody,
  toUrnSafeName,
  type PipelineRefs,
} from "@/lib/server/portal-backend/mapper";
import type { UseCase } from "@/types/use-cases";

const DS_REF = "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.2.0";

const USE_CASE = { id: "baumkataster-starter" } as UseCase;

/** A minted element URN, in the exact shape the backend produces. */
const ELEMENT_URN = "urn:core:platform:civitas:element:common:TreeRecord:ywsrd6ryb9:1.2.0";

const REFS: PipelineRefs = {
  sourceRef: "urn:core:platform:civitas:datasource:common:Src:aaaaaaaaaa:1.0.0",
  mappingRef: "urn:core:platform:civitas:mapping:common:Identity:bbbbbbbbbb:1.0.0",
  sinkRef: "urn:core:platform:civitas:datasink:common:Sink:cccccccccc:1.0.0",
  dataSourceId: "src-1",
  dataSinkId: "sink-1",
  sinkType: "POSTGIS",
  tableName: "uc_demo",
};

const MAPPING_CONFIG = { source: ELEMENT_URN, target: ELEMENT_URN, fields: {} };
const STRUCTURE = { id: "ds-1", versionId: "v-1", name: "TreeRecord" };

/** Just enough shape on the opaque request bodies for the assertions to read them. */
type DatasourceBody = {
  connectorType: string;
  dataStructureVersionId: unknown;
  configuration: Record<string, unknown> & { urls?: string[]; topics?: string[] };
};
type DatasinkBody = { dataSinkType: string; configuration: Record<string, unknown> };
type MappingBody = { source: string; target: string; fields: Record<string, unknown> };

/** A flat element — the only shape this install path handles today. */
const FLAT_SCHEMA = {
  type: "object",
  properties: {
    counterId: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    vehicleCount: { type: "integer" },
  },
};

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
    const body = toDatastructureVersionBody(BUNDLE.elements[0]) as { model: Record<string, unknown> };
    assert.ok(!("$id" in body.model), "a bundle URN $id would be rejected on version release");
    assert.equal(body.model.title, "TreeRecord", "the rest of the schema is untouched");
  });

  test("datasource body: configuration + client_id, and NO version at create time", () => {
    const body = toDatasourceBody(USE_CASE, BUNDLE) as DatasourceBody;
    assert.equal(body.connectorType, "MQTT");
    // A create-time link is rejected by the backend; PATCH attaches it afterwards.
    assert.equal(body.dataStructureVersionId, null);
    assert.ok(Array.isArray(body.configuration.urls) && body.configuration.urls.length > 0);
    assert.ok(Array.isArray(body.configuration.topics) && body.configuration.topics.length > 0);
    assert.equal(typeof body.configuration.qos, "number");
    // snake_case, and non-optional in practice: without it every NiFi consumer
    // connects as `civitas-nifi-consumer` and they kick each other off the broker.
    assert.equal(body.configuration.client_id, demoClientId(USE_CASE.id));
    assert.ok(!("clientId" in body.configuration), "the backend field is `client_id`");
    assert.ok(!("config" in body), "the field is `configuration`, not `config`");
  });

  test("datasource body: the demo broker is the bundled mosquitto, not FROST's dead port", () => {
    const body = toDatasourceBody(USE_CASE, BUNDLE) as DatasourceBody;
    assert.deepEqual(body.configuration.urls, ["tcp://civitas-mosquitto:1883"]);
    assert.notEqual(
      body.configuration.urls[0],
      "tcp://civitas-frost:1883",
      "nothing listens on the FROST image's published 1883 — a demo install would subscribe to nothing",
    );
    assert.deepEqual(body.configuration.topics, [demoTopic(USE_CASE.id)]);
  });

  test("datasource body: an own-broker override replaces the demo preset", () => {
    const own = toDatasourceBody(USE_CASE, BUNDLE, {
      url: "tcp://broker.stadt.example:1883",
      topic: "stadt/verkehr",
      username: "svc",
      password: "geheim",
    }) as DatasourceBody;
    assert.deepEqual(own.configuration.urls, ["tcp://broker.stadt.example:1883"]);
    assert.deepEqual(own.configuration.topics, ["stadt/verkehr"]);
    assert.equal(own.configuration.user, "svc");
    assert.equal(own.configuration.password, "geheim");
    assert.equal(own.dataStructureVersionId, null);

    // Credentials appear ONLY when given — no empty user/password fields.
    const noCreds = toDatasourceBody(USE_CASE, BUNDLE, {
      url: "tcp://b:1883",
      topic: "t",
    }) as DatasourceBody;
    assert.ok(!("user" in noCreds.configuration), "no user field without a username");
    assert.ok(!("password" in noCreds.configuration), "no password field without a password");
  });

  test("the demo topic and client id are pure functions of the use case id", () => {
    // The datasource subscribes to this topic and the generator publishes on it.
    // If the two ever disagree the pipeline provisions, the generator reports
    // success, and nothing arrives — so they must come from one derivation.
    assert.equal(demoTopic("hello-trafficcounter"), "civitas/hello-trafficcounter");
    assert.equal(demoClientId("hello-trafficcounter"), "nifi-hello-trafficcounter");
    assert.equal(demoTableName("hello-trafficcounter"), "uc_hello_trafficcounter");
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

  test("datasink body: the row schema is referenced by URN, not by version id", () => {
    const body = toDatasinkBody(ELEMENT_URN, "POSTGIS", "uc_demo") as DatasinkBody;
    assert.equal(body.dataSinkType, "POSTGIS");
    assert.deepEqual(body.configuration, { tableName: "uc_demo", element: ELEMENT_URN });
    assert.ok(
      !("dataStructureVersionId" in body.configuration),
      "the sink resolves its columns from the element URN — a version id resolves to nothing",
    );

    const frost = toDatasinkBody(ELEMENT_URN, "FROST") as DatasinkBody;
    assert.deepEqual(frost.configuration, { element: ELEMENT_URN }, "FROST carries no table name");
  });

  test("pipeline body: dataSourceIds + dataSinkIds arrays and a model object", () => {
    const body = toPipelineBody(BUNDLE, REFS, MAPPING_CONFIG, STRUCTURE) as Record<string, unknown> & {
      dataSourceIds: string[];
      dataSinkIds: string[];
    };
    assert.deepEqual(body.dataSourceIds, ["src-1"]);
    assert.deepEqual(body.dataSinkIds, ["sink-1"]);
    assert.equal(typeof body.model, "object");
    assert.ok(!("steps" in body), "no `steps` field — the flow lives in `model`");
  });

  test("minted URNs are read off the create responses, not reconstructed", () => {
    assert.equal(readModelUrn({ modelUrn: ELEMENT_URN }), ELEMENT_URN);
    assert.equal(readModelUrn({}), null);
    assert.equal(readModelUrn(null), null);
    assert.equal(readConfigurationUrn({ configurationUrn: "urn:x" }), "urn:x");
    assert.equal(readConfigurationUrn({}), null);
  });

  test("names are stripped to letters and digits before the backend mints a URN from them", () => {
    // Model Forge's sanitizer keeps `_`, `.` and `-`; the config-adapter's URN
    // grammar does not. A name it accepts and the compiler then rejects fails at
    // DEPLOY time, after the table already exists — so strip it here.
    assert.equal(toUrnSafeName("traffic_counter"), "trafficcounter");
    assert.equal(toUrnSafeName("Verkehr-Zählung 2026"), "VerkehrZhlung2026");
    assert.equal(toUrnSafeName("___"), "Element", "never empty — the URN segment is required");
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

describe("mapper — the synthesized CORE pipeline graph", () => {
  test("builds the one chain a single-source/single-sink use case can have", () => {
    const model = buildCorePipelineModel(REFS) as {
      nodes: { id: string; kind: string; sourceRef?: string; mappingRef?: string; sinkRef?: string }[];
      edges: { source: string; target: string }[];
    };
    assert.deepEqual(
      model.nodes.map((node) => node.kind),
      ["start", "source", "mapping", "sink", "end"],
    );
    const byKind = (kind: string) => model.nodes.find((node) => node.kind === kind)!;
    assert.equal(byKind("source").sourceRef, REFS.sourceRef);
    assert.equal(byKind("mapping").mappingRef, REFS.mappingRef);
    assert.equal(byKind("sink").sinkRef, REFS.sinkRef);

    // A connected chain start → … → end, with no dangling node.
    assert.equal(model.edges.length, 4);
    const ids = new Set(model.nodes.map((node) => node.id));
    for (const edge of model.edges) {
      assert.ok(ids.has(edge.source) && ids.has(edge.target), "every edge joins two real nodes");
    }
  });

  test("nodes are wired by URN, not by portal id — the adapter resolves refs from the registry", () => {
    const model = buildCorePipelineModel(REFS) as { nodes: Record<string, unknown>[] };
    for (const node of model.nodes) {
      assert.ok(!("entityId" in node), "the CORE document carries no portal GUIDs");
      assert.ok(!("type" in node), "React-Flow `type` belongs in styles, not in the model");
    }
  });

  test("styles carries the React-Flow graph — the editor ignores `model` entirely", () => {
    const body = toPipelineBody(BUNDLE, REFS, MAPPING_CONFIG, STRUCTURE) as {
      model: { nodes: { id: string; kind: string }[] };
      styles: { nodes: { id: string; type: string; data: Record<string, unknown> }[] };
    };
    assert.deepEqual(
      body.styles.nodes.map((node) => node.type),
      ["start", "dataSource", "mapping", "geoPersistence", "end"],
    );
    // Sending only `model` provisions a working pipeline that opens as an empty
    // canvas — which reads as a broken install to anyone who looks.
    const editorSource = body.styles.nodes.find((node) => node.type === "dataSource")!;
    assert.equal(editorSource.data.entityId, "src-1");
    const editorSink = body.styles.nodes.find((node) => node.type === "geoPersistence")!;
    assert.equal(editorSink.data.tableName, "uc_demo");
    // Model and styles describe the same five nodes, by id.
    assert.deepEqual(
      body.styles.nodes.map((node) => node.id),
      body.model.nodes.map((node) => node.id),
    );
  });

  test("a FROST sink renders as a frost node, not a geo one", () => {
    const body = toPipelineBody(
      BUNDLE,
      { ...REFS, sinkType: "FROST", tableName: undefined },
      MAPPING_CONFIG,
      STRUCTURE,
    ) as { styles: { nodes: { type: string }[] } };
    assert.ok(body.styles.nodes.some((node) => node.type === "frost"));
  });
});

describe("mapper — the identity mapping", () => {
  test("copies every field to itself, with one structure on both ends", () => {
    const body = toMappingBody(ELEMENT_URN, FLAT_SCHEMA, "TrafficCounter-identity") as MappingBody;
    assert.equal(body.source, ELEMENT_URN);
    assert.equal(body.target, ELEMENT_URN, "source and target are the same structure — allowed, verified live");
    assert.deepEqual(body.fields, {
      "$.counterId": "$.counterId",
      "$.timestamp": "$.timestamp",
      "$.vehicleCount": "$.vehicleCount",
    });
  });

  test("refuses a nested element up front rather than failing in the saga", () => {
    // A `$ref` or an object property means a geometry column and a cross-structure
    // reference. Failing here costs a second; failing in the saga costs a
    // provisioned-then-dropped table and an opaque compensation to READY.
    assert.throws(
      () =>
        toMappingBody(
          ELEMENT_URN,
          {
            type: "object",
            properties: {
              counterId: { type: "string" },
              location: { $ref: "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0" },
            },
          },
          "t",
        ),
      /location/,
    );
  });

  test("refuses an element with no properties", () => {
    assert.throws(() => toMappingBody(ELEMENT_URN, { type: "object" }, "t"), /no properties/);
  });
});
