import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { installedUseCaseSchema, type InstalledUseCase } from "@/types/use-cases";

/**
 * Local record of the use cases this marketplace has installed via the
 * portal-backend.
 *
 * Why a local store at all? The retired Model Forge path treated the backend as the
 * source of truth and searched it by a provenance label. The portal-backend assigns
 * dataset ids itself (the `Location` header of `POST /datasets`), which the
 * marketplace can't predict, and the contract exposes no marketplace-provenance
 * search — so the mapping "use case → installed dataset id" has to live here.
 *
 * A record IS an {@link InstalledUseCase} view model (its `id` is the portal-backend
 * dataset id). Live lifecycle status is refreshed from `GET /datasets/{id}` at read
 * time; the persisted `status` is the last-known fallback.
 *
 * Prototype scope: this is a plain JSON file; resetting it (or losing it on a fresh
 * container) is acceptable. Path via `MARKETPLACE_INSTALL_STORE_PATH`, else a file
 * in the OS temp dir.
 */

export interface InstallStore {
  list(): Promise<InstalledUseCase[]>;
  get(useCaseId: string): Promise<InstalledUseCase | null>;
  /** Upsert by `useCaseId`. */
  save(record: InstalledUseCase): Promise<void>;
  remove(useCaseId: string): Promise<void>;
}

/** In-memory store — used by tests and as the building block of the file store. */
export class InMemoryInstallStore implements InstallStore {
  private records = new Map<string, InstalledUseCase>();

  constructor(seed: InstalledUseCase[] = []) {
    for (const record of seed) this.records.set(record.useCaseId, record);
  }

  async list(): Promise<InstalledUseCase[]> {
    return [...this.records.values()];
  }

  async get(useCaseId: string): Promise<InstalledUseCase | null> {
    return this.records.get(useCaseId) ?? null;
  }

  async save(record: InstalledUseCase): Promise<void> {
    this.records.set(record.useCaseId, record);
  }

  async remove(useCaseId: string): Promise<void> {
    this.records.delete(useCaseId);
  }
}

function defaultStorePath(): string {
  const configured = process.env.MARKETPLACE_INSTALL_STORE_PATH?.trim();
  return configured || path.join(os.tmpdir(), "civitas-marketplace-installs.json");
}

/** Parse a file's contents into records, skipping any that no longer validate. */
function parseRecords(raw: string): InstalledUseCase[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const records: InstalledUseCase[] = [];
  for (const entry of parsed) {
    const result = installedUseCaseSchema.safeParse(entry);
    if (result.success) records.push(result.data);
  }
  return records;
}

/**
 * File-backed store. Reads tolerate a missing/corrupt file (→ empty list); writes
 * are serialized in-process to avoid interleaved read-modify-write races within a
 * single server instance.
 */
export class FileInstallStore implements InstallStore {
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string = defaultStorePath()) {}

  async list(): Promise<InstalledUseCase[]> {
    const raw = await fs.readFile(this.filePath, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    return raw === null ? [] : parseRecords(raw);
  }

  async get(useCaseId: string): Promise<InstalledUseCase | null> {
    return (await this.list()).find((record) => record.useCaseId === useCaseId) ?? null;
  }

  save(record: InstalledUseCase): Promise<void> {
    return this.mutate((records) => {
      const next = records.filter((existing) => existing.useCaseId !== record.useCaseId);
      next.push(record);
      return next;
    });
  }

  remove(useCaseId: string): Promise<void> {
    return this.mutate((records) => records.filter((record) => record.useCaseId !== useCaseId));
  }

  /** Serialize read-modify-write operations behind a single in-process chain. */
  private mutate(update: (records: InstalledUseCase[]) => InstalledUseCase[]): Promise<void> {
    const run = this.writeChain.then(async () => {
      const records = await this.list();
      const next = update(records);
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    });
    // Keep the chain alive even if this write rejects, so later writes still run.
    this.writeChain = run.catch(() => undefined);
    return run;
  }
}

let singleton: FileInstallStore | undefined;

/** The process-wide file-backed install store. */
export function getInstallStore(): InstallStore {
  singleton ??= new FileInstallStore();
  return singleton;
}
