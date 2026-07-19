import { mockRepoListIndex } from "@/lib/server/mock/fixtures/catalog";
import { isMockMode } from "@/lib/server/mock/mode";
import { type Addon } from "@/types/addons";
import { repoListIndexSchema, type RepoListIndex } from "@/types/repo-list";
import { type UseCase } from "@/types/use-cases";

/**
 * The repo-list: a single git-hosted `index.json` (F-Droid model) that every
 * marketplace instance reads to build its catalog. This module is the only place
 * that fetches it. It runs its own TTL cache and keeps serving the last valid
 * state when the source is unreachable (in-memory last-known-good), so the
 * marketplace stays usable in restrictive municipal networks.
 *
 * The repo-list is the single source of truth: there is no catalog bundled with
 * the app. When nothing has ever been fetched — no REPO_LIST_URL, or the remote
 * is unreachable on a cold start — the catalog is served empty (never crashing,
 * but honestly empty) rather than falling back to stale build-time data.
 *
 * See gitlab.com/civitascore-openurbanapps/civitas-marketplace-catalog.
 */

type IndexOrigin = "remote" | "unconfigured" | "unreachable" | "mock";

type CacheEntry = {
  index: RepoListIndex;
  /** When the served data was last fetched from the remote. */
  fetchedAt: Date;
  origin: IndexOrigin;
  /** true = not live: last-known-good, unconfigured, or unreachable. */
  stale: boolean;
};

// The ultimate fallback: an empty catalog. Never cached, so the next call retries.
const EMPTY_INDEX: RepoListIndex = {
  version: "0.0.0",
  updatedAt: new Date(0).toISOString(),
  addons: [],
  useCases: [],
};

const DEFAULT_TTL_SECONDS = 900;
const FETCH_TIMEOUT_MS = 5000;

// Module-scoped: shared across requests within a server process, reset on deploy.
let cache: CacheEntry | undefined;

// Mock mode: a stable entry built once from the fixture catalog (no network at all).
let mockEntry: CacheEntry | undefined;

function ttlMs(): number {
  const configured = Number(process.env.REPO_LIST_TTL_SECONDS);
  return (Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_SECONDS) * 1000;
}

function indexUrl(): string | undefined {
  const raw = process.env.REPO_LIST_URL?.trim();
  return raw ? raw : undefined;
}

function emptyEntry(origin: "unconfigured" | "unreachable"): CacheEntry {
  return { index: EMPTY_INDEX, fetchedAt: new Date(0), origin, stale: true };
}

async function loadIndex(): Promise<CacheEntry> {
  // Mock mode: the fixture catalog replaces the remote entirely (one of the three
  // mock seams — see lib/server/mock/mode.ts).
  if (isMockMode()) {
    return (mockEntry ??= {
      index: mockRepoListIndex,
      fetchedAt: new Date(),
      origin: "mock",
      stale: false,
    });
  }

  // Serve a fresh, healthy cache without touching the network. A stale entry is
  // deliberately not short-circuited so we retry the remote on the next call.
  if (cache && !cache.stale && Date.now() - cache.fetchedAt.getTime() < ttlMs()) {
    return cache;
  }

  const url = indexUrl();
  if (!url) {
    // No repo-list configured — serve an empty catalog (honest, non-crashing).
    return emptyEntry("unconfigured");
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
    // Cold start with an unreachable remote and nothing cached: empty catalog.
    return emptyEntry("unreachable");
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
