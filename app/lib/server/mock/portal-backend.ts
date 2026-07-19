/**
 * An in-memory portal-backend simulation, plugged into the REAL
 * `PortalBackendClient` as its `fetchImpl` — so mock mode exercises the exact
 * production code path (Location-header parsing, release-cascade ordering, the
 * `pendingSagaType` poll) against simulated HTTP responses.
 *
 * Behavioral fidelity (mirrors what was verified live, see the meta-repo spike
 * notes 2026-07-13/15):
 *   - creates return `201` + a `Location` header whose last segment is the id
 *   - dataset `release` returns `202`, flips the status OPTIMISTICALLY to
 *     AVAILABLE and sets `pendingSagaType` for ~MOCK_SAGA_MS; a release during a
 *     running saga returns `409`
 *   - the saga outcome depends on the pipeline `model`: a real flow graph
 *     succeeds (stays AVAILABLE), the empty placeholder `{}` is "rejected by
 *     NiFi" and compensates back to READY — exactly like the live stack
 *   - `unrelease` runs the async DELETE saga and lands on READY (not DRAFT);
 *     `unstage` takes READY→DRAFT; deletes of unknown ids return 404 (the
 *     client treats that as success)
 *
 * State is module-scoped (per server process). `resetMockPortalBackend()` exists
 * for tests.
 */

type SagaKind = "CREATE" | "DELETE";

interface MockDataset {
  status: "DRAFT" | "READY" | "AVAILABLE";
  pendingSagaType: SagaKind | null;
  /** When the running saga resolves (lazily, on the next read). */
  sagaEndsAt: number;
  /** Did the created pipeline carry a real flow graph? Decides the CREATE saga outcome. */
  hasFlow: boolean;
}

const datasets = new Map<string, MockDataset>();
let idCounter = 0;

