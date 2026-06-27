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
  resolvedDatasetEndpoint: z.string(),
  note: z.string().optional(),
});

export const draftDatasetTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  openDataAccess: z.boolean().default(false),
});

export const draftDataStructureTemplateSchema = z.object({
  name: z.string(),
  version: z.string(),
  schema: z.record(z.string(), z.unknown()),
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
  draftTemplate: z.object({
    dataset: draftDatasetTemplateSchema,
    dataStructures: z.array(draftDataStructureTemplateSchema).default([]),
  }),
});

export const useCaseCatalogSchema = z.object({
  version: z.string(),
  updatedAt: z.string().datetime(),
  useCases: z.array(useCaseSchema),
});

export const installedUseCaseSchema = z.object({
  id: z.string(),
  useCaseId: z.string(),
  useCaseTitle: z.string(),
  installedAt: z.string().datetime(),
  status: z.literal("DRAFT"),
  source: z.literal("dummy-marketplace-install"),
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
});

export const installedUseCaseListSchema = z.array(installedUseCaseSchema);

export type UseCase = z.infer<typeof useCaseSchema>;
export type UseCaseCatalog = z.infer<typeof useCaseCatalogSchema>;
export type InstalledUseCase = z.infer<typeof installedUseCaseSchema>;

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
