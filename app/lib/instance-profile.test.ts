import assert from "node:assert/strict";
import { test } from "node:test";

import { checkFit, type InstanceProfile } from "@/lib/instance-profile";
import { useCaseSchema, type UseCase } from "@/types/use-cases";

const PROFILE: InstanceProfile = {
  tenantName: "Teststadt",
  coreVersion: "2.1",
  components: ["PORTAL_BACKEND", "FROST", "NIFI"],
  connectors: ["MQTT"],
};

function useCase(overrides: Partial<UseCase> = {}): UseCase {
  return useCaseSchema.parse({
    id: "test-case",
    title: "Test Case",
    summary: "s",
    description: "d",
    publisher: "Teststadt",
    curationTier: "experimental",
    installPath: "portal",
    compatibility: ["2.1"],
    modelForge: { datasetId: "urn:core:platform:civitas:dataset:common:Test:1.0.0" },
    source: { repoUrl: "https://example.org/repo", gitIdentifier: "v1.0.0" },
    ...overrides,
  });
}

test("fits when every declared requirement is present", () => {
  const result = checkFit(
    useCase({
      requirements: { coreVersions: ["2.1"], components: ["FROST"], connectors: ["MQTT"] },
    }),
    PROFILE,
  );

  assert.equal(result.fits, true);
  assert.ok(result.rows.every((row) => row.status === "ok"));
});

test("reports a missing component without failing the whole check silently", () => {
  const result = checkFit(
    useCase({
      requirements: { coreVersions: ["2.1"], components: ["FROST", "SUPERSET"], connectors: [] },
    }),
    PROFILE,
  );

  assert.equal(result.fits, false);
  const superset = result.rows.find((row) => row.label === "SUPERSET");
  assert.equal(superset?.status, "missing");
  // The rows that *are* satisfied must still say so — a red panel that hides the
  // greens tells the user nothing about what to fix.
  assert.equal(result.rows.find((row) => row.label === "FROST")?.status, "ok");
});

test("reports an unsupported core version", () => {
  const result = checkFit(
    useCase({ requirements: { coreVersions: ["1.9"], components: [], connectors: [] } }),
    PROFILE,
  );

  assert.equal(result.fits, false);
  assert.equal(result.rows[0]?.status, "missing");
});

test("falls back to legacy compatibility and requiredCapabilities", () => {
  // Entries from the published catalog carry no `requirements` block — they must
  // still get a real check rather than an empty panel.
  const result = checkFit(
    useCase({ compatibility: ["2.1"], requiredCapabilities: ["FROST"] as never }),
    PROFILE,
  );

  assert.equal(result.fits, true);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1]?.label, "FROST");
});

test("addon and plugin blocks join the checklist as honest unknowns", () => {
  const result = checkFit(
    useCase({
      requirements: { coreVersions: ["2.1"], components: ["FROST"], connectors: [] },
      requiredCapabilities: [{ kind: "addon", name: "Grafana" }],
    }),
    PROFILE,
  );

  const grafana = result.rows.find((row) => row.label === "Grafana");
  assert.equal(grafana?.status, "unknown");
  // Not checkable is not the same as missing — the fit verdict stays positive.
  assert.equal(result.fits, true);
});

test("missing connector is reported", () => {
  const result = checkFit(
    useCase({ requirements: { coreVersions: ["2.1"], components: [], connectors: ["SQL"] } }),
    PROFILE,
  );

  assert.equal(result.fits, false);
  assert.match(result.rows[1]?.label ?? "", /SQL/);
});
