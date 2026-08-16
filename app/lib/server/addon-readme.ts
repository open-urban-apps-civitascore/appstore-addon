import { isMockMode } from "@/lib/server/mock/mode";

/**
 * Server-side fetch of an add-on repository's README.md.
 *
 * The catalog does not carry documentation — the repository is the source of
 * truth for how an add-on is installed and operated. The detail page therefore
 * shows the repo's own README instead of a curated copy that would go stale.
 *
 * Supports the two forges the catalog actually contains (GitLab, GitHub),
 * trying the usual default branches. Any failure degrades to `null` — the page
 * then links to the repository instead. Like the repo-list, this module keeps
 * its own TTL cache (per repository URL) so a detail-page reload doesn't hit
 * the forge every time.
 */

const BRANCHES = ["main", "master"];
const FETCH_TIMEOUT_MS = 5000;
const TTL_MS = 60 * 60 * 1000;
// Guard against pathological READMEs blowing up the page payload.
const MAX_README_CHARS = 100_000;

export type AddonReadme = {
  markdown: string;
  /** Resolves relative image paths in the README (raw file host). */
  rawBase: string;
  /** Resolves relative links in the README (repository web UI). */
  blobBase: string;
};

type Candidate = { readmeUrl: string; rawBase: string; blobBase: string };

// Module-scoped: shared across requests within a server process. Negative
// results are cached too — an unreachable forge shouldn't stall every render.
const cache = new Map<string, { readme: AddonReadme | null; fetchedAt: number }>();

function candidates(repository: string): Candidate[] {
  const repo = repository.replace(/\.git$/, "").replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(repo);
  } catch {
    return [];
  }

  if (url.hostname === "gitlab.com") {
    // The path pattern works for arbitrary namespace depth (group/subgroup/project).
    return BRANCHES.map((branch) => ({
      readmeUrl: `${repo}/-/raw/${branch}/README.md`,
      rawBase: `${repo}/-/raw/${branch}`,
      blobBase: `${repo}/-/blob/${branch}`,
    }));
  }

  if (url.hostname === "github.com") {
    const [owner, name] = url.pathname.split("/").filter(Boolean);
    if (!owner || !name) return [];
    return BRANCHES.map((branch) => ({
      readmeUrl: `https://raw.githubusercontent.com/${owner}/${name}/${branch}/README.md`,
      rawBase: `https://raw.githubusercontent.com/${owner}/${name}/${branch}`,
      blobBase: `https://github.com/${owner}/${name}/blob/${branch}`,
    }));
  }

  return [];
}

export async function fetchAddonReadme(
  repository: string | undefined,
): Promise<AddonReadme | null> {
  // Mock mode promises a fully offline marketplace — no README fetches either.
  if (!repository || isMockMode()) return null;

  const cached = cache.get(repository);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.readme;

  let readme: AddonReadme | null = null;
  for (const candidate of candidates(repository)) {
    try {
      const response = await fetch(candidate.readmeUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const markdown = (await response.text()).slice(0, MAX_README_CHARS).trim();
      if (!markdown) continue;
      readme = { markdown, rawBase: candidate.rawBase, blobBase: candidate.blobBase };
      break;
    } catch {
      // Unreachable forge or timeout — try the next candidate.
    }
  }

  cache.set(repository, { readme, fetchedAt: Date.now() });
  return readme;
}
