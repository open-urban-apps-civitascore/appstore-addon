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
}

// GitLab-style raw file URL for a path at a pinned ref, mirroring how the
// repo-list itself is fetched (…/-/raw/<ref>/<path>).
function rawUrl(repoUrl: string, ref: string, path: string): string {
  return `${repoUrl.replace(/\/+$/, "")}/-/raw/${encodeURIComponent(ref)}/${path}`;
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

export async function fetchUseCaseBundle(
  source: NonNullable<UseCase["source"]>,
): Promise<UseCaseBundle> {
  const { repoUrl, gitIdentifier } = source;

  const dataset = datasetManifestSchema.parse(
    await fetchJson(rawUrl(repoUrl, gitIdentifier, "core-ir/dataset.json")),
  );

  const elements: UseCaseBundle["elements"] = [];
  for (const ref of dataset.dataStructureRefs) {
    const name = parseUrn(ref).name;
    const schema = (await fetchJson(
      rawUrl(repoUrl, gitIdentifier, `core-ir/${name}.schema.json`),
    )) as Record<string, unknown>;

    // The file resolved by name must actually be the element the dataset refers
    // to — guards the filename convention against silent mismatches.
    if (typeof schema.$id === "string" && schema.$id !== ref) {
      throw new BundleError(
        `Bundle element $id '${schema.$id}' does not match referenced URN '${ref}'.`,
        502,
      );
    }
    elements.push({ ref, schema });
  }

  return { dataset, elements, source };
}
