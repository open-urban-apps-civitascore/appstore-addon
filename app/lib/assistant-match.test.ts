import assert from "node:assert/strict";
import { test } from "node:test";

import { matchUseCases } from "@/lib/assistant-match";
import { mockRepoListIndex } from "@/lib/server/mock/fixtures/catalog";

const USE_CASES = mockRepoListIndex.useCases;

test("a plain-language traffic question finds the traffic use case first", () => {
  const matches = matchUseCases("Wir wollen wissen, wie der Verkehr am Bahnhof fließt", USE_CASES);

  assert.ok(matches.length > 0);
  assert.equal(matches[0]?.useCase.id, "mittelerde-trafficcounter");
  assert.ok(matches[0]?.reason.length > 0, "a match must carry a reason, never a bare score");
});

test("an air-quality question finds the particulate-matter use case", () => {
  const matches = matchUseCases("Die Luftqualität in der Innenstadt soll gemessen werden", USE_CASES);
  assert.equal(matches[0]?.useCase.id, "mittelerde-feinstaub");
});

test("an unrelated question returns nothing rather than a bad guess", () => {
  const matches = matchUseCases("Wie beantrage ich einen Reisepass?", USE_CASES);
  assert.equal(matches.length, 0);
});

test("an empty query returns nothing", () => {
  assert.deepEqual(matchUseCases("   ", USE_CASES), []);
});

test("results are capped", () => {
  const matches = matchUseCases("Kommune Daten Umwelt Verkehr Kataster", USE_CASES, 2);
  assert.ok(matches.length <= 2);
});
