import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { UseCaseBundle } from "@/lib/server/bundle";
import {
  buildInstallPlan,
  readLifecycleStatus,
  toPipelineBody,
} from "@/lib/server/portal-backend/mapper";
import type { UseCase } from "@/types/use-cases";

const DS_TREE_RECORD = "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0";
const DS_TREE_SPECIES = "urn:core:platform:civitas:datastructure:demo:TreeSpecies:2.1.0";
const DATASET_URN = "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0";

const USE_CASE = {
  id: "baumkataster-starter",
  title: "Baumkataster Starter",
  modelForge: { datasetId: DATASET_URN },
  source: { repoUrl: "https://gitlab.com/example/x", gitIdentifier: "v1.0.0" },
} as unknown as UseCase;

const BUNDLE: UseCaseBundle = {
  dataset: {
    id: DATASET_URN,
    title: "Baumkataster Starter",
    description: "Demo dataset.",
    version: "3.0.0",
    dataStructureRefs: [DS_TREE_RECORD, DS_TREE_SPECIES],
  },
  elements: [
    { ref: DS_TREE_RECORD, schema: { $id: DS_TREE_RECORD, title: "TreeRecord", type: "object" } },
    { ref: DS_TREE_SPECIES, schema: { $id: DS_TREE_SPECIES, title: "TreeSpecies", type: "object" } },
  ],
  source: USE_CASE.source,
};

describe("mapper.buildInstallPlan", () => {
  test("maps each CORE-IR element to a datastructure create + version body", () => {
    const plan = buildInstallPlan(USE_CASE, BUNDLE);

    assert.equal(plan.datastructures.length, 2);

    const [treeRecord, treeSpecies] = plan.datastructures;
    assert.equal(treeRecord.name, "TreeRecord");
    assert.equal(treeRecord.version, "1.0.0");
    assert.equal(treeRecord.createBody.urn, DS_TREE_RECORD);
    assert.equal(treeRecord.createBody.name, "TreeRecord");
    assert.deepEqual(treeRecord.versionBody.schema, BUNDLE.elements[0].schema);
    assert.equal(treeRecord.versionBody.version, "1.0.0");

    assert.equal(treeSpecies.name, "TreeSpecies");
    assert.equal(treeSpecies.version, "2.1.0");

    assert.deepEqual(plan.datastructureRefs, [DS_TREE_RECORD, DS_TREE_SPECIES]);
  });

  test("builds a dataset body from the manifest, referencing the datastructures", () => {
    const plan = buildInstallPlan(USE_CASE, BUNDLE);

    assert.equal(plan.dataset.name, "Baumkataster Starter");
    assert.equal(plan.dataset.description, "Demo dataset.");
    assert.equal(plan.dataset.version, "3.0.0");
    assert.deepEqual(plan.dataset.datastructureRefs, [DS_TREE_RECORD, DS_TREE_SPECIES]);
  });

  test("synthesizes a placeholder MQTT datasource and a FROST datasink", () => {
    const plan = buildInstallPlan(USE_CASE, BUNDLE);

    assert.equal(plan.datasource.connectorType, "MQTT");
    assert.equal(plan.datasink.type, "FROST");
  });

  test("summary carries the dataset title/description and datastructure names", () => {
    const plan = buildInstallPlan(USE_CASE, BUNDLE);

    assert.equal(plan.summary.datasetTitle, "Baumkataster Starter");
    assert.equal(plan.summary.datasetDescription, "Demo dataset.");
    assert.deepEqual(plan.summary.dataStructures, [
      { name: "TreeRecord", version: "1.0.0" },
      { name: "TreeSpecies", version: "2.1.0" },
    ]);
  });
});

describe("mapper.toPipelineBody", () => {
  test("wires the datasource id and the first datastructure ref", () => {
    const body = toPipelineBody(BUNDLE, "src-1", DS_TREE_RECORD);
    assert.equal(body.datasourceRef, "src-1");
    assert.equal(body.datastructureRef, DS_TREE_RECORD);
  });
});

describe("mapper.readLifecycleStatus", () => {
  test("maps the backend lifecycle tokens onto the app status", () => {
    assert.equal(readLifecycleStatus({ status: "DRAFT" }), "DRAFT");
    assert.equal(readLifecycleStatus({ status: "READY" }), "READY");
    assert.equal(readLifecycleStatus({ status: "AVAILABLE" }), "AVAILABLE");
    assert.equal(readLifecycleStatus({ status: "RELEASING" }), "PROVISIONING");
    // tolerates the field being named `state`
    assert.equal(readLifecycleStatus({ state: "available" }), "AVAILABLE");
  });

  test("returns null for unknown/absent status", () => {
    assert.equal(readLifecycleStatus({ status: "SOMETHING_ELSE" }), null);
    assert.equal(readLifecycleStatus({}), null);
    assert.equal(readLifecycleStatus(null), null);
    assert.equal(readLifecycleStatus("nope"), null);
  });
});
