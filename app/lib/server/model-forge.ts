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
