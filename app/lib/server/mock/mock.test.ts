import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { InMemoryInstallStore } from "@/lib/server/install-store";
import { mockRepoListIndex } from "@/lib/server/mock/fixtures/catalog";
import { mockBundlesByRepoUrl, mockFetchBundle } from "@/lib/server/mock/fixtures/bundles";
import { mockInstalledSeed } from "@/lib/server/mock/installed-seed";
import { mockPortalBackendFetch, resetMockPortalBackend } from "@/lib/server/mock/portal-backend";
import { StubAuthHeaderProvider } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import {
  installUseCase,
  refreshInstalledUseCaseStatus,
  uninstallUseCase,
  type InstallDeps,
} from "@/lib/server/portal-backend/install";
import type { UseCase } from "@/types/use-cases";

/**
 * The mock backend is only trustworthy if the REAL install orchestrator runs its
 * full verified sequence against it — so these tests drive `installUseCase` /
 * `uninstallUseCase` (production code, not test doubles) end-to-end through the
 * mock, and assert the same outcomes the live stack produced on 2026-07-15:
 * pipeline bundle → AVAILABLE, empty-model bundle → compensated READY.
 */

const findUseCase = (id: string): UseCase => {
  const useCase = mockRepoListIndex.useCases.find((entry) => entry.id === id);
  assert.ok(useCase, `fixture catalog is missing use case '${id}'`);
  return useCase;
};

function testDeps(): InstallDeps {
  return {
    client: new PortalBackendClient({
      baseUrl: "http://mock.portal-backend.invalid/v1",
      authProvider: new StubAuthHeaderProvider(),
      fetchImpl: mockPortalBackendFetch,
    }),
    store: new InMemoryInstallStore(),
    fetchBundle: mockFetchBundle,
    now: () => new Date("2026-07-18T12:00:00.000Z"),
    poll: { intervalMs: 5, timeoutMs: 5_000 },
  };
}

describe("mock mode — fixtures", () => {
  test("catalog fixture carries the three use cases and their bundles", () => {
    // The index parsed through the real zod schema at import (else this file
    // would not even load). Assert content + that every use case has a bundle.
    assert.equal(mockRepoListIndex.useCases.length, 3);
    assert.ok(mockRepoListIndex.addons.length > 0, "addons fixture is empty");
    for (const useCase of mockRepoListIndex.useCases) {
      assert.ok(
        mockBundlesByRepoUrl[useCase.source.repoUrl],
        `no bundle fixture for catalog use case '${useCase.id}' (${useCase.source.repoUrl})`,
      );
    }
  });

  test("faithful to 2026-07-18 reality: only the trafficcounter bundle ships a pipeline", () => {
    const withPipeline = Object.values(mockBundlesByRepoUrl).filter((b) => b.pipeline);
    assert.equal(withPipeline.length, 1);
    assert.equal(withPipeline[0].dataset.title, "TrafficCounter Mittelerde");
    const nodes = (withPipeline[0].pipeline as { nodes: { type: string }[] }).nodes;
    assert.deepEqual(
      nodes.map((n) => n.type).sort(),
      ["dataSource", "end", "frost", "start"],
    );
  });

  test("seed records validate and stay clear of mock-minted ids", () => {
    // Parsed through installedUseCaseSchema at import; check the id convention
    // (`seed-…` vs `mock-…`) that keeps them from colliding with live installs.
    assert.equal(mockInstalledSeed.length, 2);
    for (const record of mockInstalledSeed) {
      assert.match(record.id, /^seed-/);
    }
    const statuses = mockInstalledSeed.map((r) => r.status).sort();
    assert.deepEqual(statuses, ["AVAILABLE", "DRAFT"]);
  });

  test("mockFetchBundle rejects unknown repos loudly", async () => {
    await assert.rejects(
      mockFetchBundle({ repoUrl: "https://example.invalid/nope", gitIdentifier: "v1.0.0" }),
      /no bundle fixture/,
    );
  });
});

