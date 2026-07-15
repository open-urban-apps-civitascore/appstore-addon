import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";

import type { UseCaseBundle } from "@/lib/server/bundle";
import { InMemoryInstallStore } from "@/lib/server/install-store";
import { StubAuthHeaderProvider } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import { installUseCase, uninstallUseCase, type InstallDeps } from "@/lib/server/portal-backend/install";
import type { InstalledUseCase, UseCase } from "@/types/use-cases";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const DS_TREE_RECORD = "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0";
const DS_TREE_SPECIES = "urn:core:platform:civitas:datastructure:demo:TreeSpecies:1.0.0";
const DATASET_URN = "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0";

const USE_CASE: UseCase = {
  id: "baumkataster-starter",
  title: "Baumkataster Starter",
  summary: "Ein kommunaler Baumkataster.",
  description: "Demo use case.",
  publisher: "Stadt Musterstadt",
  categories: [],
  maturity: "prototype",
  installability: "direct",
  compatibility: ["core-v2"],
  requiredCapabilities: [],
  installQuestions: [],
  includedArtifacts: [],
  modelForge: { datasetId: DATASET_URN, note: "Referenz" },
  source: { repoUrl: "https://gitlab.com/example/baumkataster", gitIdentifier: "v1.0.0" },
};

const BUNDLE: UseCaseBundle = {
  dataset: {
    id: DATASET_URN,
    title: "Baumkataster Starter",
    description: "Demo dataset.",
    version: "1.0.0",
    dataStructureRefs: [DS_TREE_RECORD, DS_TREE_SPECIES],
  },
  elements: [
    { ref: DS_TREE_RECORD, schema: { $id: DS_TREE_RECORD, title: "TreeRecord", type: "object" } },
    { ref: DS_TREE_SPECIES, schema: { $id: DS_TREE_SPECIES, title: "TreeSpecies", type: "object" } },
  ],
  source: USE_CASE.source,
  commit: "abc1234",
};

function seedRecord(overrides: Partial<InstalledUseCase> = {}): InstalledUseCase {
  return {
    id: "set-existing",
    useCaseId: USE_CASE.id,
    useCaseTitle: USE_CASE.title,
    installedAt: "2020-01-01T00:00:00.000Z",
    status: "AVAILABLE",
    source: "portal-backend",
    createdDataset: {
      name: "Baumkataster Starter",
      description: "Demo dataset.",
      openDataAccess: false,
      status: "AVAILABLE",
    },
    createdDataStructures: [{ name: "TreeRecord", version: "1.0.0" }],
    datasetRef: { datasetId: DATASET_URN },
    provisionedResources: {
      dataStructures: [
        { id: "ds-1", versionId: "v-1", name: "TreeRecord", version: "1.0.0" },
        { id: "ds-2", versionId: "v-2", name: "TreeSpecies", version: "1.0.0" },
      ],
      dataSourceId: "src-1",
      dataSinkId: "sink-1",
      pipelineId: "pipe-1",
    },
    ...overrides,
  };
}

// ── Mock portal-backend HTTP server ──────────────────────────────────────────────

interface RecordedRequest {
  method: string;
  path: string;
  headers: NodeJS.Dict<string | string[]>;
  body: unknown;
}

/** One `GET /datasets/{id}` response; the last entry repeats forever. */
interface DatasetStateResponse {
  dataSetStatus: string;
  pendingSagaType: string | null;
}

interface MockConfig {
  /** Status returned by POST /datasets/{id}/release (202 accepted, 409 in-flight). */
  releaseStatus: number;
  /** Successive GET /datasets/{id} responses (poll simulation); last one repeats. */
  datasetStates: DatasetStateResponse[];
  /** Make one endpoint fail with 500 (mid-install failure simulation). */
  failOn?: { method: string; pathPattern: RegExp };
}

