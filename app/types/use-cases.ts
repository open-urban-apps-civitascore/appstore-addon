import { z } from "zod";

export const useCaseMaturitySchema = z.enum(["verified", "operational", "prototype"]);
export const useCaseInstallabilitySchema = z.enum(["direct", "adaptation", "experimental"]);

export const includedArtifactSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["dataset", "datastructure", "datasource", "pipeline"]),
  description: z.string().optional(),
});

// A reference to a CORE dataset (its URN), carried by a catalog use case — the
// platform-level identity of the use case's dataset, not an install target.
// NOTE: the catalog JSON key stays `modelForge` (see `useCaseSchema` below) for
// backward compatibility with published index.json data; the catalog schema is out
// of scope to change. Only this internal schema/type name is de-Model-Forge'd.
export const datasetReferenceSchema = z.object({
  datasetId: z.string(),
  note: z.string().optional(),
});

// The lifecycle state of a portal-backend dataset, projected onto the app:
// DRAFT → (stage) → READY → (release, async) → AVAILABLE. PROVISIONING is an
// app-level pseudo-state for "release accepted (202) / saga in flight" before the
// dataset reaches AVAILABLE.
export const datasetLifecycleStatusSchema = z.enum([
  "DRAFT",
  "READY",
  "PROVISIONING",
  "AVAILABLE",
]);

export const draftDatasetTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  openDataAccess: z.boolean().default(false),
});

// A concrete building block a use case needs (mirrors the marketplace taxonomy:
// Add-on / Plugin / Connector). Backward compatible: a legacy bare-string entry
// is coerced to a generic connector block so existing catalog data still parses
// (the remote index is validated with `.parse()`, which throws on any mismatch).
export const requiredBuildingBlockSchema = z.union([
  z.object({
    kind: z.enum(["addon", "plugin", "connector"]),
    name: z.string(),
  }),
  z.string().transform((name) => ({ kind: "connector" as const, name })),
]);

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
  requiredCapabilities: z.array(requiredBuildingBlockSchema).default([]),
  installQuestions: z.array(z.string()).default([]),
  includedArtifacts: z.array(includedArtifactSchema).default([]),
  // Catalog JSON key kept as `modelForge` for backward compatibility (see
  // `datasetReferenceSchema`); it is a reference to the use case's CORE dataset URN.
  modelForge: datasetReferenceSchema,
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

// A lightweight, ordered trace of the portal-backend provisioning sequence,
// surfaced in the UI (replaces the old single-request Model Forge import trace).
// Each step is one REST call the install orchestrator made.
export const provisioningStepSchema = z.object({
  label: z.string(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
});

export const provisioningTraceSchema = z.object({
  provisionedAt: z.string().datetime(),
  steps: z.array(provisioningStepSchema),
});

// Server-assigned ids of everything an install created on the portal-backend.
// Persisted so uninstall can run the verified bottom-up delete cascade
// (pipeline → datasink → dataset → datasource → datastructures) — references
// block deletion hard (400/409), so each id must be removed individually.
export const provisionedResourcesSchema = z.object({
  dataStructures: z.array(
    z.object({
      id: z.string(),
      versionId: z.string(),
      name: z.string(),
      version: z.string(),
    }),
  ),
  dataSourceId: z.string().optional(),
  dataSinkId: z.string().optional(),
  pipelineId: z.string().optional(),
});

export const installedUseCaseSchema = z.object({
  id: z.string(),
  useCaseId: z.string(),
  useCaseTitle: z.string(),
  installedAt: z.string().datetime(),
  status: datasetLifecycleStatusSchema,
  // Every install now goes through the CivitasCore portal-backend. The retired
  // Model Forge sources (`model-forge-created`, `model-forge-dataset-import`) are
  // gone; local install state is new, so there are no legacy records to parse.
  source: z.enum(["portal-backend"]),
  createdDataset: draftDatasetTemplateSchema.extend({
    status: datasetLifecycleStatusSchema,
  }),
  createdDataStructures: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  // The use case's CORE dataset reference (URN), carried for display/traceability.
  datasetRef: datasetReferenceSchema,
  // Answers the installer gave to the bundle's installQuestions (keyed by the
  // question text). Free text — never secrets (broker credentials go only into
  // the backend datasource configuration, per D3).
  installAnswers: z.record(z.string(), z.string()).optional(),
  provisioningTrace: provisioningTraceSchema.optional(),
  // Absent on records written before the delete-cascade support; uninstall then
  // falls back to removing only the dataset.
  provisionedResources: provisionedResourcesSchema.optional(),
});

export const installedUseCaseListSchema = z.array(installedUseCaseSchema);

export type UseCase = z.infer<typeof useCaseSchema>;
export type RequiredBuildingBlock = z.infer<typeof requiredBuildingBlockSchema>;
export type UseCaseCatalog = z.infer<typeof useCaseCatalogSchema>;
export type InstalledUseCase = z.infer<typeof installedUseCaseSchema>;
export type DatasetReference = z.infer<typeof datasetReferenceSchema>;
export type DatasetLifecycleStatus = z.infer<typeof datasetLifecycleStatusSchema>;
export type ProvisioningStep = z.infer<typeof provisioningStepSchema>;
export type ProvisioningTrace = z.infer<typeof provisioningTraceSchema>;
export type ProvisionedResources = z.infer<typeof provisionedResourcesSchema>;

export const INSTALLED_USE_CASE_SOURCE_LABELS: Record<InstalledUseCase["source"], string> = {
  "portal-backend": "Über das Portal-Backend bereitgestellt",
};

// German labels for the dataset lifecycle status shown on an installation.
export const DATASET_LIFECYCLE_STATUS_LABELS: Record<DatasetLifecycleStatus, string> = {
  DRAFT: "Entwurf",
  READY: "Bereit",
  PROVISIONING: "Wird provisioniert",
  AVAILABLE: "Verfügbar",
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

// Clean, fixed labels for the artifact type badges in the technical spec list.
// These are platform vocabulary (they mirror the URN <type> segment), so they
// stay in their canonical English form rather than being localized.
export const INCLUDED_ARTIFACT_KIND_LABELS: Record<
  z.infer<typeof includedArtifactSchema>["kind"],
  string
> = {
  dataset: "Dataset",
  datastructure: "Datastructure",
  datasource: "Data Source",
  pipeline: "Pipeline",
};