describe("mock mode — the real orchestrator against the mock backend", () => {
  beforeEach(() => {
    resetMockPortalBackend();
    process.env.MARKETPLACE_MOCK_SAGA_MS = "30";
  });
  afterEach(() => {
    delete process.env.MARKETPLACE_MOCK_SAGA_MS;
  });

  test("pipeline bundle (trafficcounter) installs to AVAILABLE — like the live stack", async () => {
    const deps = testDeps();
    const { record, created } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps);

    assert.equal(created, true);
    assert.equal(record.status, "AVAILABLE");
    assert.match(record.id, /^mock-dataset-/);
    assert.equal(record.provisionedResources?.dataStructures.length, 2);
    assert.ok(record.provisionedResources?.dataSourceId);
    assert.ok(record.provisionedResources?.pipelineId);
    const labels = record.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(labels.includes("saga succeeded (AVAILABLE)"), `trace was: ${labels.join(" | ")}`);
  });

  test("app mode (awaitSaga:false): install returns PROVISIONING; the refresh settles it and completes the trace", async () => {
    const deps: InstallDeps = { ...testDeps(), awaitSaga: false };
    const { record } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps);

    // Returns the moment the saga starts — the UI can show "Wird provisioniert" —
    // and the trace stops at "release (saga started)", no outcome step yet.
    assert.equal(record.status, "PROVISIONING");
    const atInstall = record.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(!atInstall.some((l) => l.startsWith("saga ")), `trace at install: ${atInstall.join(" | ")}`);

    // The 30ms saga settles; the installed view's per-record refresh flips the
    // status AND appends the saga-outcome step the async install left off.
    await new Promise((resolve) => setTimeout(resolve, 60));
    const settled = await refreshInstalledUseCaseStatus(record, deps);
    assert.equal(settled.status, "AVAILABLE");
    const afterSettle = settled.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(
      afterSettle.includes("saga succeeded (AVAILABLE)"),
      `trace after settle: ${afterSettle.join(" | ")}`,
    );
  });

  test("empty-model bundle (feinstaub) compensates to READY — like the live stack", async () => {
    const deps = testDeps();
    const { record } = await installUseCase(findUseCase("mittelerde-feinstaub"), deps);

    assert.equal(record.status, "READY");
    const labels = record.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(
      labels.includes("saga failed — compensated back to READY"),
      `trace was: ${labels.join(" | ")}`,
    );
  });

  test("second install is idempotent (reuses the recorded dataset)", async () => {
    const deps = testDeps();
    const first = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps);
    const second = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps);

    assert.equal(second.created, false);
    assert.equal(second.record.id, first.record.id);
  });

  test("uninstall tears the AVAILABLE install down and the dataset is gone", async () => {
    const deps = testDeps();
    const { record } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps);

    const removed = await uninstallUseCase("mittelerde-trafficcounter", deps);
    assert.equal(removed, true);
    assert.equal(await deps.client.getDataset(record.id), null);
    assert.equal(await deps.store.get("mittelerde-trafficcounter"), null);
  });

  test("fork: stage-for-review stops at READY — dataset release is never called", async () => {
    const deps = testDeps();
    const { record } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps, {
      dataSource: { mode: "demo" },
      goLive: "stage",
      answers: {},
    });

    assert.equal(record.status, "READY");
    const labels = record.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(labels.includes("stage (DRAFT→READY)"), `trace: ${labels.join(" | ")}`);
    // The dataset release ("release (saga started)") and saga steps must be absent —
    // "release datasource"/"release datastructure …" are expected and unaffected.
    assert.ok(!labels.some((l) => l.startsWith("release (")), `trace: ${labels.join(" | ")}`);
    assert.ok(!labels.some((l) => l.startsWith("saga ")), `trace: ${labels.join(" | ")}`);

    // A READY install uninstalls via unstage → delete cascade.
    assert.equal(await uninstallUseCase("mittelerde-trafficcounter", deps), true);
  });

  test("fork: configure-later installs a DRAFT shell — datastructures + dataset only", async () => {
    const deps = testDeps();
    const { record } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps, {
      dataSource: { mode: "later" },
      goLive: "release",
      answers: {},
    });

    assert.equal(record.status, "DRAFT");
    assert.equal(record.provisionedResources?.dataSourceId, undefined);
    assert.equal(record.provisionedResources?.pipelineId, undefined);
    assert.equal(record.provisionedResources?.dataSinkId, undefined);
    assert.equal(record.provisionedResources?.dataStructures.length, 2);

    const labels = record.provisioningTrace?.steps.map((s) => s.label) ?? [];
    assert.ok(labels.includes("dataset (DRAFT — datasource deferred)"), `trace: ${labels.join(" | ")}`);
    assert.ok(
      !labels.some(
        (l) =>
          l.startsWith("datasource") ||
          l === "release datasource" ||
          l.startsWith("datasink") ||
          l.startsWith("pipeline") ||
          l.startsWith("stage"),
      ),
      `trace: ${labels.join(" | ")}`,
    );

    // A DRAFT shell uninstalls directly (no unrelease/unstage needed).
    assert.equal(await uninstallUseCase("mittelerde-trafficcounter", deps), true);
  });

  test("fork: non-empty install answers are persisted on the record", async () => {
    const deps = testDeps();
    const { record } = await installUseCase(findUseCase("mittelerde-trafficcounter"), deps, {
      dataSource: { mode: "demo" },
      goLive: "release",
      answers: {
        "Welche Zählstellen-Standorte sollen initial erfasst werden?": "Marktplatz, Bahnhof",
        "Unbeantwortet": "   ",
      },
    });

    assert.deepEqual(record.installAnswers, {
      "Welche Zählstellen-Standorte sollen initial erfasst werden?": "Marktplatz, Bahnhof",
    });
  });

  test("uninstalling a seeded record works although the mock backend never saw it", async () => {
    const deps = testDeps();
    for (const record of mockInstalledSeed) await deps.store.save(record);

    // The backend answers 404 for seed ids; teardown must treat that as
    // "already gone" and still clear the local record.
    const removed = await uninstallUseCase("mittelerde-trafficcounter", deps);
    assert.equal(removed, true);
    assert.equal(await deps.store.get("mittelerde-trafficcounter"), null);
  });
});
