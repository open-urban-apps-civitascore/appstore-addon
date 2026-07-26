import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDryRunPlan } from "@/lib/dry-run";
import { installOptionsSchema } from "@/types/install-options";
import { useCaseSchema, type UseCase } from "@/types/use-cases";

function useCase(overrides: Partial<UseCase> = {}): UseCase {
  return useCaseSchema.parse({
    id: "test-case",
    title: "Test Case",
    summary: "s",
    description: "d",
    publisher: "Teststadt",
    maturity: "prototype",
    installability: "direct",
    compatibility: ["2.1"],
    includedArtifacts: [
      { id: "urn:a", title: "TestStructure", kind: "datastructure" },
      { id: "urn:b", title: "TestDataset", kind: "dataset" },
    ],
    modelForge: { datasetId: "urn:core:platform:civitas:dataset:common:Test:1.0.0" },
    source: { repoUrl: "https://example.org/repo", gitIdentifier: "v1.0.0" },
    ...overrides,
  });
}

test("lists the declared artifacts plus the chosen demo data source", () => {
  const plan = buildDryRunPlan(useCase(), installOptionsSchema.parse({}));

  assert.equal(plan.creates.length, 3);
  assert.equal(plan.creates.at(-1)?.label, "Demo-Datenquelle");
  assert.equal(plan.targetStatus, "AVAILABLE");
});

test("staging stops at READY", () => {
  const plan = buildDryRunPlan(useCase(), installOptionsSchema.parse({ goLive: "stage" }));
  assert.equal(plan.targetStatus, "READY");
});

test("'later' stops at DRAFT regardless of the go-live axis and adds no data source", () => {
  const plan = buildDryRunPlan(
    useCase(),
    installOptionsSchema.parse({ dataSource: { mode: "later" }, goLive: "release" }),
  );

  assert.equal(plan.targetStatus, "DRAFT");
  assert.ok(!plan.creates.some((entry) => entry.kind === "Data Source"));
});

test("own broker is named in the plan, and the credential promise is stated", () => {
  const plan = buildDryRunPlan(
    useCase(),
    installOptionsSchema.parse({
      dataSource: { mode: "own", config: { url: "tcp://broker.test:1883", topic: "t" } },
    }),
  );

  assert.match(plan.creates.at(-1)?.detail ?? "", /tcp:\/\/broker\.test:1883/);
  assert.ok(plan.untouched.some((statement) => /Zugangsdaten/.test(statement)));
});

test("declared roles appear as things that would be created", () => {
  const plan = buildDryRunPlan(
    useCase({
      roles: [{ key: "r", label: "Datenpflege", description: "d", permissions: ["DATASET_UPDATE"] }],
    }),
    installOptionsSchema.parse({}),
  );

  assert.ok(plan.creates.some((entry) => entry.kind === "Rolle" && entry.label === "Datenpflege"));
});

test("blank answers are dropped, real ones are echoed", () => {
  const plan = buildDryRunPlan(
    useCase(),
    installOptionsSchema.parse({ answers: { Frage: "Antwort", Leer: "   " } }),
  );

  assert.deepEqual(plan.answers, [{ question: "Frage", answer: "Antwort" }]);
});
