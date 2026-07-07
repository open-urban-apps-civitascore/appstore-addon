import { z } from "zod";

import { fetchUseCaseBundle } from "@/lib/server/bundle";
import { getRepoListVersion } from "@/lib/server/repo-list";
import { modelForgeDataSetSchema, type ModelForgeDataSet, type UseCase } from "@/types/use-cases";

/**
 * Provenance labels the marketplace stamps onto the artifacts it creates in Model
 * Forge. They make Model Forge the source of truth for "what did the marketplace
 * install" — searchable via GET /api/v1/artifacts/search?label=key=value — so the
 * marketplace keeps no local install list of its own.
 */
export const MARKETPLACE_LABELS = {
  origin: "civitas:origin",
  useCaseId: "civitas:useCaseId",
  installedAt: "civitas:installedAt",
  catalogVersion: "civitas:catalogVersion",
  // Provenance of a git-bundle install (M3): which artifact repo + ref it came
  // from. The basis for later drift detection (M4).
  bundleRepo: "civitas:bundleRepo",
  bundleRef: "civitas:bundleRef",
} as const;

export const MARKETPLACE_ORIGIN = "marketplace";

export class ModelForgeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ModelForgeError";
  }
}

function getRequiredEnv(name: "MODELFORGE_BASE_URL" | "MODELFORGE_API_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ModelForgeError(`Missing required environment variable ${name}.`, 503);
  }
  return value;
}

function buildDataSetUrl(useCase: UseCase): string {
  const url = new URL(`${modelForgeBaseUrl()}/api/v1/datasets`);
  // CORE URNs contain colons; setting it as a search param percent-encodes them.
  url.searchParams.set("id", useCase.modelForge.datasetId);
  return url.toString();
}

export function getDataSetUrlForUseCase(useCase: UseCase): string {
  return buildDataSetUrl(useCase);
}

export async function getDataSetForUseCase(useCase: UseCase): Promise<ModelForgeDataSet> {
  const response = await fetch(buildDataSetUrl(useCase), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-API-Key": getRequiredEnv("MODELFORGE_API_KEY"),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch((error) => {
    throw new ModelForgeError(
      error instanceof Error ? `Model Forge request failed: ${error.message}` : "Model Forge request failed.",
      502,
    );
  });

  if (response.status === 404) {
    throw new ModelForgeError(
      `Model Forge dataset '${useCase.modelForge.datasetId}' was not found.`,
      424,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new ModelForgeError("Model Forge rejected the API key configured for the appstore.", 502);
  }

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new ModelForgeError(
      `Model Forge returned ${response.status}${payload ? `: ${payload}` : ""}`,
      502,
    );
  }

  const payload = (await response.json()) as unknown;
  return modelForgeDataSetSchema.parse(payload);
}

// ── Write side: provision a use case's artifacts into Model Forge ────────────────
// Lets the Marketplace create a use case "from scratch" on install instead of
// depending on a pre-seeded dataset.

function modelForgeBaseUrl(): string {
  return getRequiredEnv("MODELFORGE_BASE_URL").replace(/\/+$/, "");
}

async function modelForgeFetch(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${modelForgeBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-API-Key": getRequiredEnv("MODELFORGE_API_KEY"),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch((error) => {
    throw new ModelForgeError(
      error instanceof Error ? `Model Forge request failed: ${error.message}` : "Model Forge request failed.",
      502,
    );
  });

  if (response.status === 401 || response.status === 403) {
    throw new ModelForgeError("Model Forge rejected the API key configured for the appstore.", 502);
  }
  return response;
}

function datasetUrlById(id: string): string {
  return `/api/v1/datasets?id=${encodeURIComponent(id)}`;
}

async function existsById(collectionPath: string, id: string): Promise<boolean> {
  const response = await modelForgeFetch(`${collectionPath}?id=${encodeURIComponent(id)}`, { method: "GET" });
  if (response.status === 404) return false;
  if (response.ok) return true;
  const payload = await response.text().catch(() => "");
  throw new ModelForgeError(`Model Forge returned ${response.status}${payload ? `: ${payload}` : ""}`, 502);
}

async function sendJson(method: "POST" | "PUT", path: string, body: unknown): Promise<unknown> {
  const response = await modelForgeFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new ModelForgeError(
      `Model Forge ${method} ${path} → ${response.status}${payload ? `: ${payload}` : ""}`,
      502,
    );
  }
  return response.json().catch(() => ({}));
}

/** Create a DataStructure from an inline JSON Schema; returns its CORE URN. Reused if its $id already exists. */
async function ensureDataStructure(schema: Record<string, unknown>): Promise<string> {
  const declaredId = typeof schema.$id === "string" ? schema.$id : undefined;
  if (declaredId && (await existsById("/api/v1/datastructures", declaredId))) {
    return declaredId;
  }
  const result = (await sendJson("POST", "/api/v1/datastructures", { schema })) as { resourceId?: string };
  if (!result.resourceId) {
    throw new ModelForgeError("Model Forge did not return a resourceId for the created DataStructure.", 502);
  }
  return result.resourceId;
}

export interface ProvisionResult {
  dataSet: ModelForgeDataSet;
  /** true = artifacts were created now; false = an existing dataset was reused. */
  created: boolean;
}

