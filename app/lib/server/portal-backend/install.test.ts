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

interface MockConfig {
  /** Status returned by POST /datasets/{id}/release (202 accepted, 409 in-flight). */
  releaseStatus: number;
  /** Lifecycle status reported by GET /datasets/{id}. */
  datasetStatus: string;
}

let server: Server;
let baseUrl: string;
let requests: RecordedRequest[];
let config: MockConfig;
let counter: number;

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

  if (method === "POST") {
    if (path === "/datastructures") return created(`/datastructures/${nextId("ds")}`);
    if (/^\/datastructures\/[^/]+\/versions$/.test(path)) return created(`${path}/${nextId("v")}`);
    if (/^\/datastructures\/[^/]+\/versions\/[^/]+\/release$/.test(path)) return status(200);
    if (path === "/datasources") return created(`/datasources/${nextId("src")}`);
    if (path === "/datasets") return created(`/datasets/${nextId("set")}`);
    if (/^\/datasets\/[^/]+\/pipelines$/.test(path)) return created(`${path}/${nextId("pipe")}`);
    if (/^\/datasets\/[^/]+\/datasinks$/.test(path)) return created(`${path}/${nextId("sink")}`);
    if (/^\/datasets\/[^/]+\/stage$/.test(path)) return status(200);
    if (/^\/datasets\/[^/]+\/release$/.test(path)) return status(config.releaseStatus);
    if (/^\/datasets\/[^/]+\/unrelease$/.test(path)) return status(202);
    return status(404);
  }
  if (method === "GET" && /^\/datasets\/[^/]+$/.test(path)) {
    return status(200, { id: path.split("/").at(-1), status: config.datasetStatus });
  }
  if (method === "DELETE" && /^\/datasets\/[^/]+$/.test(path)) return status(204);
  return status(404);
}

function makeDeps(store: InMemoryInstallStore): InstallDeps {
  return {
    client: new PortalBackendClient({
      baseUrl,
      authProvider: new StubAuthHeaderProvider({
        allowedScopeIds: "test-scope",
        bearerToken: "test-token",
      }),
    }),
    store,
    fetchBundle: async () => BUNDLE,
    now: () => new Date("2020-01-02T03:04:05.000Z"),
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
    config = { releaseStatus: 202, datasetStatus: "AVAILABLE" };
  });

  test("drives the full call sequence in the contract's required order", async () => {
    const store = new InMemoryInstallStore();
    const { record, created } = await installUseCase(USE_CASE, makeDeps(store));

    assert.equal(created, true);

    const posts = postPaths();
    const firstDatastructure = posts.indexOf("/datastructures");
    const datasource = posts.indexOf("/datasources");
    const dataset = posts.indexOf("/datasets");
    const pipeline = posts.findIndex((p) => p.endsWith("/pipelines"));
    const datasink = posts.findIndex((p) => p.endsWith("/datasinks"));
    const stage = posts.findIndex((p) => p.endsWith("/stage"));
    const release = posts.findIndex((p) => /^\/datasets\/[^/]+\/release$/.test(p));

    // datastructure → datasource → dataset → pipeline/datasink → stage → release
    assert.ok(firstDatastructure >= 0, "a datastructure was created");
    assert.ok(firstDatastructure < datasource, "datastructure before datasource");
    assert.ok(datasource < dataset, "datasource before dataset");
    assert.ok(dataset < pipeline, "dataset before pipeline");
    assert.ok(pipeline < datasink, "pipeline before datasink");
    assert.ok(datasink < stage, "datasink before stage");
    assert.ok(stage < release, "stage before release");

    // one create per bundle datastructure (2), each with a version + version release
    assert.equal(posts.filter((p) => p === "/datastructures").length, 2);
    assert.equal(posts.filter((p) => /\/versions$/.test(p)).length, 2);
    assert.equal(posts.filter((p) => /\/versions\/[^/]+\/release$/.test(p)).length, 2);

    // pipeline + datasink are nested under the created dataset
    assert.ok(posts.some((p) => new RegExp(`^/datasets/${record.id}/pipelines$`).test(p)));
    assert.ok(posts.some((p) => new RegExp(`^/datasets/${record.id}/datasinks$`).test(p)));

    // the record is persisted and marked as a portal-backend install
    assert.equal(record.source, "portal-backend");
    assert.match(record.id, /^set-/);
    assert.equal((await store.get(USE_CASE.id))?.id, record.id);
    assert.deepEqual(
      record.createdDataStructures.map((d) => d.name),
      ["TreeRecord", "TreeSpecies"],
    );
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

  test("handles 202 (async release): reports AVAILABLE once the saga has finished", async () => {
    config.releaseStatus = 202;
    config.datasetStatus = "AVAILABLE";
    const { record } = await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    const releaseStep = record.provisioningTrace?.steps.find((s) =>
      /\/datasets\/[^/]+\/release$/.test(s.path),
    );
    assert.equal(releaseStep?.status, 202);
    assert.equal(record.status, "AVAILABLE");
  });

  test("handles 202 (async release): reports PROVISIONING while the saga is still running", async () => {
    config.releaseStatus = 202;
    config.datasetStatus = "RELEASING";
    const { record } = await installUseCase(USE_CASE, makeDeps(new InMemoryInstallStore()));

    assert.equal(record.status, "PROVISIONING");
  });

  test("handles 409 (saga already in flight) idempotently, without throwing", async () => {
    config.releaseStatus = 409;
    config.datasetStatus = "RELEASING";
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
    // no new dataset was created
    assert.equal(postPaths().filter((p) => p === "/datasets").length, 0);
    // it only checked the existing dataset's live status
    assert.deepEqual(
      requests.map((r) => `${r.method} ${r.path}`),
      ["GET /datasets/set-existing"],
    );
  });

  test("uninstall unreleases (tears down infra) then deletes, and drops the record", async () => {
    config.datasetStatus = "AVAILABLE";
    const store = new InMemoryInstallStore([seedRecord({ id: "set-42" })]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    const sequence = requests.map((r) => `${r.method} ${r.path}`);
    assert.deepEqual(sequence, [
      "GET /datasets/set-42",
      "POST /datasets/set-42/unrelease",
      "DELETE /datasets/set-42",
    ]);
    // unrelease strictly precedes delete
    assert.ok(
      sequence.indexOf("POST /datasets/set-42/unrelease") <
        sequence.indexOf("DELETE /datasets/set-42"),
    );
    assert.equal(await store.get(USE_CASE.id), null);
  });

  test("uninstall of a DRAFT dataset deletes directly (no unrelease)", async () => {
    config.datasetStatus = "DRAFT";
    const store = new InMemoryInstallStore([seedRecord({ id: "set-7", status: "DRAFT" })]);

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, true);
    assert.deepEqual(
      requests.map((r) => `${r.method} ${r.path}`),
      ["GET /datasets/set-7", "DELETE /datasets/set-7"],
    );
  });

  test("uninstall returns false and touches nothing when not installed", async () => {
    const store = new InMemoryInstallStore();

    const removed = await uninstallUseCase(USE_CASE.id, makeDeps(store));

    assert.equal(removed, false);
    assert.equal(requests.length, 0);
  });
});
