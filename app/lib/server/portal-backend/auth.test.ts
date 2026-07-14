import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAuthHeaderProvider, KeycloakPasswordGrantAuthProvider } from "@/lib/server/portal-backend/auth";

function mockKeycloak(responses: Array<{ access_token: string; expires_in: number }>) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: new URLSearchParams(String(init?.body)) });
    const payload = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe("KeycloakPasswordGrantAuthProvider", () => {
  test("mints a token via the password grant and sends all three headers", async () => {
    const { calls, fetchImpl } = mockKeycloak([{ access_token: "tok-1", expires_in: 300 }]);
    const provider = new KeycloakPasswordGrantAuthProvider({
      keycloakUrl: "http://keycloak.local:8080",
      realm: "civitas-core",
      clientId: "admin-cli",
      username: "dev@civitas.local",
      password: "dev123",
      fetchImpl,
    });

    const headers = await provider.getAuthHeaders();

    assert.equal(headers.Authorization, "Bearer tok-1");
    assert.equal(headers["X-Api-Request"], "true");
    assert.equal(headers["X-Allowed-Scope-Ids"], "*");

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://keycloak.local:8080/realms/civitas-core/protocol/openid-connect/token",
    );
    assert.equal(calls[0].body.get("grant_type"), "password");
    assert.equal(calls[0].body.get("client_id"), "admin-cli");
    assert.equal(calls[0].body.get("username"), "dev@civitas.local");
  });

  test("caches the token across calls and re-mints only after expiry", async () => {
    const { calls, fetchImpl } = mockKeycloak([
      // expires_in 0 → with the 30 s safety margin the cache floor (5 s) applies,
      // so the second immediate call still reuses it; the third call after the
      // floor would re-mint. We test the reuse behaviour here.
      { access_token: "tok-1", expires_in: 300 },
      { access_token: "tok-2", expires_in: 300 },
    ]);
    const provider = new KeycloakPasswordGrantAuthProvider({
      keycloakUrl: "http://keycloak.local:8080",
      realm: "civitas-core",
      clientId: "admin-cli",
      username: "dev@civitas.local",
      password: "dev123",
      fetchImpl,
    });

    const first = await provider.getAuthHeaders();
    const second = await provider.getAuthHeaders();

    assert.equal(first.Authorization, "Bearer tok-1");
    assert.equal(second.Authorization, "Bearer tok-1", "cached — no second mint");
    assert.equal(calls.length, 1);
  });
});

describe("createAuthHeaderProvider", () => {
  const KEYCLOAK_VARS = [
    "PORTAL_BACKEND_KEYCLOAK_URL",
    "PORTAL_BACKEND_KEYCLOAK_USERNAME",
    "PORTAL_BACKEND_KEYCLOAK_PASSWORD",
  ] as const;

  function withEnv(env: Partial<Record<(typeof KEYCLOAK_VARS)[number], string>>, run: () => void) {
    const saved = KEYCLOAK_VARS.map((name) => [name, process.env[name]] as const);
    for (const name of KEYCLOAK_VARS) delete process.env[name];
    Object.assign(process.env, env);
    try {
      run();
    } finally {
      for (const [name, value] of saved) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  }

  test("fails loudly on a PARTIAL Keycloak configuration instead of silently degrading", () => {
    withEnv({ PORTAL_BACKEND_KEYCLOAK_URL: "http://localhost:8080" }, () => {
      assert.throws(
        () => createAuthHeaderProvider(),
        /missing PORTAL_BACKEND_KEYCLOAK_USERNAME, PORTAL_BACKEND_KEYCLOAK_PASSWORD/,
      );
    });
  });

  test("uses the Keycloak provider when fully configured, the stub when fully unset", () => {
    withEnv(
      {
        PORTAL_BACKEND_KEYCLOAK_URL: "http://localhost:8080",
        PORTAL_BACKEND_KEYCLOAK_USERNAME: "dev@civitas.local",
        PORTAL_BACKEND_KEYCLOAK_PASSWORD: "dev123",
      },
      () => {
        assert.ok(createAuthHeaderProvider() instanceof KeycloakPasswordGrantAuthProvider);
      },
    );
    withEnv({}, () => {
      assert.ok(!(createAuthHeaderProvider() instanceof KeycloakPasswordGrantAuthProvider));
    });
  });
});