/** Normalized provisioning input from the use case's git bundle. */
interface ProvisionInput {
  datasetTitle: string;
  datasetDescription: string;
  /** Element JSON Schemas to create, in dependency order. */
  elements: Record<string, unknown>[];
  /** Extra provenance labels (the bundle's repo + ref). */
  extraLabels?: Record<string, string>;
}

/** Provisioning input from the use case's git artifact repo (M3). */
async function bundleProvisionInput(source: UseCase["source"]): Promise<ProvisionInput> {
  const bundle = await fetchUseCaseBundle(source);
  return {
    datasetTitle: bundle.dataset.title,
    datasetDescription: bundle.dataset.description ?? "",
    elements: bundle.elements.map((element) => element.schema),
    extraLabels: {
      [MARKETPLACE_LABELS.bundleRepo]: source.repoUrl,
      [MARKETPLACE_LABELS.bundleRef]: source.gitIdentifier,
    },
  };
}

/**
 * Ensure the use case's artifacts exist in Model Forge, creating them when
 * missing — no pre-seeding required. The content is fetched from the use case's
 * git artifact repo (`source`). Idempotent: an already-present dataset (matched by
 * the use case's datasetId) is reused.
 *
 * Note: this assumes the dataset URN Model Forge generates from the dataset
 * title equals `useCase.modelForge.datasetId` (true for the catalog use cases).
 */
export async function provisionUseCaseInModelForge(useCase: UseCase): Promise<ProvisionResult> {
  if (await existsById("/api/v1/datasets", useCase.modelForge.datasetId)) {
    return { dataSet: await getDataSetForUseCase(useCase), created: false };
  }

  const input = await bundleProvisionInput(useCase.source);

  const dataStructureRefs: string[] = [];
  for (const schema of input.elements) {
    dataStructureRefs.push(await ensureDataStructure(schema));
  }

  const shell = modelForgeDataSetSchema.parse(
    await sendJson("POST", "/api/v1/datasets", { title: input.datasetTitle }),
  );

  const dataSet = modelForgeDataSetSchema.parse(
    await sendJson("PUT", datasetUrlById(shell.id), {
      id: shell.id,
      title: shell.title,
      description: input.datasetDescription,
      version: shell.version ?? "1.0",
      labels: {
        [MARKETPLACE_LABELS.origin]: MARKETPLACE_ORIGIN,
        [MARKETPLACE_LABELS.useCaseId]: useCase.id,
        [MARKETPLACE_LABELS.installedAt]: new Date().toISOString(),
        [MARKETPLACE_LABELS.catalogVersion]: await getRepoListVersion(),
        ...input.extraLabels,
      },
      dataStructureRefs,
      dataSourceRefs: [],
      dataSinkRefs: [],
      mappingRefs: [],
      pipelineRefs: [],
    }),
  );

  return { dataSet, created: true };
}

// ── Read/delete side: Model Forge as the source of truth for installed use cases ──

/** Fetch a single DataSet (incl. labels) by its CORE URN. */
async function fetchDataSetById(id: string): Promise<ModelForgeDataSet | null> {
  const response = await modelForgeFetch(datasetUrlById(id), { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new ModelForgeError(`Model Forge returned ${response.status}${payload ? `: ${payload}` : ""}`, 502);
  }
  return modelForgeDataSetSchema.parse(await response.json());
}

const searchHitSchema = z.object({ id: z.string() });

/**
 * Every DataSet the marketplace created, read back from Model Forge by its
 * provenance label. This — not a local file — is the installed-use-case list.
 */
export async function listMarketplaceDataSets(): Promise<ModelForgeDataSet[]> {
  const label = `${MARKETPLACE_LABELS.origin}=${MARKETPLACE_ORIGIN}`;
  const response = await modelForgeFetch(
    `/api/v1/artifacts/search?type=dataset&label=${encodeURIComponent(label)}`,
    { method: "GET" },
  );
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new ModelForgeError(`Model Forge returned ${response.status}${payload ? `: ${payload}` : ""}`, 502);
  }
  const hits = z.array(searchHitSchema).parse(await response.json());
  const dataSets = await Promise.all(hits.map((hit) => fetchDataSetById(hit.id)));
  return dataSets.filter((ds): ds is ModelForgeDataSet => ds !== null);
}

/**
 * Delete a use case's artifacts from Model Forge: the DataSet first, then each
 * referenced DataStructure (forced, since the now-deleted DataSet referenced them).
 * Returns false when the DataSet no longer exists.
 */
export async function deleteUseCaseArtifacts(datasetId: string): Promise<boolean> {
  const dataSet = await fetchDataSetById(datasetId);
  if (!dataSet) return false;

  const del = async (path: string) => {
    const response = await modelForgeFetch(path, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const payload = await response.text().catch(() => "");
      throw new ModelForgeError(`Model Forge DELETE ${path} → ${response.status}${payload ? `: ${payload}` : ""}`, 502);
    }
  };

  await del(datasetUrlById(dataSet.id));
  for (const ref of dataSet.dataStructureRefs) {
    await del(`/api/v1/datastructures?id=${encodeURIComponent(ref)}&force=true`);
  }
  return true;
}
