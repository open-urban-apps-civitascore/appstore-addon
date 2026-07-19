import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { FileInstallStore, type InstallStore } from "@/lib/server/install-store";
import { StubAuthHeaderProvider } from "@/lib/server/portal-backend/auth";
import { PortalBackendClient } from "@/lib/server/portal-backend/client";
import type { InstallDeps } from "@/lib/server/portal-backend/install";
import type { InstalledUseCase } from "@/types/use-cases";

import { mockFetchBundle } from "@/lib/server/mock/fixtures/bundles";
import { mockInstalledSeed } from "@/lib/server/mock/installed-seed";
import { mockPortalBackendFetch } from "@/lib/server/mock/portal-backend";

/**
 * The mock counterparts of `defaultInstallDeps()` / `getInstallStore()` — same
 * production types, mock collaborators:
 *
 *   - the client is the REAL `PortalBackendClient`, its `fetchImpl` replaced by
 *     the in-memory backend simulation (`portal-backend.ts`)
 *   - bundles resolve from fixtures instead of GitLab
 *   - installs persist in a SEPARATE file (mock installs never touch the real
 *     store), seeded once with lifecycle-variety records; delete the file to
 *     reset the demo
 */

function mockStorePath(): string {
  const configured = process.env.MARKETPLACE_MOCK_STORE_PATH?.trim();
  return configured || path.join(os.tmpdir(), "civitas-marketplace-installs.mock.json");
}

/**
 * Delegates to a {@link FileInstallStore} after a one-time seeding: if the store
 * file does not exist yet, the seed records are written first. A user who
 * uninstalls everything keeps their empty store (the file then exists) — no
 * re-seeding on restart.
 */
class SeededInstallStore implements InstallStore {
  private seeded: Promise<void> | undefined;

  constructor(
    private readonly inner: FileInstallStore,
    private readonly filePath: string,
    private readonly seed: InstalledUseCase[],
  ) {}

  private ensureSeeded(): Promise<void> {
    this.seeded ??= (async () => {
      const exists = await fs
        .stat(this.filePath)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        for (const record of this.seed) await this.inner.save(record);
      }
    })();
    return this.seeded;
  }

  async list(): Promise<InstalledUseCase[]> {
    await this.ensureSeeded();
    return this.inner.list();
  }

  async get(useCaseId: string): Promise<InstalledUseCase | null> {
    await this.ensureSeeded();
    return this.inner.get(useCaseId);
  }

  async save(record: InstalledUseCase): Promise<void> {
    await this.ensureSeeded();
    return this.inner.save(record);
  }

  async remove(useCaseId: string): Promise<void> {
    await this.ensureSeeded();
    return this.inner.remove(useCaseId);
  }
}

let storeSingleton: InstallStore | undefined;

/** The process-wide mock install store (separate file, seeded once). */
export function getMockInstallStore(): InstallStore {
  if (!storeSingleton) {
    const filePath = mockStorePath();
    storeSingleton = new SeededInstallStore(new FileInstallStore(filePath), filePath, mockInstalledSeed);
  }
  return storeSingleton;
}

/** Mock install dependencies — the drop-in for `defaultInstallDeps()` in mock mode. */
export function getMockInstallDeps(): InstallDeps {
  return {
    client: new PortalBackendClient({
      // Never dialed: `fetchImpl` intercepts everything. The URL only shapes paths/logs.
      baseUrl: "http://mock.portal-backend.invalid/v1",
      authProvider: new StubAuthHeaderProvider(),
      fetchImpl: mockPortalBackendFetch,
    }),
    store: getMockInstallStore(),
    fetchBundle: mockFetchBundle,
    now: () => new Date(),
    // Snappier than the production 2s/60s: the mock saga resolves in ~1.5s.
    poll: { intervalMs: 400, timeoutMs: 30_000 },
  };
}
