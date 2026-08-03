/**
 * Live smoke test: drive a REAL install through the marketplace's own code path
 * (catalog → bundle fetch → orchestrator → mapper → client → Keycloak auth →
 * demo data generator) against a locally running CivitasCore v2 dev stack.
 *
 * Run:   npx tsx scripts/live-install-smoke.ts            # install and leave it running
 *        npx tsx scripts/live-install-smoke.ts --cleanup  # uninstall it again
 *
 * Needs, beyond the dev stack:
 *   - the dev catalog served:  python3 -m http.server 8099 --directory ../dev-catalog
 *   - the demo broker up:      civitas-mosquitto on the platform network
 *   - the generator running:   pnpm dev in civitas/demo-data-generator (:4300)
 *   - GEOSERVER'S FIVE SERVICES UP. The dataset saga runs create-workspace and
 *     create-datastore against GeoServer for any PostGIS sink, and a failure
 *     there rolls the whole saga back — including the table it just created.
 *
 * Unlike the earlier version this does NOT uninstall at the end. The point is a
 * pipeline you can then watch filling; `--cleanup` tears it down when you are done.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { fetchUseCaseBundle } from "@/lib/server/bundle";
import { FileInstallStore } from "@/lib/server/install-store";
import { KeycloakPasswordGrantAuthProvider } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import { demoTableName } from "@/lib/server/portal-backend/mapper";
import {
  installUseCase,
  refreshInstalledUseCaseStatus,
  uninstallUseCase,
  type InstallDeps,
} from "@/lib/server/portal-backend/install";
import { HttpSimulatorClient } from "@/lib/server/simulator/client";
import { repoListIndexSchema } from "@/types/repo-list";
import type { UseCase } from "@/types/use-cases";

const BASE_URL = process.env.PORTAL_BACKEND_BASE_URL ?? "http://localhost:8089/v1";
const KEYCLOAK_URL = process.env.PORTAL_BACKEND_KEYCLOAK_URL ?? "http://localhost:8080";
const CATALOG_URL = process.env.REPO_LIST_URL ?? "http://localhost:8099/index.json";
const SIMULATOR_URL = process.env.MARKETPLACE_SIMULATOR_URL ?? "http://localhost:4300";
const USE_CASE_ID = process.env.SMOKE_USE_CASE_ID ?? "hello-trafficcounter";
const STORE_PATH = join(process.cwd(), ".data", "smoke-installs.json");

async function loadUseCase(): Promise<UseCase> {
  const response = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Catalog ${CATALOG_URL} → ${response.status}. Is the dev catalog being served?`);
  }
  const index = repoListIndexSchema.parse(await response.json());
  const useCase = index.useCases.find((entry) => entry.id === USE_CASE_ID);
  if (!useCase) {
    throw new Error(
      `Catalog has no use case '${USE_CASE_ID}'. It carries: ${index.useCases.map((u) => u.id).join(", ")}`,
    );
  }
  return useCase;
}

function makeDeps(): InstallDeps {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  return {
    client: new PortalBackendClient({
      baseUrl: BASE_URL,
      authProvider: new KeycloakPasswordGrantAuthProvider({
        keycloakUrl: KEYCLOAK_URL,
        realm: process.env.PORTAL_BACKEND_KEYCLOAK_REALM ?? "civitas-core",
        // NOT admin-cli — its tokens carry no `sub`, and the backend then denies
        // every body-referenced entity with a misleading 404. See auth.ts.
        clientId: process.env.PORTAL_BACKEND_KEYCLOAK_CLIENT_ID ?? "portal-frontend",
        clientSecret:
          process.env.PORTAL_BACKEND_KEYCLOAK_CLIENT_SECRET ?? "dev-only-portal-frontend-secret",
        username: process.env.PORTAL_BACKEND_KEYCLOAK_USERNAME ?? "dev@civitas.local",
        password: process.env.PORTAL_BACKEND_KEYCLOAK_PASSWORD ?? "dev123",
      }),
      // The saga's own steps are slow; a 5s client timeout trips on the poll.
      timeoutMs: 15_000,
    }),
    store: new FileInstallStore(STORE_PATH),
    fetchBundle: fetchUseCaseBundle,
    simulator: new HttpSimulatorClient({ baseUrl: SIMULATOR_URL }),
    now: () => new Date(),
    // Block until the saga settles: a script wants the terminal outcome, not
    // PROVISIONING (the app opts out and polls instead).
    awaitSaga: true,
    poll: { intervalMs: 2_000, timeoutMs: 180_000 },
  };
}

async function main(): Promise<void> {
  const deps = makeDeps();
  const useCase = await loadUseCase();

  if (process.argv.includes("--cleanup")) {
    console.log(`Uninstalling '${useCase.id}' …`);
    console.log(`uninstalled=${await uninstallUseCase(useCase.id, deps)}`);
    return;
  }

  console.log(`Installing '${useCase.id}' from ${useCase.source?.repoUrl} via ${BASE_URL} …\n`);
  const { record, created } = await installUseCase(useCase, deps);

  console.log(`created=${created}  datasetId=${record.id}  finalStatus=${record.status}\n`);
  console.log("provisioning trace:");
  for (const step of record.provisioningTrace?.steps ?? []) {
    console.log(`  ${String(step.status).padStart(3)}  ${step.method.padEnd(6)} ${step.path}  — ${step.label}`);
  }

  // The app registers demo data from the status poll, not from the install call;
  // running it here exercises the same path a script can observe.
  const settled = await refreshInstalledUseCaseStatus(record, deps);
  console.log(
    `\ndemo data: ${
      settled.simulation
        ? settled.simulation.error
          ? `NOT running — ${settled.simulation.error}`
          : `running on ${settled.simulation.topic}`
        : "none (no scenario, or not a demo install)"
    }`,
  );

  if (settled.status !== "AVAILABLE") {
    console.log(
      "\nThe dataset is not AVAILABLE — the saga compensated. Read the reason with:\n" +
        "  docker logs civitas-config-adapter --tail 120",
    );
    process.exitCode = 2;
    return;
  }

  // The table is not in `public`: its schema is the dataset id, dashes turned into
  // underscores — and prefixed `ds_` when the id starts with a digit, because a
  // bare digit cannot start a Postgres identifier. Roughly half of all UUIDs.
  const underscored = record.id.replace(/-/g, "_");
  const schema = /^\d/.test(underscored) ? `ds_${underscored}` : underscored;
  const table = demoTableName(useCase.id);
  console.log(
    `\nRows land in "${schema}"."${table}". Run this twice — a rising count and a\n` +
      "fresh max timestamp is the whole proof:\n\n" +
      `  docker exec civitas-geoserver-db psql -U geoserver -d geoserver \\\n` +
      `    -c 'select count(*), max("timestamp") from "${schema}"."${table}";'\n\n` +
      `Tear it down again with:  npx tsx scripts/live-install-smoke.ts --cleanup`,
  );
}

main().catch((error) => {
  console.error("SMOKE TEST FAILED:", error);
  process.exit(1);
});
