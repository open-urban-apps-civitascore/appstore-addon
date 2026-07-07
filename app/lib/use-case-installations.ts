import { getUseCaseById } from "@/lib/getUseCases";
import {
  deleteUseCaseArtifacts,
  listMarketplaceDataSets,
  MARKETPLACE_LABELS,
} from "@/lib/server/model-forge";
import { parseUrn } from "@/lib/urn";
import {
  installedUseCaseSchema,
  type InstalledUseCase,
  type ModelForgeDataSet,
  type UseCase,
} from "@/types/use-cases";

/** A dataset draft as surfaced in the UI and persisted on an installation. */
export type CreatedDatasetDraft = {
  name: string;
  description: string;
  openDataAccess: boolean;
  status: "DRAFT";
};

/** A datastructure draft (name + version) derived from a use case install. */
export type CreatedDataStructureDraft = {
  name: string;
  version: string;
};

/**
 * Derive the datastructure drafts an install produced, from the URNs the Model
 * Forge dataset references.
 */
export function deriveCreatedDataStructures(
  dataSet?: ModelForgeDataSet,
): CreatedDataStructureDraft[] {
  return (dataSet?.dataStructureRefs ?? []).map((ref) => {
    const { name, version } = parseUrn(ref);
    return { name, version };
  });
}

/** Derive the dataset draft an install produced, preferring Model Forge values. */
export function deriveCreatedDataset(
  useCase: UseCase | undefined,
  dataSet?: ModelForgeDataSet,
): CreatedDatasetDraft {
  return {
    name: dataSet?.title ?? useCase?.title ?? "Unbenannt",
    description: dataSet?.description ?? useCase?.description ?? "",
    openDataAccess: false,
    status: "DRAFT",
  };
}

/**
 * Project a Model Forge DataSet (carrying the marketplace provenance labels) onto
 * the InstalledUseCase view model the UI renders. Model Forge is the source of
 * truth: the use case is resolved from the `civitas:useCaseId` label, falling back
 * to the catalog for human-readable metadata.
 */
async function toInstalledUseCase(
  dataSet: ModelForgeDataSet,
  source: InstalledUseCase["source"] = "model-forge-created",
): Promise<InstalledUseCase> {
  const labels = dataSet.labels ?? {};
  const useCaseId = labels[MARKETPLACE_LABELS.useCaseId] ?? dataSet.id;
  const useCase = await getUseCaseById(useCaseId);
  const installedAt = labels[MARKETPLACE_LABELS.installedAt] ?? new Date().toISOString();

  return installedUseCaseSchema.parse({
    id: dataSet.id,
    useCaseId,
    useCaseTitle: useCase?.title ?? dataSet.title,
    installedAt,
    status: "DRAFT",
    source,
    createdDataset: deriveCreatedDataset(useCase, dataSet),
    createdDataStructures: deriveCreatedDataStructures(dataSet),
    modelForge: useCase?.modelForge ?? { datasetId: dataSet.id },
  });
}

/**
 * The installed use cases, read back from Model Forge by their provenance label —
 * there is no local store. Newest first.
 */
export async function listInstalledUseCases(): Promise<InstalledUseCase[]> {
  const dataSets = await listMarketplaceDataSets();
  const installed = await Promise.all(dataSets.map((dataSet) => toInstalledUseCase(dataSet)));
  return installed.sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

/**
 * Build the InstalledUseCase view for a freshly provisioned dataset. Pure — the
 * artifacts (and their labels) were already written to Model Forge by the install.
 */
export async function installUseCaseById(
  _useCaseId: string,
  dataSet: ModelForgeDataSet,
  source: InstalledUseCase["source"],
): Promise<InstalledUseCase> {
  return toInstalledUseCase(dataSet, source);
}

/**
 * Uninstall = delete the use case's artifacts from Model Forge. The dataset is
 * located by its `civitas:useCaseId` label (robust against the server-owned URN
 * differing from the catalog id). Returns false when nothing is installed.
 */
export async function removeInstalledUseCaseById(useCaseId: string): Promise<boolean> {
  const dataSets = await listMarketplaceDataSets();
  const match = dataSets.find(
    (dataSet) => (dataSet.labels?.[MARKETPLACE_LABELS.useCaseId] ?? null) === useCaseId,
  );
  if (!match) return false;
  return deleteUseCaseArtifacts(match.id);
}
