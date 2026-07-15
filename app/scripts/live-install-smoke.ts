/**
 * Live smoke test: drive a REAL install + uninstall through the marketplace's own
 * portal-backend code path (orchestrator → mapper → client → Keycloak auth)
 * against a locally running CivitasCore v2 dev stack.
 *
 * Run:  npx tsx scripts/live-install-smoke.ts
 * Needs the dev stack up (start-portal-dev.sh) with the default local ports.
 * Leaves the backend clean: everything the install creates is uninstalled again.
 *
 * Expected outcome: the BUNDLE below ships a real flow graph (Start → dataSource →
 * frost sink → End), so the release saga provisions fully → final status AVAILABLE.
 * (A bundle without a pipeline model sends an empty graph → NiFi rejects it →
 * compensated to READY.)
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { UseCaseBundle } from "@/lib/server/bundle";
import { FileInstallStore } from "@/lib/server/install-store";
import { KeycloakPasswordGrantAuthProvider } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import { installUseCase, uninstallUseCase, type InstallDeps } from "@/lib/server/portal-backend/install";
import type { UseCase } from "@/types/use-cases";

const BASE_URL = process.env.PORTAL_BACKEND_BASE_URL ?? "http://localhost:8089/v1";
const KEYCLOAK_URL = process.env.PORTAL_BACKEND_KEYCLOAK_URL ?? "http://localhost:8080";

const DS_REF = "urn:core:platform:civitas:datastructure:demo:SmokeTreeRecord:1.0.0";

const USE_CASE: UseCase = {
  id: "live-smoke-baumkataster",
  title: "Live Smoke Baumkataster",
  summary: "Smoke-test use case.",
  description: "Created by scripts/live-install-smoke.ts — safe to delete.",
  publisher: "Marketplace Smoke Test",
  categories: [],
  maturity: "prototype",
  installability: "experimental",
  compatibility: ["core-v2"],
  requiredCapabilities: [],
  installQuestions: [],
  includedArtifacts: [],
  modelForge: { datasetId: "urn:core:platform:civitas:dataset:demo:LiveSmoke:1.0.0" },
  source: { repoUrl: "https://gitlab.com/example/unused", gitIdentifier: "v1.0.0" },
};

const BUNDLE: UseCaseBundle = {
  dataset: {
    id: USE_CASE.modelForge.datasetId,
    title: "Live Smoke Baumkataster",
    description: "Smoke-test dataset created through the marketplace code path.",
    version: "1.0.0",
    dataStructureRefs: [DS_REF],
  },
  elements: [
    {
      ref: DS_REF,
      schema: {
        $id: DS_REF,
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "SmokeTreeRecord",
        type: "object",
        properties: { id: { type: "string" }, species: { type: "string" } },
      },
    },
  ],
  source: USE_CASE.source,
  // A real flow graph (Start → dataSource → frost sink → End). The datasource/sink
  // node entityIds (null here) are re-bound to the created ids at install time.
  pipeline: {
    nodes: [
      { id: "n-start", type: "start", data: { label: "Start" }, position: { x: 80, y: 160 } },
      {
        id: "n-src",
        type: "dataSource",
        data: { label: "DataSource", entityId: null, entityType: "datasource" },
        position: { x: 160, y: 160 },
      },
      {
        id: "n-sink",
        type: "frost",
        data: { label: "Sensor Data Storage", entityId: null, entityType: "frost" },
        position: { x: 480, y: 160 },
      },
      { id: "n-end", type: "end", data: { label: "End" }, position: { x: 780, y: 160 } },
    ],
    edges: [
      { id: "e1", source: "n-start", target: "n-src", type: "smoothstep" },
      { id: "e2", source: "n-src", target: "n-sink", type: "smoothstep" },
      { id: "e3", source: "n-sink", target: "n-end", type: "smoothstep" },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
};

async function main(): Promise<void> {
  const deps: InstallDeps = {
    client: new PortalBackendClient({
      baseUrl: BASE_URL,
      authProvider: new KeycloakPasswordGrantAuthProvider({
        keycloakUrl: KEYCLOAK_URL,
        realm: process.env.PORTAL_BACKEND_KEYCLOAK_REALM ?? "civitas-core",
        clientId: process.env.PORTAL_BACKEND_KEYCLOAK_CLIENT_ID ?? "admin-cli",
        username: process.env.PORTAL_BACKEND_KEYCLOAK_USERNAME ?? "dev@civitas.local",
        password: process.env.PORTAL_BACKEND_KEYCLOAK_PASSWORD ?? "dev123",
      }),
    }),
    store: new FileInstallStore(join(mkdtempSync(join(tmpdir(), "mp-smoke-")), "installs.json")),
    fetchBundle: async () => BUNDLE,
    now: () => new Date(),
  };

  console.log(`Installing '${USE_CASE.id}' via ${BASE_URL} …`);
  const { record, created } = await installUseCase(USE_CASE, deps);

  console.log(`\ncreated=${created}  datasetId=${record.id}  finalStatus=${record.status}`);
  console.log("provisioning trace:");
  for (const step of record.provisioningTrace?.steps ?? []) {
    console.log(`  ${String(step.status).padStart(3)}  ${step.method.padEnd(6)} ${step.path}  — ${step.label}`);
  }
  console.log("provisioned resources:", JSON.stringify(record.provisionedResources, null, 2));

  console.log("\nUninstalling again (bottom-up cascade) …");
  const removed = await uninstallUseCase(USE_CASE.id, deps);
  console.log(`uninstalled=${removed}`);

  const gone = await deps.client.getDataset(record.id);
  console.log(`dataset gone from backend: ${gone === null}`);
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error);
  process.exit(1);
});
