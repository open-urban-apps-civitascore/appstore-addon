import { z } from "zod";

import { parseUrn } from "@/lib/urn";
import type { UseCase } from "@/types/use-cases";

/**
 * Fetches a use-case bundle (CORE-IR files) straight from its git artifact repo
 * — the M3 install source. The bundle is the single source of the use case's
 * content; nothing is shipped with the app.
 *
 * Layout convention (matches commune-mittelerde-trafficcounter):
 *   core-ir/dataset.json          — the DataSet manifest (entry point)
 *   core-ir/<ElementName>.schema.json — one JSON-Schema file per element,
 *                                       named after the URN's name segment
 *
 * `dataset.json.dataStructureRefs` drives which elements are fetched and in what
 * order (dependency order: a referenced element comes before its user).
 *
 * The ref is any git identifier (branch/tag/commit hash); pinning a commit hash
 * gives integrity — the marketplace installs exactly the reviewed content.
 */

export class BundleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BundleError";
  }
}

const FETCH_TIMEOUT_MS = 5000;

const datasetManifestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  dataStructureRefs: z.array(z.string()),
});

export interface UseCaseBundle {
  dataset: z.infer<typeof datasetManifestSchema>;
  /** Element JSON Schemas, in `dataStructureRefs` (dependency) order. */
  elements: { ref: string; schema: Record<string, unknown> }[];
  source: NonNullable<UseCase["source"]>;
  /** The commit SHA `source.gitIdentifier` resolved to (immutable pin); absent if resolution failed. */
  commit?: string;
  /**
   * The pipeline flow graph (the React-Flow model the portal pipeline editor
   * produces), from `core-ir/pipeline.json`. Optional: a bundle without it installs
   * with an empty placeholder model (→ the release saga compensates to READY). Its
   * datasource/datasink node `entityId`s are re-bound to this instance's freshly
   * created ids at install time (see the mapper), so any ids recorded in the file
   * are irrelevant.
   */
  pipeline?: Record<string, unknown>;
}

// GitLab-style raw file URL for a path at a pinned ref, mirroring how the
// repo-list itself is fetched (…/-/raw/<ref>/<path>).
function rawUrl(repoUrl: string, ref: string, path: string): string {
  return `${repoUrl.replace(/\/+$/, "")}/-/raw/${encodeURIComponent(ref)}/${path}`;
}

/**
 * Resolve a git ref (tag/commit) to its full commit SHA via the GitLab commits API
 * (public, no token). Returns null on failure — the install still proceeds from the
 * ref, just without the immutable commit pin. GitLab-specific, like `rawUrl`.
 */
async function resolveCommitSha(repoUrl: string, ref: string): Promise<string | null> {
  try {
    const url = new URL(repoUrl);
    const project = encodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
    const api = `${url.origin}/api/v4/projects/${project}/repository/commits/${encodeURIComponent(ref)}`;
    const response = await fetch(api, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { id?: unknown };
    return typeof body.id === "string" ? body.id : null;
  } catch (error) {
    console.warn(`[bundle] could not resolve commit for ${repoUrl}@${ref}:`, error);
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch((error) => {
    throw new BundleError(
      `Bundle fetch failed: ${error instanceof Error ? error.message : url}`,
      502,
    );
  });

  if (response.status === 404) {
    throw new BundleError(`Bundle file not found: ${url}`, 424);
  }
  if (!response.ok) {
    throw new BundleError(`Bundle fetch returned ${response.status} for ${url}`, 502);
  }
  return response.json().catch(() => {
    throw new BundleError(`Bundle file is not valid JSON: ${url}`, 502);
  });
}

/**
 * Like {@link fetchJson} but a missing file (`404`) resolves to `undefined` instead
 * of throwing — for optional bundle parts (e.g. the pipeline model).
 */
async function fetchOptionalJson(url: string): Promise<Record<string, unknown> | undefined> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch((error) => {
    throw new BundleError(
      `Bundle fetch failed: ${error instanceof Error ? error.message : url}`,
      502,
    );
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new BundleError(`Bundle fetch returned ${response.status} for ${url}`, 502);
  }
  return response.json().catch(() => {
    throw new BundleError(`Bundle file is not valid JSON: ${url}`, 502);
  }) as Promise<Record<string, unknown>>;
}

export async function fetchUseCaseBundle(
  source: NonNullable<UseCase["source"]>,
): Promise<UseCaseBundle> {
  const { repoUrl, gitIdentifier } = source;

  // Resolve the pinned ref to an immutable commit SHA, then fetch the bundle *at
  // that commit* — so the installed content provably matches the recorded SHA (no
  // race with a moving tag). Falls back to the ref itself if resolution fails.
  const commit = await resolveCommitSha(repoUrl, gitIdentifier);
  const ref = commit ?? gitIdentifier;

  const dataset = datasetManifestSchema.parse(
    await fetchJson(rawUrl(repoUrl, ref, "core-ir/dataset.json")),
  );

  const elements: UseCaseBundle["elements"] = [];
  for (const structureRef of dataset.dataStructureRefs) {
    const name = parseUrn(structureRef).name;
    const schema = (await fetchJson(
      rawUrl(repoUrl, ref, `core-ir/${name}.schema.json`),
    )) as Record<string, unknown>;

    // The file resolved by name must actually be the element the dataset refers
    // to — guards the filename convention against silent mismatches.
    if (typeof schema.$id === "string" && schema.$id !== structureRef) {
      throw new BundleError(
        `Bundle element $id '${schema.$id}' does not match referenced URN '${structureRef}'.`,
        502,
      );
    }
    elements.push({ ref: structureRef, schema });
  }

  // Optional flow graph — a bundle without it installs with an empty placeholder.
  const pipeline = await fetchOptionalJson(rawUrl(repoUrl, ref, "core-ir/pipeline.json"));

  return { dataset, elements, source, commit: commit ?? undefined, pipeline };
}
