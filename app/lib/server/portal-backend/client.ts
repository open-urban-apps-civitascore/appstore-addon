import { PortalBackendError } from "@/lib/server/portal-backend/errors";
import type { PortalBackendAuthHeaderProvider } from "@/lib/server/portal-backend/auth";

/**
 * HTTP client for the CivitasCore portal-backend REST API.
 *
 * This is the ONE place that knows the portal-backend's *endpoints*, their
 * ordering-relevant semantics, and the transport rules of the contract:
 *
 *   - resources are created with `POST` → `201 Created` + a `Location` header
 *     pointing at the new resource (its id is the last path segment);
 *   - the dataset `release` is asynchronous — `202 Accepted` kicks off the
 *     provisioning saga, and `409 Conflict` means a saga is already in flight;
 *   - every data-entity request carries the gateway auth headers
 *     (`X-Allowed-Scope-Ids`, `X-Api-Request`, …) from the {@link PortalBackendAuthHeaderProvider}.
 *
 * It deliberately knows nothing about *payload field names* — those live in the
 * mapper. Bodies are passed through as opaque objects.
 */

const DEFAULT_TIMEOUT_MS = 5000;

export interface PortalBackendClientOptions {
  /** Base URL of the portal-backend (no trailing slash needed). */
  baseUrl: string;
  authProvider: PortalBackendAuthHeaderProvider;
  /** Injectable fetch, for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Outcome of the asynchronous dataset `release` (the provisioning trigger). */
export type ReleaseOutcome =
  /** `202 Accepted` — the provisioning saga has been started. */
  | { kind: "accepted"; status: number }
  /** `409 Conflict` — a saga is already in flight for this dataset (idempotent). */
  | { kind: "in-flight"; status: number };

/** A resource created via `POST` (id parsed from the `Location` header). */
export interface CreatedResource {
  id: string;
  location: string | null;
  status: number;
  body: unknown;
}

export class PortalBackendClient {
  private readonly baseUrl: string;
  private readonly authProvider: PortalBackendAuthHeaderProvider;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: PortalBackendClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.authProvider = options.authProvider;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Transport ────────────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const authHeaders = await this.authProvider.getAuthHeaders();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...authHeaders,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(this.timeoutMs),
    }).catch((error) => {
      throw new PortalBackendError(
        error instanceof Error
          ? `Portal-backend request failed: ${error.message}`
          : "Portal-backend request failed.",
        502,
      );
    });

    if (response.status === 401 || response.status === 403) {
      throw new PortalBackendError(
        "Portal-backend rejected the marketplace credentials (check the auth header provider / scope ids).",
        502,
      );
    }
    return response;
  }

  private async readBody(response: Response): Promise<unknown> {
    return response.json().catch(() => ({}));
  }

  /** Build an error message from a failed response, reading its body at most once. */
  private async responseError(response: Response, prefix: string): Promise<PortalBackendError> {
    const text = await response.text().catch(() => "");
    return new PortalBackendError(
      `${prefix} → ${response.status}${text ? `: ${text}` : ""}`,
      502,
    );
  }

  /** POST that creates a resource; returns the created id parsed from `Location`. */
  private async postResource(
    path: string,
    body: unknown,
    label: string,
  ): Promise<CreatedResource> {
    const response = await this.request("POST", path, body);
    if (!response.ok) {
      throw await this.responseError(response, `Portal-backend POST ${path} (${label})`);
    }
    const parsedBody = await this.readBody(response);
    const location = response.headers.get("location");
    const id = resourceIdFrom(location, parsedBody);
    if (!id) {
      throw new PortalBackendError(
        `Portal-backend POST ${path} (${label}) returned no Location header or id to identify the created resource.`,
        502,
      );
    }
    return { id, location, status: response.status, body: parsedBody };
  }

  /**
   * POST a lifecycle transition that is expected to succeed (stage / unrelease /
   * version release). Returns the response status (for the provisioning trace).
   */
  private async postTransition(path: string, label: string): Promise<number> {
    const response = await this.request("POST", path);
    if (!response.ok) {
      throw await this.responseError(response, `Portal-backend POST ${path} (${label})`);
    }
    return response.status;
  }

  // ── Datastructures (+ versioned schemas) ─────────────────────────────────────

  /** `POST /datastructures`. */
  async createDatastructure(payload: unknown): Promise<CreatedResource> {
    return this.postResource("/datastructures", payload, "datastructure");
  }

  /** `POST /datastructures/{id}/versions`. */
  async createDatastructureVersion(datastructureId: string, payload: unknown): Promise<CreatedResource> {
    return this.postResource(
      `/datastructures/${encodeURIComponent(datastructureId)}/versions`,
      payload,
      "datastructure-version",
    );
  }

  /** `POST /datastructures/{id}/versions/{versionId}/release` → status. */
  async releaseDatastructureVersion(datastructureId: string, versionId: string): Promise<number> {
    return this.postTransition(
      `/datastructures/${encodeURIComponent(datastructureId)}/versions/${encodeURIComponent(versionId)}/release`,
      "datastructure-version-release",
    );
  }

  /**
   * `POST /datastructures/{id}/release` → status. Required before a DataSource may
   * link one of its versions (the backend rejects links to non-AVAILABLE parents).
   */
  async releaseDatastructure(datastructureId: string): Promise<number> {
    return this.postTransition(
      `/datastructures/${encodeURIComponent(datastructureId)}/release`,
      "datastructure-release",
    );
  }

  /** `POST /datastructures/{id}/unrelease` → status (needed before delete). */
  async unreleaseDatastructure(datastructureId: string): Promise<number> {
    return this.postTransition(
      `/datastructures/${encodeURIComponent(datastructureId)}/unrelease`,
      "datastructure-unrelease",
    );
  }

  /** `DELETE /datastructures/{id}`. 404 is treated as success. */
  async deleteDatastructure(datastructureId: string): Promise<void> {
    await this.deleteResource(
      `/datastructures/${encodeURIComponent(datastructureId)}`,
      "datastructure",
    );
  }

  // ── Datasources ──────────────────────────────────────────────────────────────

  /** `POST /datasources`. */
  async createDatasource(payload: unknown): Promise<CreatedResource> {
    return this.postResource("/datasources", payload, "datasource");
  }

  /**
   * `POST /datasources/{id}/release` → status. Required before a Pipeline may link
   * this datasource.
   */
  async releaseDatasource(datasourceId: string): Promise<number> {
    return this.postTransition(
      `/datasources/${encodeURIComponent(datasourceId)}/release`,
      "datasource-release",
    );
  }

  /** `POST /datasources/{id}/unrelease` → status (needed before delete). */
  async unreleaseDatasource(datasourceId: string): Promise<number> {
    return this.postTransition(
      `/datasources/${encodeURIComponent(datasourceId)}/unrelease`,
      "datasource-unrelease",
    );
  }

  /** `DELETE /datasources/{id}`. 404 is treated as success. */
  async deleteDatasource(datasourceId: string): Promise<void> {
    await this.deleteResource(`/datasources/${encodeURIComponent(datasourceId)}`, "datasource");
  }

  // ── Datasets (the aggregate root of a use case) ──────────────────────────────

  /** `POST /datasets` (created in DRAFT). */
  async createDataset(payload: unknown): Promise<CreatedResource> {
    return this.postResource("/datasets", payload, "dataset");
  }

  /** `POST /datasets/{dataSetId}/pipelines` (nested under the dataset). */
  async createPipeline(dataSetId: string, payload: unknown): Promise<CreatedResource> {
    return this.postResource(
      `/datasets/${encodeURIComponent(dataSetId)}/pipelines`,
      payload,
      "pipeline",
    );
  }

  /** `POST /datasets/{dataSetId}/datasinks` (nested under the dataset). */
  async createDatasink(dataSetId: string, payload: unknown): Promise<CreatedResource> {
    return this.postResource(
      `/datasets/${encodeURIComponent(dataSetId)}/datasinks`,
      payload,
      "datasink",
    );
  }

  // ── Dataset lifecycle (this is what triggers provisioning) ───────────────────

  /** `POST /datasets/{id}/stage` → DRAFT→READY (validates the pipeline config). Returns status. */
  async stageDataset(dataSetId: string): Promise<number> {
    return this.postTransition(`/datasets/${encodeURIComponent(dataSetId)}/stage`, "stage");
  }

  /** `POST /datasets/{id}/unstage` → READY→DRAFT (required before deleting a READY dataset). */
  async unstageDataset(dataSetId: string): Promise<number> {
    return this.postTransition(`/datasets/${encodeURIComponent(dataSetId)}/unstage`, "unstage");
  }

  /**
   * `POST /datasets/{id}/release` → READY→AVAILABLE, asynchronously.
   *
   * Returns `accepted` on `202` (saga started) and `in-flight` on `409` (a saga is
   * already running for this dataset — treated as idempotent by the orchestrator).
   * Any other non-2xx status throws.
   */
  async releaseDataset(dataSetId: string): Promise<ReleaseOutcome> {
    const response = await this.request("POST", `/datasets/${encodeURIComponent(dataSetId)}/release`);
    if (response.status === 409) {
      return { kind: "in-flight", status: response.status };
    }
    if (response.ok) {
      // 202 is the expected happy path; accept any 2xx as "release accepted".
      return { kind: "accepted", status: response.status };
    }
    throw await this.responseError(response, `Portal-backend POST /datasets/${dataSetId}/release`);
  }

  /** `POST /datasets/{id}/unrelease` → AVAILABLE→DRAFT, tears down infrastructure. Returns status. */
  async unreleaseDataset(dataSetId: string): Promise<number> {
    return this.postTransition(`/datasets/${encodeURIComponent(dataSetId)}/unrelease`, "unrelease");
  }

  // ── Reads / deletes ──────────────────────────────────────────────────────────

  /** `GET /datasets/{id}` → parsed body, or `null` on `404`. */
  async getDataset(dataSetId: string): Promise<unknown | null> {
    const response = await this.request("GET", `/datasets/${encodeURIComponent(dataSetId)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new PortalBackendError(
        `Portal-backend GET /datasets/${dataSetId} → ${response.status}`,
        502,
      );
    }
    return this.readBody(response);
  }

  /** `DELETE /datasets/{id}` (a DRAFT dataset can be deleted directly). 404 is treated as success. */
  async deleteDataset(dataSetId: string): Promise<void> {
    await this.deleteResource(`/datasets/${encodeURIComponent(dataSetId)}`, "dataset");
  }

  /** `DELETE /datasets/{dataSetId}/pipelines/{pipelineId}`. 404 is treated as success. */
  async deletePipeline(dataSetId: string, pipelineId: string): Promise<void> {
    await this.deleteResource(
      `/datasets/${encodeURIComponent(dataSetId)}/pipelines/${encodeURIComponent(pipelineId)}`,
      "pipeline",
    );
  }

  /** `DELETE /datasets/{dataSetId}/datasinks/{datasinkId}`. 404 is treated as success. */
  async deleteDatasink(dataSetId: string, datasinkId: string): Promise<void> {
    await this.deleteResource(
      `/datasets/${encodeURIComponent(dataSetId)}/datasinks/${encodeURIComponent(datasinkId)}`,
      "datasink",
    );
  }

  private async deleteResource(path: string, label: string): Promise<void> {
    const response = await this.request("DELETE", path);
    if (!response.ok && response.status !== 404) {
      throw await this.responseError(response, `Portal-backend DELETE ${path} (${label})`);
    }
  }
}

/**
 * Derive a created resource's id: prefer the last path segment of the `Location`
 * header (the REST-canonical source), falling back to a top-level `id` field on
 * the response body.
 */
export function resourceIdFrom(location: string | null, body: unknown): string | null {
  if (location) {
    const segments = location.split("?")[0].split("/").filter(Boolean);
    const last = segments.at(-1);
    if (last) return decodeURIComponent(last);
  }
  if (body && typeof body === "object" && "id" in body) {
    const id = (body as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}
