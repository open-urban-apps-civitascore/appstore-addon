import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CURATION_CHECKS,
  evaluateSubmission,
  getSubmission,
  listSubmissions,
  type Submission,
} from "@/lib/curation";

const BASE: Submission = {
  id: "sub-test",
  title: "Test",
  summary: "Test",
  submittedBy: "Stadt Test",
  submittedAt: "2026-07-25T00:00:00Z",
  repository: "https://example.test/repo",
  gitIdentifier: "v1.0.0",
  artifactCount: 1,
  automaticResults: {},
};

function withResults(results: Submission["automaticResults"]): Submission {
  return { ...BASE, automaticResults: results };
}

const ALL_PASS = Object.fromEntries(
  CURATION_CHECKS.filter((check) => check.automatic).map((check) => [check.id, "pass" as const]),
);

describe("evaluateSubmission", () => {
  it("marks non-automatic checks as manual, never as passed", () => {
    const { checks } = evaluateSubmission(withResults(ALL_PASS));
    for (const check of CURATION_CHECKS.filter((entry) => !entry.automatic)) {
      const evaluated = checks.find((entry) => entry.id === check.id);
      assert.equal(evaluated?.outcome, "manual");
    }
  });

  it("is ready for a decision when nothing automatic failed", () => {
    assert.equal(evaluateSubmission(withResults(ALL_PASS)).readyForDecision, true);
  });

  it("blocks on a failed automatic check", () => {
    const evaluation = evaluateSubmission(withResults({ ...ALL_PASS, license: "fail" }));
    assert.equal(evaluation.readyForDecision, false);
    assert.deepEqual(
      evaluation.blockers.map((check) => check.id),
      ["license"],
    );
  });

  it("treats an unrun automatic check as a warning, not a pass", () => {
    const { license, ...withoutLicense } = ALL_PASS;
    void license;
    const evaluation = evaluateSubmission(withResults(withoutLicense));
    const check = evaluation.checks.find((entry) => entry.id === "license");
    assert.equal(check?.outcome, "warn");
    assert.equal(check?.detail, "Nicht geprüft");
    // A missing check must not silently block either — it needs a human look.
    assert.equal(evaluation.readyForDecision, true);
  });

  it("explains a mutable git reference instead of just failing", () => {
    const evaluation = evaluateSubmission({
      ...withResults({ ...ALL_PASS, "pinned-ref": "fail" }),
      gitIdentifier: "main",
    });
    const check = evaluation.blockers.find((entry) => entry.id === "pinned-ref");
    assert.match(check?.detail ?? "", /main/);
  });

  it("always lists every check, whatever the results", () => {
    assert.equal(evaluateSubmission(withResults({})).checks.length, CURATION_CHECKS.length);
  });
});

describe("submissions fixture", () => {
  it("exposes one clean and one problematic submission", () => {
    const evaluations = listSubmissions().map(evaluateSubmission);
    assert.ok(evaluations.some((evaluation) => evaluation.readyForDecision));
    assert.ok(evaluations.some((evaluation) => evaluation.blockers.length > 0));
  });

  it("resolves a submission by id", () => {
    const first = listSubmissions()[0];
    assert.equal(getSubmission(first.id)?.title, first.title);
    assert.equal(getSubmission("does-not-exist"), undefined);
  });
});