let server: Server;
let baseUrl: string;
let requests: RecordedRequest[];
let config: MockConfig;
let counter: number;
let getDatasetCalls: number;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function handle(req: IncomingMessage, res: ServerResponse, body: string): void {
  const method = req.method ?? "GET";
  const path = (req.url ?? "").split("?")[0];
  requests.push({
    method,
    path,
    headers: req.headers,
    body: body ? JSON.parse(body) : undefined,
  });

  const created = (location: string) => {
    res.writeHead(201, { "Content-Type": "application/json", Location: location });
    res.end(JSON.stringify({ id: location.split("/").filter(Boolean).at(-1) }));
  };
  const status = (code: number, payload?: unknown) => {
    res.writeHead(code, payload ? { "Content-Type": "application/json" } : undefined);
    res.end(payload ? JSON.stringify(payload) : undefined);
  };

  if (config.failOn && method === config.failOn.method && config.failOn.pathPattern.test(path)) {
    return status(500, { detail: "injected failure" });
  }

  if (method === "POST") {
    if (path === "/datastructures") return created(`/datastructures/${nextId("ds")}`);
    if (/^\/datastructures\/[^/]+\/versions$/.test(path)) return created(`${path}/${nextId("v")}`);
    if (/^\/datastructures\/[^/]+\/versions\/[^/]+\/release$/.test(path)) return status(200);
    if (/^\/datastructures\/[^/]+\/(release|unrelease)$/.test(path)) return status(200);
    if (path === "/datasources") return created(`/datasources/${nextId("src")}`);
    if (/^\/datasources\/[^/]+\/(release|unrelease)$/.test(path)) return status(200);
    if (path === "/datasets") return created(`/datasets/${nextId("set")}`);
    if (/^\/datasets\/[^/]+\/pipelines$/.test(path)) return created(`${path}/${nextId("pipe")}`);
    if (/^\/datasets\/[^/]+\/datasinks$/.test(path)) return created(`${path}/${nextId("sink")}`);
    if (/^\/datasets\/[^/]+\/stage$/.test(path)) return status(200);
    if (/^\/datasets\/[^/]+\/unstage$/.test(path)) return status(200);
    if (/^\/datasets\/[^/]+\/release$/.test(path)) return status(config.releaseStatus);
    if (/^\/datasets\/[^/]+\/unrelease$/.test(path)) return status(202);
    return status(404);
  }
  if (method === "GET" && /^\/datasets\/[^/]+$/.test(path)) {
    const state =
      config.datasetStates[Math.min(getDatasetCalls, config.datasetStates.length - 1)];
    getDatasetCalls += 1;
    return status(200, { id: path.split("/").at(-1), ...state });
  }
  if (method === "DELETE") return status(204);
  return status(404);
}

function makeDeps(store: InMemoryInstallStore, bundle: UseCaseBundle = BUNDLE): InstallDeps {
  return {
    client: new PortalBackendClient({
      baseUrl,
      authProvider: new StubAuthHeaderProvider({
        allowedScopeIds: "test-scope",
        bearerToken: "test-token",
      }),
    }),
    store,
    fetchBundle: async () => bundle,
    now: () => new Date("2020-01-02T03:04:05.000Z"),
    poll: { intervalMs: 1, timeoutMs: 50 },
  };
}

/** POST paths recorded so far, in arrival order. */
function postPaths(): string[] {
  return requests.filter((request) => request.method === "POST").map((request) => request.path);
}

