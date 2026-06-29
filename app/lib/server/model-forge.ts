import { modelForgeDataSetSchema, type ModelForgeDataSet, type UseCase } from "@/types/use-cases";

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
  const baseUrl = getRequiredEnv("MODELFORGE_BASE_URL").replace(/\/+$/, "");
  return new URL(useCase.modelForge.resolvedDatasetEndpoint, `${baseUrl}/`).toString();
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

/**
 * Ensure the use case's artifacts exist in Model Forge, creating them from the
 * bundle's `draftTemplate` when missing — no pre-seeding required. Idempotent:
 * an already-present dataset (matched by the use case's datasetId) is reused.
 *
 * Note: this assumes the dataset URN Model Forge generates from the dataset
 * title equals `useCase.modelForge.datasetId` (true for the bundled use cases).
 */
export async function provisionUseCaseInModelForge(useCase: UseCase): Promise<ProvisionResult> {
  if (await existsById("/api/v1/datasets", useCase.modelForge.datasetId)) {
    return { dataSet: await getDataSetForUseCase(useCase), created: false };
  }

  const dataStructureRefs: string[] = [];
  for (const structure of useCase.draftTemplate.dataStructures) {
    dataStructureRefs.push(await ensureDataStructure(structure.schema));
  }

  const shell = modelForgeDataSetSchema.parse(
    await sendJson("POST", "/api/v1/datasets", { title: useCase.draftTemplate.dataset.name }),
  );

  const dataSet = modelForgeDataSetSchema.parse(
    await sendJson("PUT", datasetUrlById(shell.id), {
      id: shell.id,
      title: shell.title,
      description: useCase.draftTemplate.dataset.description,
      version: shell.version ?? "1.0",
      dataStructureRefs,
      dataSourceRefs: [],
      dataSinkRefs: [],
      mappingRefs: [],
      pipelineRefs: [],
    }),
  );

  return { dataSet, created: true };
}
