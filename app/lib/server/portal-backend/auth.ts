import { PortalBackendError } from "@/lib/server/portal-backend/errors";

/**
 * Pluggable auth / header provider for the portal-backend.
 *
 * The portal-backend's data-entity endpoints (`/datastructures`, `/datasources`,
 * `/datasets`, …) are normally reached *through* the APISIX gateway, which — after
 * a Keycloak login and an OPA policy decision — injects two headers the backend
 * trusts:
 *
 *   - `X-Allowed-Scope-Ids`: the scope ids the caller is authorized to act within.
 *   - `X-Api-Request: true`: marks the call as a first-party API request.
 *
 * This interface abstracts *where those headers come from* so the marketplace can
 * run in two modes without the client caring:
 *
 *   - dev / prototype: a stub that returns configured or placeholder headers.
 *   - production (TODO): mint a Keycloak access token for the logged-in user and
 *     let the real APISIX + OPA flow derive the scope ids — see the TODO below.
 */
export interface PortalBackendAuthHeaderProvider {
  /**
   * Headers to attach to every portal-backend request. Async because a real
   * implementation will fetch/refresh a Keycloak token here.
   */
  getAuthHeaders(): Promise<Record<string, string>>;
}

/** The `X-Allowed-Scope-Ids` value used when none is configured (dev only). */
export const PLACEHOLDER_ALLOWED_SCOPE_IDS = "*";

export interface StubAuthHeaderProviderOptions {
  /** Value for `X-Allowed-Scope-Ids`. Defaults to {@link PLACEHOLDER_ALLOWED_SCOPE_IDS}. */
  allowedScopeIds?: string;
  /** Optional bearer token to send as `Authorization: Bearer …` (dev convenience). */
  bearerToken?: string;
}

/**
 * Static header provider (tests / manual token). Returns the gateway headers the
 * backend expects with configured or placeholder values — it does NOT perform a
 * Keycloak login. NOTE (verified 2026-07-14): the portal-backend is an OAuth2
 * resource server, so without a valid bearer token these headers alone yield 401
 * — use {@link KeycloakPasswordGrantAuthProvider} (or a static
 * `PORTAL_BACKEND_BEARER_TOKEN`) against a real backend.
 */
export class StubAuthHeaderProvider implements PortalBackendAuthHeaderProvider {
  constructor(private readonly options: StubAuthHeaderProviderOptions = {}) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "X-Api-Request": "true",
      "X-Allowed-Scope-Ids":
        this.options.allowedScopeIds?.trim() || PLACEHOLDER_ALLOWED_SCOPE_IDS,
    };
    const token = this.options.bearerToken?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }
}

// ── Keycloak password-grant provider (dev) ───────────────────────────────────────

export interface KeycloakPasswordGrantOptions {
  /** Keycloak base URL, e.g. `http://localhost:8080`. */
  keycloakUrl: string;
  /** Realm the portal-backend trusts as issuer (local dev: `civitas-core`). */
  realm: string;
  /** A public client with Direct Access Grants enabled (local dev: `admin-cli`). */
  clientId: string;
  username: string;
  password: string;
  /** Value for `X-Allowed-Scope-Ids`. Defaults to {@link PLACEHOLDER_ALLOWED_SCOPE_IDS}. */
  allowedScopeIds?: string;
  fetchImpl?: typeof fetch;
}

/** Refresh this many ms before the token actually expires. */
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

/**
 * Mints a real Keycloak access token via the OAuth2 password grant and caches it
 * until shortly before expiry (local tokens live ~5 min). Verified against the
 * local stack 2026-07-14: the portal-backend is an OAuth2 resource server — the
 * gateway headers alone yield 401; bearer + `X-Allowed-Scope-Ids` +
 * `X-Api-Request` yield 200.
 *
 * DEV ONLY: the password grant with a static dev user stands in for the real
 * flow. TODO(auth): in production, forward the logged-in marketplace user's own
 * Keycloak token (NextAuth session) and go through APISIX so OPA derives the
 * scope ids.
 */
