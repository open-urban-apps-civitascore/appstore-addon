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
 * Dev / prototype header provider. Returns the gateway headers the backend
 * expects with configured or placeholder values — it does NOT perform a real
 * Keycloak login. It stands in for the gateway during local development where the
 * marketplace talks to the portal-backend directly.
 *
 * TODO(auth): Replace with a provider that (1) takes the logged-in user's Keycloak
 * access token (already available on the NextAuth session as `id_token`, see
 * `auth.ts`) and forwards it as a bearer token, and (2) lets APISIX + OPA derive
 * `X-Allowed-Scope-Ids` from that token instead of a static/placeholder value.
 * Talking to the backend directly (bypassing the gateway) is only acceptable in
 * dev.
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

/**
 * Build the auth header provider from environment configuration. Today this is
 * always the dev stub; production wiring (real Keycloak token) is the TODO above.
 *
 * Env:
 *   - PORTAL_BACKEND_ALLOWED_SCOPE_IDS — value for `X-Allowed-Scope-Ids`.
 *   - PORTAL_BACKEND_BEARER_TOKEN      — optional dev bearer token.
 */
export function createAuthHeaderProvider(): PortalBackendAuthHeaderProvider {
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