describe("portal-backend install orchestrator", () => {
  before(async () => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => handle(req, res, body));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  beforeEach(() => {
    requests = [];
    counter = 0;
    getDatasetCalls = 0;
    config = {
      releaseStatus: 202,
      datasetStates: [{ dataSetStatus: "AVAILABLE", pendingSagaType: null }],
    };
  });

  test("drives the verified release-cascade sequence in order", async () => {
    const store = new InMemoryInstallStore();
    const { record, created } = await installUseCase(USE_CASE, makeDeps(store));

    assert.equal(created, true);

    const posts = postPaths();
    const index = (predicate: (p: string) => boolean) => posts.findIndex(predicate);

    const firstStructure = index((p) => p === "/datastructures");
    const structureRelease = index((p) => /^\/datastructures\/[^/]+\/release$/.test(p));
    const versionRelease = index((p) => /\/versions\/[^/]+\/release$/.test(p));
    const datasource = index((p) => p === "/datasources");
    const datasourceRelease = index((p) => /^\/datasources\/[^/]+\/release$/.test(p));
    const dataset = index((p) => p === "/datasets");
    const datasink = index((p) => p.endsWith("/datasinks"));
    const pipeline = index((p) => p.endsWith("/pipelines"));
    const stage = index((p) => p.endsWith("/stage"));
    const release = index((p) => /^\/datasets\/[^/]+\/release$/.test(p));

    // create → release per level, then the dataset aggregate, sink BEFORE pipeline
    assert.ok(firstStructure >= 0, "a datastructure was created");
    assert.ok(versionRelease > firstStructure, "version released after create");
    assert.ok(structureRelease > versionRelease, "structure released after its version");
    assert.ok(datasource > structureRelease, "datasource only after the structure is AVAILABLE");
    assert.ok(datasourceRelease > datasource, "datasource released after create");
    assert.ok(dataset > datasourceRelease, "dataset after the datasource is AVAILABLE");
    assert.ok(datasink > dataset, "datasink under the dataset");
    assert.ok(pipeline > datasink, "datasink BEFORE pipeline (the pipeline links it)");
    assert.ok(stage > pipeline, "stage after wiring");
    assert.ok(release > stage, "release last");

    // one create per bundle datastructure (2), each with version + both releases
    assert.equal(posts.filter((p) => p === "/datastructures").length, 2);
    assert.equal(posts.filter((p) => /\/versions$/.test(p)).length, 2);
    assert.equal(posts.filter((p) => /\/versions\/[^/]+\/release$/.test(p)).length, 2);
    assert.equal(posts.filter((p) => /^\/datastructures\/[^/]+\/release$/.test(p)).length, 2);

    // the pipeline body links the created datasource + datasink by id
    const pipelineRequest = requests.find((r) => r.method === "POST" && r.path.endsWith("/pipelines"));
    const pipelineBody = pipelineRequest?.body as Record<string, unknown>;
    assert.deepEqual(pipelineBody.dataSourceIds, ["src-5"]);
    assert.ok(Array.isArray(pipelineBody.dataSinkIds) && (pipelineBody.dataSinkIds as string[]).length === 1);

    // datasource + FROST sink wire to the LAST element's version (bundle refs are
    // in dependency order — the top-level record comes last), here v-4
    const datasourceRequest = requests.find((r) => r.method === "POST" && r.path === "/datasources");
    assert.equal((datasourceRequest?.body as Record<string, unknown>).dataStructureVersionId, "v-4");
    const datasinkRequest = requests.find((r) => r.method === "POST" && r.path.endsWith("/datasinks"));
    const datasinkBody = datasinkRequest?.body as { configuration?: { dataStructureVersionId?: string } };
    assert.equal(datasinkBody.configuration?.dataStructureVersionId, "v-4");

    // the record persists everything uninstall needs
    assert.equal(record.source, "portal-backend");
    assert.match(record.id, /^set-/);
    assert.equal(record.provisionedResources?.dataStructures.length, 2);
    assert.ok(record.provisionedResources?.dataSourceId);
    assert.ok(record.provisionedResources?.dataSinkId);
    assert.ok(record.provisionedResources?.pipelineId);
    assert.equal((await store.get(USE_CASE.id))?.id, record.id);
  });

  test("attaches the gateway auth headers to every request", async () => {
    await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    assert.ok(requests.length > 0);
    for (const request of requests) {
      assert.equal(request.headers["x-allowed-scope-ids"], "test-scope");
      assert.equal(request.headers["x-api-request"], "true");
      assert.equal(request.headers["authorization"], "Bearer test-token");
    }
  });

  test("saga success: polls past the in-flight state, reports AVAILABLE", async () => {
    config.datasetStates = [
      { dataSetStatus: "AVAILABLE", pendingSagaType: "CREATE" }, // optimistic, saga running
      { dataSetStatus: "AVAILABLE", pendingSagaType: null }, // saga finished
    ];
    const { record } = await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    assert.equal(record.status, "AVAILABLE");
    assert.ok(getDatasetCalls >= 2, "kept polling while the saga was in flight");
    assert.ok(
      record.provisioningTrace?.steps.some((s) => s.label.includes("saga succeeded")),
      "trace records the saga outcome",
    );
  });

  test("saga failure: the optimistic AVAILABLE is not trusted — reports READY after compensation", async () => {
    config.datasetStates = [
      { dataSetStatus: "AVAILABLE", pendingSagaType: "CREATE" }, // the lie we saw live
      { dataSetStatus: "READY", pendingSagaType: null }, // compensated outcome
    ];
    const { record } = await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    assert.equal(record.status, "READY");
    assert.ok(
      record.provisioningTrace?.steps.some((s) => s.label.includes("saga failed")),
      "trace records the compensation",
    );
  });

  test("poll timeout: reports PROVISIONING when the saga never settles", async () => {
    config.datasetStates = [{ dataSetStatus: "READY", pendingSagaType: "CREATE" }];
    const { record } = await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    assert.equal(record.status, "PROVISIONING");
  });

  test("handles 409 (saga already in flight) idempotently, without throwing", async () => {
    config.releaseStatus = 409;
    config.datasetStates = [{ dataSetStatus: "READY", pendingSagaType: "CREATE" }];
    const store = new InMemoryInstallStore();

    const { record, created } = await installUseCase(USE_CASE, makeDeps(store));

    assert.equal(created, true);
    assert.equal(record.status, "PROVISIONING");
    const releaseStep = record.provisioningTrace?.steps.find((s) =>
      /\/datasets\/[^/]+\/release$/.test(s.path),
    );
    assert.equal(releaseStep?.status, 409);
    assert.equal((await store.get(USE_CASE.id))?.id, record.id);
  });

  test("is idempotent: reuses an existing install instead of creating a duplicate dataset", async () => {
    const store = new InMemoryInstallStore([seedRecord()]);

    const { record, created } = await installUseCase(USE_CASE, makeDeps(store));

    assert.equal(created, false);
    assert.equal(record.id, "set-existing");
    assert.equal(postPaths().filter((p) => p === "/datasets").length, 0);
    assert.deepEqual(
      requests.map((r) => `${r.method} ${r.path}`),
      ["GET /datasets/set-existing"],
    );
  });

  test("install with a bundled pipeline: real model, entityIds rebound to created ids, sink type from model", async () => {
    const pipeline = {
      nodes: [
        { id: "n-start", type: "start", data: { label: "Start" } },
        { id: "n-src", type: "dataSource", data: { label: "DataSource", entityId: "AUTHORED-SRC" } },
        { id: "n-sink", type: "frost", data: { label: "Sink", entityId: "AUTHORED-SINK" } },
        { id: "n-end", type: "end", data: { label: "End" } },
      ],
      edges: [
        { id: "e1", source: "n-start", target: "n-src" },
        { id: "e2", source: "n-src", target: "n-sink" },
        { id: "e3", source: "n-sink", target: "n-end" },
      ],
    };
    const store = new InMemoryInstallStore();

    await installUseCase(USE_CASE, makeDeps(store, { ...BUNDLE, pipeline }));

    const pipelineReq = requests.find((r) => r.method === "POST" && r.path.endsWith("/pipelines"));
    const body = pipelineReq?.body as {
      model: { nodes: { type: string; data: { entityId?: string } }[] };
      dataSourceIds: string[];
      dataSinkIds: string[];
    };
    const nodeOf = (t: string) => body.model.nodes.find((n) => n.type === t);
    // source/sink nodes now carry the CREATED ids the orchestrator linked, NOT the
    // authoring-instance ids that came in the bundle
    assert.notEqual(nodeOf("dataSource")?.data.entityId, "AUTHORED-SRC");
    assert.equal(nodeOf("dataSource")?.data.entityId, body.dataSourceIds[0]);
    assert.equal(nodeOf("frost")?.data.entityId, body.dataSinkIds[0]);
    // the datasink was created with the type declared by the model's sink node
    const sinkReq = requests.find((r) => r.method === "POST" && r.path.endsWith("/datasinks"));
    assert.equal((sinkReq?.body as { dataSinkType: string }).dataSinkType, "FROST");
  });

  test("install rejects a geoPersistence (POSTGIS) sink pipeline — not supported yet — and rolls back", async () => {
    config.datasetStates = [{ dataSetStatus: "DRAFT", pendingSagaType: null }];
    const pipeline = {
      nodes: [
        { id: "n-start", type: "start", data: {} },
        { id: "n-src", type: "dataSource", data: { entityId: null } },
        { id: "n-sink", type: "geoPersistence", data: { entityId: null } },
        { id: "n-end", type: "end", data: {} },
      ],
      edges: [],
    };
    const store = new InMemoryInstallStore();

    await assert.rejects(
      () => installUseCase(USE_CASE, makeDeps(store, { ...BUNDLE, pipeline })),
      /POSTGIS|does not support/,
    );

    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    // the POSTGIS guard fires BEFORE the datasink is created; whatever was made so
    // far (datastructures, datasource) is rolled back, and nothing is recorded
    assert.ok(!sequence.some((s) => s.endsWith("/datasinks")), "no datasink created");
    assert.ok(sequence.some((s) => s.startsWith("DELETE /datastructures/")), "datastructures rolled back");
    assert.equal(await store.get(USE_CASE.id), null);
  });

  test("uninstall of an AVAILABLE install: unrelease → teardown saga lands on READY → unstage → delete cascade", async () => {
    config.datasetStates = [
      { dataSetStatus: "AVAILABLE", pendingSagaType: null }, // initial state read
      { dataSetStatus: "READY", pendingSagaType: null }, // DELETE saga success ends on READY (not DRAFT)
    ];
    const store = new InMemoryInstallStore([seedRecord({ id: "set-42" })]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.deepEqual(sequence, [
      "GET /datasets/set-42",
      "POST /datasets/set-42/unrelease",
      "GET /datasets/set-42", // saga poll → READY
      "POST /datasets/set-42/unstage", // READY → DRAFT, or the nested deletes 400
      "DELETE /datasets/set-42/pipelines/pipe-1",
      "DELETE /datasets/set-42/datasinks/sink-1",
      "DELETE /datasets/set-42",
      "POST /datasources/src-1/unrelease",
      "DELETE /datasources/src-1",
      "POST /datastructures/ds-1/unrelease",
      "DELETE /datastructures/ds-1",
      "POST /datastructures/ds-2/unrelease",
      "DELETE /datastructures/ds-2",
    ]);
    assert.equal(await store.get(USE_CASE.id), null);
  });

  test("uninstall aborts cleanly (record kept) when the teardown saga never settles", async () => {
    config.datasetStates = [
      { dataSetStatus: "AVAILABLE", pendingSagaType: null },
      { dataSetStatus: "AVAILABLE", pendingSagaType: "DELETE" }, // saga runs forever
    ];
    const store = new InMemoryInstallStore([seedRecord({ id: "set-slow" })]);

    await assert.rejects(
      () => uninstallUseCase(USE_CASE.id, makeDeps(store)),
      /teardown saga is still in progress/,
    );
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.ok(!sequence.some((s) => s.startsWith("DELETE ")), "no deletes while the saga runs");
    assert.ok(await store.get(USE_CASE.id), "record kept for the retry");
  });

  test("uninstall of a READY install unstages (no unrelease) before deleting", async () => {
    config.datasetStates = [{ dataSetStatus: "READY", pendingSagaType: null }];
    const store = new InMemoryInstallStore([seedRecord({ id: "set-7", status: "READY" })]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.ok(sequence.includes("POST /datasets/set-7/unstage"));
    assert.ok(!sequence.some((s) => s.includes("/unrelease") && s.includes("/datasets/")));
    assert.ok(sequence.indexOf("POST /datasets/set-7/unstage") < sequence.indexOf("DELETE /datasets/set-7"));
  });

  test("uninstall without provisionedResources (legacy record) removes only the dataset", async () => {
    config.datasetStates = [{ dataSetStatus: "DRAFT", pendingSagaType: null }];
    const store = new InMemoryInstallStore([
      seedRecord({ id: "set-legacy", status: "DRAFT", provisionedResources: undefined }),
    ]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    assert.deepEqual(
      requests.map((r) => `${r.method} ${r.path}`),
      ["GET /datasets/set-legacy", "DELETE /datasets/set-legacy"],
    );
  });

  test("uninstall still cleans up datasource + datastructures when the dataset is already gone", async () => {
    // GET /datasets/{id} → 404 is modelled by the client returning null; simulate
    // via a state the mock cannot produce — use a dedicated 404 path instead.
    const store = new InMemoryInstallStore([seedRecord({ id: "missing" })]);
    // Point the mock at 404 for this id by intercepting: the generic GET matcher
    // always answers, so instead delete against a fresh server-side convention:
    // the client treats 404 as "gone" — emulate by making GET return 404 once.
    const deps = makeDeps(store);
    const original = deps.client.getDataset.bind(deps.client);
    deps.client.getDataset = async () => null;

    const removed = await uninstallUseCase(USE_CASE.id, deps);

    assert.equal(removed, true);
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.ok(!sequence.some((s) => s.startsWith("DELETE /datasets/missing")), "no dataset delete");
    assert.ok(sequence.includes("DELETE /datasources/src-1"));
    assert.ok(sequence.includes("DELETE /datastructures/ds-1"));
    assert.ok(sequence.includes("DELETE /datastructures/ds-2"));
    assert.equal(await store.get(USE_CASE.id), null);
    void original;
  });

  test("uninstall returns false and touches nothing when not installed", async () => {
    const store = new InMemoryInstallStore();

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, false);
    assert.equal(requests.length, 0);
  });

  test("mid-install failure rolls back everything created so far, then rethrows", async () => {
    // Fail the datasource create: at that point two datastructures (with released
    // versions) already exist on the backend and MUST NOT be stranded.
    config.failOn = { method: "POST", pathPattern: /^\/datasources$/ };
    const store = new InMemoryInstallStore();

    await assert.rejects(() => installUseCase(USE_CASE, makeDeps(store)));

    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    // rollback deletes both created datastructures (unrelease is best-effort first)
    assert.ok(sequence.includes("POST /datastructures/ds-1/unrelease"));
    assert.ok(sequence.includes("DELETE /datastructures/ds-1"));
    assert.ok(sequence.includes("POST /datastructures/ds-3/unrelease"));
    assert.ok(sequence.includes("DELETE /datastructures/ds-3"));
    // no dataset was ever created, so nothing dataset-scoped is touched
    assert.ok(!sequence.some((s) => s.startsWith("GET /datasets/")));
    // nothing was recorded — the next attempt starts clean
    assert.equal(await store.get(USE_CASE.id), null);
  });

  test("uninstall with a saga in flight WAITS for it, then branches on the true status", async () => {
    // Initial read: optimistic AVAILABLE while a CREATE saga still runs. The saga
    // then compensates → true outcome READY, which needs unstage (NOT unrelease —
    // that would hit the backend's 409 saga guard).
    config.datasetStates = [
      { dataSetStatus: "AVAILABLE", pendingSagaType: "CREATE" },
      { dataSetStatus: "READY", pendingSagaType: null },
    ];
    const store = new InMemoryInstallStore([seedRecord({ id: "set-9" })]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.ok(!sequence.includes("POST /datasets/set-9/unrelease"), "no unrelease during/after a compensated saga");
    assert.ok(sequence.includes("POST /datasets/set-9/unstage"), "unstages the compensated (READY) dataset");
    assert.ok(
      sequence.filter((s) => s === "GET /datasets/set-9").length >= 2,
      "polled the saga before acting",
    );
    assert.equal(await store.get(USE_CASE.id), null);
  });
});
