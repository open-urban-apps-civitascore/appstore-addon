import { z } from "zod";

import addonsSeed from "@/data/catalog.json";
import useCasesSeed from "@/data/use-cases.json";
import { catalogSchema, type Addon } from "@/types/catalog";
import { useCaseCatalogSchema, type UseCase } from "@/types/use-cases";

/**
 * The repo-list: a single git-hosted `index.json` (F-Droid model) that every
 * marketplace instance reads to build its catalog. This module is the only place
 * that fetches it. It runs its own TTL cache and keeps serving the last valid
 * state when the source is unreachable (last-known-good), so the marketplace
 * stays usable in restrictive municipal networks. With no source configured it
 * falls back to the catalog bundled with the app, so local dev works offline.
 *
 * See gitlab.com/civitascore-openurbanapps/civitas-marketplace-catalog.
 */

// One unified index, two sections, one shared version/updatedAt — reusing the
// per-entry schemas so the index and the app can never drift apart.
const repoListIndexSchema = z.object({
  version: z.string(),
  updatedAt: z.string().datetime(),
  addons: catalogSchema.shape.addons,
  useCases: useCaseCatalogSchema.shape.useCases,
});
type RepoListIndex = z.infer<typeof repoListIndexSchema>;

type IndexOrigin = "remote" | "seed";

type CacheEntry = {
  index: RepoListIndex;
  /** When the served data was last fetched from the remote (seed: build time). */
  fetchedAt: Date;
  origin: IndexOrigin;
  /** true = the remote was unreachable and this is a fallback (last-known-good). */
  stale: boolean;
};

const DEFAULT_TTL_SECONDS = 900;
const FETCH_TIMEOUT_MS = 5000;

// Module-scoped: shared across requests within a server process, reset on deploy.
let cache: CacheEntry | undefined;

function ttlMs(): number {
  const configured = Number(process.env.REPO_LIST_TTL_SECONDS);
  return (Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_SECONDS) * 1000;
}

function indexUrl(): string | undefined {
  const raw = process.env.REPO_LIST_URL?.trim();
  return raw ? raw : undefined;
}

// The catalog shipped inside the app — used only when nothing is cached and the
// remote is unavailable (or unconfigured). The two seed files predate the merge
// into one index, so we stitch them here; their versions may differ, we take the
// use-cases one (it changes most).
function bundledSeed(stale: boolean): CacheEntry {
  const index = repoListIndexSchema.parse({
    version: (useCasesSeed as { version: string }).version,
    updatedAt: (useCasesSeed as { updatedAt: string }).updatedAt,
    addons: (addonsSeed as { addons: unknown }).addons,
    useCases: (useCasesSeed as { useCases: unknown }).useCases,
  });
  return { index, fetchedAt: new Date(), origin: "seed", stale };
}

async function loadIndex(): Promise<CacheEntry> {
  // Serve a fresh, healthy cache without touching the network. A stale entry is
  // deliberately not short-circuited so we retry the remote on the next call.
  if (cache && !cache.stale && Date.now() - cache.fetchedAt.getTime() < ttlMs()) {
    return cache;
  }

  const url = indexUrl();
  if (!url) {
    // No remote configured (local dev): serve the bundled catalog as-is.
    return (cache ??= bundledSeed(false));
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      // We run our own TTL cache; don't let the framework cache the response too.
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`repo-list responded ${response.status} ${response.statusText}`);
    }
    const index = repoListIndexSchema.parse(await response.json());
    cache = { index, fetchedAt: new Date(), origin: "remote", stale: false };
    return cache;
  } catch (error) {
    console.error(`[repo-list] fetch/validate failed for ${url}:`, error);
    // Last-known-good: keep serving the previous valid state, flagged stale.
    if (cache) return (cache = { ...cache, stale: true });
    // Cold start with no reachable remote: fall back to the bundled seed.
    return (cache = bundledSeed(true));
  }
}

export type RepoListMeta = {
  version: string;
  fetchedAt: Date;
  origin: IndexOrigin;
  stale: boolean;
};

/** Freshness metadata for the "catalog as of …" hint in the UI. */
export async function getRepoListMeta(): Promise<RepoListMeta> {
  const { index, fetchedAt, origin, stale } = await loadIndex();
  return { version: index.version, fetchedAt, origin, stale };
}

/** The catalog content version — stamped onto installs as `civitas:catalogVersion`. */
export async function getRepoListVersion(): Promise<string> {
  return (await loadIndex()).index.version;
}

/** Listable add-ons (revoked entries are hidden — tombstone convention). */
export async function getRepoListAddons(): Promise<Addon[]> {
  return (await loadIndex()).index.addons.filter((addon) => !addon.revoked);
}

/** Listable use cases (revoked entries are hidden — tombstone convention). */
export async function getRepoListUseCases(): Promise<UseCase[]> {
  return (await loadIndex()).index.useCases.filter((useCase) => !useCase.revoked);
}
