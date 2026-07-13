import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { FileInstallStore } from "@/lib/server/install-store";
import type { InstalledUseCase } from "@/types/use-cases";

function record(overrides: Partial<InstalledUseCase> = {}): InstalledUseCase {
  return {
    id: "set-1",
    useCaseId: "baumkataster-starter",
    useCaseTitle: "Baumkataster Starter",
    installedAt: "2020-01-01T00:00:00.000Z",
    status: "AVAILABLE",
    source: "portal-backend",
    createdDataset: {
      name: "Baumkataster Starter",
      description: "Demo.",
      openDataAccess: false,
      status: "AVAILABLE",
    },
    createdDataStructures: [{ name: "TreeRecord", version: "1.0.0" }],
    datasetRef: { datasetId: "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0" },
    ...overrides,
  };
}

describe("FileInstallStore", () => {
  let filePath: string;
  let store: FileInstallStore;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `install-store-test-${process.pid}-${Date.now()}.json`);
    store = new FileInstallStore(filePath);
  });

  afterEach(async () => {
    await fs.rm(filePath, { force: true });
  });

  test("returns an empty list when the file does not exist", async () => {
    assert.deepEqual(await store.list(), []);
  });

  test("saves and reads back a record", async () => {
    await store.save(record());
    const listed = await store.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, "set-1");
    assert.equal((await store.get("baumkataster-starter"))?.id, "set-1");
  });

  test("upserts by useCaseId (no duplicates)", async () => {
    await store.save(record({ id: "set-1", status: "PROVISIONING" }));
    await store.save(record({ id: "set-2", status: "AVAILABLE" }));

    const listed = await store.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, "set-2");
    assert.equal(listed[0].status, "AVAILABLE");
  });

  test("removes a record", async () => {
    await store.save(record());
    await store.remove("baumkataster-starter");
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.get("baumkataster-starter"), null);
  });

  test("tolerates a corrupt file (returns empty rather than throwing)", async () => {
    await fs.writeFile(filePath, "this is not json", "utf8");
    assert.deepEqual(await store.list(), []);
  });

  test("skips records that no longer satisfy the schema", async () => {
    await fs.writeFile(
      filePath,
      JSON.stringify([record(), { useCaseId: "broken" /* missing required fields */ }]),
      "utf8",
    );
    const listed = await store.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].useCaseId, "baumkataster-starter");
  });
});