/** Simulated saga duration — long enough to see PROVISIONING, short enough to demo. */
function sagaMs(): number {
  const configured = Number(process.env.MARKETPLACE_MOCK_SAGA_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : 1500;
}

export function resetMockPortalBackend(): void {
  datasets.clear();
  idCounter = 0;
}

const nextId = (kind: string): string => `mock-${kind}-${++idCounter}`;

/** Resolve a finished saga before answering any read — outcomes are read-driven. */
function settle(dataset: MockDataset): void {
  if (dataset.pendingSagaType !== null && Date.now() >= dataset.sagaEndsAt) {
    if (dataset.pendingSagaType === "CREATE") {
      // NiFi accepts a real flow graph; the empty placeholder compensates.
      dataset.status = dataset.hasFlow ? "AVAILABLE" : "READY";
    } else {
      // DELETE (unrelease) saga lands on READY, not DRAFT — verified upstream.
      dataset.status = "READY";
    }
    dataset.pendingSagaType = null;
  }
}

const json = (status: number, body: unknown, headers?: Record<string, string>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const created = (path: string): Response => json(201, {}, { Location: path });
const noContent = (): Response => new Response(null, { status: 204 });
const ok = (): Response => json(200, {});
const notFound = (): Response => json(404, { error: "not found" });
const conflict = (message: string): Response => json(409, { error: message });
const badRequest = (message: string): Response => json(400, { error: message });

function readBody(init?: RequestInit): unknown {
  if (typeof init?.body !== "string") return undefined;
  try {
    return JSON.parse(init.body);
  } catch {
    return undefined;
  }
}

/** Does a create-pipeline payload carry a real flow graph (vs. the `{}` placeholder)? */
function payloadHasFlow(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const model = (body as { model?: unknown }).model;
  if (!model || typeof model !== "object") return false;
  const nodes = (model as { nodes?: unknown }).nodes;
  return Array.isArray(nodes) && nodes.length > 0;
}

/**
 * The `fetchImpl` for the mock `PortalBackendClient`. Only the routes the client
 * actually uses are implemented; anything else 404s loudly.
 */
export const mockPortalBackendFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const path = new URL(url).pathname.replace(/^\/v1(?=\/)/, "");

  // ── Datastructures (+ versions) — created/released/deleted, no state needed ──
  if (method === "POST" && path === "/datastructures") {
    return created(`/v1/datastructures/${nextId("structure")}`);
  }
  let match = path.match(/^\/datastructures\/([^/]+)\/versions$/);
  if (method === "POST" && match) {
    return created(`${path}/${nextId("version")}`);
  }
  if (
    method === "POST" &&
    /^\/datastructures\/[^/]+(\/versions\/[^/]+)?\/(release|unrelease)$/.test(path)
  ) {
    return ok();
  }
  if (method === "DELETE" && /^\/datastructures\/[^/]+$/.test(path)) {
    return noContent();
  }

  // ── Datasources ──────────────────────────────────────────────────────────────
  if (method === "POST" && path === "/datasources") {
    return created(`/v1/datasources/${nextId("source")}`);
  }
  if (method === "POST" && /^\/datasources\/[^/]+\/(release|unrelease)$/.test(path)) {
    return ok();
  }
  if (method === "DELETE" && /^\/datasources\/[^/]+$/.test(path)) {
    return noContent();
  }

  // ── Datasets (the stateful part: lifecycle + saga) ───────────────────────────
  if (method === "POST" && path === "/datasets") {
    const id = nextId("dataset");
    datasets.set(id, { status: "DRAFT", pendingSagaType: null, sagaEndsAt: 0, hasFlow: false });
    return created(`/v1/datasets/${id}`);
  }

  match = path.match(/^\/datasets\/([^/]+)(\/.*)?$/);
  if (match) {
    const id = match[1];
    const rest = match[2] ?? "";
    const dataset = datasets.get(id);

    if (method === "POST" && rest === "/datasinks") {
      if (!dataset) return notFound();
      return created(`/v1/datasets/${id}/datasinks/${nextId("sink")}`);
    }
    if (method === "POST" && rest === "/pipelines") {
      if (!dataset) return notFound();
      dataset.hasFlow = payloadHasFlow(readBody(init));
      return created(`/v1/datasets/${id}/pipelines/${nextId("pipeline")}`);
    }
    if (method === "DELETE" && /^\/(pipelines|datasinks)\/[^/]+$/.test(rest)) {
      return dataset ? noContent() : notFound();
    }

    if (dataset) settle(dataset);

    if (method === "GET" && rest === "") {
      if (!dataset) return notFound();
      return json(200, { id, dataSetStatus: dataset.status, pendingSagaType: dataset.pendingSagaType });
    }
    if (method === "POST" && rest === "/stage") {
      if (!dataset) return notFound();
      if (dataset.status !== "DRAFT") return badRequest(`stage requires DRAFT, dataset is ${dataset.status}`);
      dataset.status = "READY";
      return ok();
    }
    if (method === "POST" && rest === "/unstage") {
      if (!dataset) return notFound();
      if (dataset.status !== "READY") return badRequest(`unstage requires READY, dataset is ${dataset.status}`);
      dataset.status = "DRAFT";
      return ok();
    }
    if (method === "POST" && rest === "/release") {
      if (!dataset) return notFound();
      if (dataset.pendingSagaType !== null) return conflict("a saga is already in flight");
      if (dataset.status !== "READY") return badRequest(`release requires READY, dataset is ${dataset.status}`);
      // Optimistic AVAILABLE while the CREATE saga runs — the poll must not trust it.
      dataset.status = "AVAILABLE";
      dataset.pendingSagaType = "CREATE";
      dataset.sagaEndsAt = Date.now() + sagaMs();
      return json(202, {});
    }
    if (method === "POST" && rest === "/unrelease") {
      if (!dataset) return notFound();
      if (dataset.pendingSagaType !== null) return conflict("a saga is already in flight");
      if (dataset.status !== "AVAILABLE") return badRequest(`unrelease requires AVAILABLE, dataset is ${dataset.status}`);
      dataset.pendingSagaType = "DELETE";
      dataset.sagaEndsAt = Date.now() + sagaMs();
      return ok();
    }
    if (method === "DELETE" && rest === "") {
      if (!dataset) return notFound();
      if (dataset.status !== "DRAFT") return conflict(`delete requires DRAFT, dataset is ${dataset.status}`);
      datasets.delete(id);
      return noContent();
    }
  }

  return json(404, { error: `mock portal-backend has no route for ${method} ${path}` });
};