export class KeycloakPasswordGrantAuthProvider implements PortalBackendAuthHeaderProvider {
  private cached: { token: string; expiresAt: number } | null = null;

  constructor(private readonly options: KeycloakPasswordGrantOptions) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      "X-Api-Request": "true",
      "X-Allowed-Scope-Ids":
        this.options.allowedScopeIds?.trim() || PLACEHOLDER_ALLOWED_SCOPE_IDS,
      Authorization: `Bearer ${await this.getToken()}`,
    };
  }

  private async getToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt) {
      return this.cached.token;
    }

    const { keycloakUrl, realm, clientId, username, password } = this.options;
    const tokenUrl = `${keycloakUrl.replace(/\/+$/, "")}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;
    const fetchImpl = this.options.fetchImpl ?? fetch;

    const response = await fetchImpl(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        username,
        password,
        scope: "openid",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }).catch((error) => {
      throw new PortalBackendError(
        `Keycloak token request failed: ${error instanceof Error ? error.message : tokenUrl}`,
        502,
      );
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new PortalBackendError(
        `Keycloak rejected the token request (${response.status})${text ? `: ${text}` : ""}`,
        502,
      );
    }

    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== "string" || !body.access_token) {
      throw new PortalBackendError("Keycloak token response carried no access_token.", 502);
    }
    const expiresInMs = (typeof body.expires_in === "number" ? body.expires_in : 300) * 1000;
    this.cached = {
      token: body.access_token,
      expiresAt: Date.now() + Math.max(expiresInMs - TOKEN_EXPIRY_MARGIN_MS, 5_000),
    };
    return this.cached.token;
  }
}

/**
 * Build the auth header provider from environment configuration.
 *
 * Keycloak password grant (preferred — the backend requires a real JWT) when the
 * credentials are configured:
 *   - PORTAL_BACKEND_KEYCLOAK_URL       — e.g. http://localhost:8080
 *   - PORTAL_BACKEND_KEYCLOAK_REALM     — default `civitas-core`
 *   - PORTAL_BACKEND_KEYCLOAK_CLIENT_ID — default `admin-cli`
 *   - PORTAL_BACKEND_KEYCLOAK_USERNAME / PORTAL_BACKEND_KEYCLOAK_PASSWORD
 *
 * Otherwise the stub (static headers / optional static token):
 *   - PORTAL_BACKEND_ALLOWED_SCOPE_IDS — value for `X-Allowed-Scope-Ids`.
 *   - PORTAL_BACKEND_BEARER_TOKEN      — optional static dev bearer token.
 */
export function createAuthHeaderProvider(): PortalBackendAuthHeaderProvider {
  const keycloakUrl = process.env.PORTAL_BACKEND_KEYCLOAK_URL?.trim();
  const username = process.env.PORTAL_BACKEND_KEYCLOAK_USERNAME?.trim();
  const password = process.env.PORTAL_BACKEND_KEYCLOAK_PASSWORD?.trim();

  if (keycloakUrl && username && password) {
    return new KeycloakPasswordGrantAuthProvider({
      keycloakUrl,
      realm: process.env.PORTAL_BACKEND_KEYCLOAK_REALM?.trim() || "civitas-core",
      clientId: process.env.PORTAL_BACKEND_KEYCLOAK_CLIENT_ID?.trim() || "admin-cli",
      username,
      password,
      allowedScopeIds: process.env.PORTAL_BACKEND_ALLOWED_SCOPE_IDS,
    });
  }

  return new StubAuthHeaderProvider({
    allowedScopeIds: process.env.PORTAL_BACKEND_ALLOWED_SCOPE_IDS,
    bearerToken: process.env.PORTAL_BACKEND_BEARER_TOKEN,
  });
}

/** Read a required portal-backend env var or fail with a 503 (service not configured). */
export function requiredPortalBackendEnv(name: "PORTAL_BACKEND_BASE_URL"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new PortalBackendError(`Missing required environment variable ${name}.`, 503);
  }
  return value;
}
