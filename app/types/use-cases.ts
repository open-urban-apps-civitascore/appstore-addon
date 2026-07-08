import { z } from "zod";

export const useCaseMaturitySchema = z.enum(["verified", "operational", "prototype"]);
export const useCaseInstallabilitySchema = z.enum(["direct", "adaptation", "experimental"]);

export const includedArtifactSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["dataset", "datastructure", "datasource", "pipeline"]),
  description: z.string().optional(),
});

export const modelForgeDatasetRefSchema = z.object({
  datasetId: z.string(),
  note: z.string().optional(),
});

export const draftDatasetTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  openDataAccess: z.boolean().default(false),
});

export const modelForgeDataSetSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  version: z.string().nullish(),
  labels: z.record(z.string(), z.string()).nullish(),
  dataStructureRefs: z.array(z.string()).default([]),
  dataSourceRefs: z.array(z.string()).default([]),
  dataSinkRefs: z.array(z.string()).default([]),
  mappingRefs: z.array(z.string()).default([]),
  pipelineRefs: z.array(z.string()).default([]),
});

export const useCaseSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(3),
  summary: z.string(),
  description: z.string(),
  publisher: z.string(),
  categories: z.array(z.string()).default([]),
  maturity: useCaseMaturitySchema,
  installability: useCaseInstallabilitySchema,
  compatibility: z.array(z.string()).min(1),
  requiredCapabilities: z.array(z.string()).default([]),
  installQuestions: z.array(z.string()).default([]),
  includedArtifacts: z.array(includedArtifactSchema).default([]),
  modelForge: modelForgeDatasetRefSchema,
  // The git artifact repo the use case installs from: its CORE-IR bundle is
  // fetched at `gitIdentifier`. Required (all-reference model — the catalog only
  // *references* content, never inlines it). The ref must be an immutable pin — a
  // version tag (v1.2.3) or a commit hash, never a branch — so installs are
  // reproducible (a branch is mutable). Heuristic; real "is it a tag" enforcement
  // needs a CI resolve-check + protected tags on the artifact repo.
  source: z.object({
    repoUrl: z.string().url(),
    gitIdentifier: z
      .string()
      .regex(
        /^(v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?|[0-9a-f]{7,64})$/,
        "gitIdentifier must be an immutable ref — a version tag (v1.2.3) or a commit hash, not a branch",
      ),
  }),
  revoked: z.boolean().optional(),
  revokedReason: z.string().optional(),
});

export const useCaseCatalogSchema = z.object({
  version: z.string(),
  updatedAt: z.string().datetime(),
  useCases: z.array(useCaseSchema),
});

export const installedUseCaseImportTraceSchema = z.object({
  importedAt: z.string().datetime(),
  modelForgeRequest: z.object({
    method: z.enum(["GET", "POST", "PUT"]),
    url: z.string(),
    datasetId: z.string(),
  }),
  modelForgeResponse: modelForgeDataSetSchema,
  localDraft: z.object({
    createdDataset: draftDatasetTemplateSchema.extend({
      status: z.literal("DRAFT"),
    }),
    createdDataStructures: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
    ),
  }),
});

export const installedUseCaseSchema = z.object({
  id: z.string(),
  useCaseId: z.string(),
  useCaseTitle: z.string(),
  installedAt: z.string().datetime(),
  status: z.literal("DRAFT"),
  source: z.enum(["dummy-marketplace-install", "model-forge-dataset-import", "model-forge-created"]),
  createdDataset: draftDatasetTemplateSchema.extend({
    status: z.literal("DRAFT"),
  }),
  createdDataStructures: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  modelForge: modelForgeDatasetRefSchema,
  lastImportTrace: installedUseCaseImportTraceSchema.optional(),
});

export const installedUseCaseListSchema = z.array(installedUseCaseSchema);

export type UseCase = z.infer<typeof useCaseSchema>;
export type UseCaseCatalog = z.infer<typeof useCaseCatalogSchema>;
export type InstalledUseCase = z.infer<typeof installedUseCaseSchema>;
export type ModelForgeDataSet = z.infer<typeof modelForgeDataSetSchema>;
export type InstalledUseCaseImportTrace = z.infer<typeof installedUseCaseImportTraceSchema>;

export const INSTALLED_USE_CASE_SOURCE_LABELS: Record<InstalledUseCase["source"], string> = {
  "dummy-marketplace-install": "Lokaler Demo-Entwurf",
  "model-forge-dataset-import": "Aus Model Forge importiert",
  "model-forge-created": "In Model Forge angelegt",
};

export const USE_CASE_MATURITY_LABELS: Record<z.infer<typeof useCaseMaturitySchema>, string> = {
  verified: "Verifiziert",
  operational: "In Betrieb",
  prototype: "Prototyp",
};

export const USE_CASE_INSTALLABILITY_LABELS: Record<
  z.infer<typeof useCaseInstallabilitySchema>,
  string
> = {
  direct: "Direkt installierbar",
  adaptation: "Anpassung nötig",
  experimental: "Experimentell",
};
