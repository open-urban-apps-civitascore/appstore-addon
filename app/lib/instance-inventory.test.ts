import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getInstanceInventory,
  resolveDependencies,
  type InstanceArtifact,
} from "@/lib/instance-inventory";

const FIXTURE: InstanceArtifact[] = [
  { id: "a", name: "A", kind: "dataset", dependsOn: ["b"], origin: "manual" },
  { id: "b", name: "B", kind: "pipeline", dependsOn: ["c"], origin: "manual" },
  { id: "c", name: "C", kind: "datastructure", dependsOn: [], origin: "manual" },
  { id: "d", name: "D", kind: "dataset", dependsOn: [], origin: "manual" },
];

describe("resolveDependencies", () => {
  it("follows dependencies transitively", () => {
    const { included } = resolveDependencies(["a"], FIXTURE);
    assert.deepEqual(included.sort(), ["a", "b", "c"]);
  });

  it("reports only what it added beyond the explicit selection", () => {
    const { added } = resolveDependencies(["a", "b"], FIXTURE);
    assert.deepEqual(added, ["c"]);
  });

  it("adds nothing when the selection is already complete", () => {
    const { added } = resolveDependencies(["c", "d"], FIXTURE);
    assert.deepEqual(added, []);
  });

  it("returns an empty result for an empty selection", () => {
    assert.deepEqual(resolveDependencies([], FIXTURE), { included: [], added: [] });
  });

  it("terminates on a dependency cycle", () => {
    const cyclic: InstanceArtifact[] = [
      { id: "x", name: "X", kind: "dataset", dependsOn: ["y"], origin: "manual" },
      { id: "y", name: "Y", kind: "pipeline", dependsOn: ["x"], origin: "manual" },
    ];
    assert.deepEqual(resolveDependencies(["x"], cyclic).included.sort(), ["x", "y"]);
  });

  it("ignores unknown ids instead of throwing", () => {
    assert.deepEqual(resolveDependencies(["missing"], FIXTURE).included, ["missing"]);
  });
});

describe("getInstanceInventory", () => {
  it("only references artifacts that exist", () => {
    const inventory = getInstanceInventory();
    const ids = new Set(inventory.map((artifact) => artifact.id));
    for (const artifact of inventory) {
      for (const dependency of artifact.dependsOn) {
        assert.ok(ids.has(dependency), `${artifact.id} depends on unknown ${dependency}`);
      }
    }
  });

  it("carries hand-modelled artifacts — the case an export has to serve", () => {
    assert.ok(getInstanceInventory().some((artifact) => artifact.origin === "manual"));
  });
});
