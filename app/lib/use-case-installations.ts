import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getUseCaseById } from "@/lib/getUseCases";
import { parseUrn } from "@/lib/urn";
import {
  installedUseCaseListSchema,
  type InstalledUseCaseImportTrace,
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
 * Derive the datastructure drafts an install produced. Prefers the URNs the
 * Model Forge dataset actually references; falls back to the catalog template
 * when the dataset has none. Single source of truth for both the persisted
 * record and the import trace.
 */
export function deriveCreatedDataStructures(
  useCase: UseCase,
  dataSet?: ModelForgeDataSet,
): CreatedDataStructureDraft[] {
  const refs = dataSet?.dataStructureRefs ?? [];
  if (refs.length > 0) {
    return refs.map((ref) => {
      const { name, version } = parseUrn(ref);
      return { name, version };
    });
  }

  return useCase.draftTemplate.dataStructures.map((entry) => ({
    name: entry.name,
    version: entry.version,
  }));
}

/** Derive the dataset draft an install produced, preferring Model Forge values. */
export function deriveCreatedDataset(
  useCase: UseCase,
  dataSet?: ModelForgeDataSet,
): CreatedDatasetDraft {
  return {
    name: dataSet?.title ?? useCase.draftTemplate.dataset.name,
    description: dataSet?.description ?? useCase.draftTemplate.dataset.description,
    openDataAccess: useCase.draftTemplate.dataset.openDataAccess,
    status: "DRAFT",
  };
}

const INSTALLATIONS_FILE = path.join(process.cwd(), "data", "installed-use-cases.json");

async function readInstalledUseCases(): Promise<InstalledUseCase[]> {
  try {
    const raw = await readFile(INSTALLATIONS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return installedUseCaseListSchema.parse(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeInstalledUseCases(entries: InstalledUseCase[]): Promise<void> {
  await writeFile(INSTALLATIONS_FILE, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function listInstalledUseCases(): Promise<InstalledUseCase[]> {
  const entries = await readInstalledUseCases();
  return [...entries].sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

export async function removeInstalledUseCaseById(useCaseId: string): Promise<boolean> {
  const entries = await readInstalledUseCases();
  const nextEntries = entries.filter((entry) => entry.useCaseId !== useCaseId);

  if (nextEntries.length === entries.length) {
    return false;
  }

  await writeInstalledUseCases(nextEntries);
  return true;
}

export async function installUseCaseById(
  useCaseId: string,
  modelForgeDataSet?: ModelForgeDataSet,
  importTrace?: InstalledUseCaseImportTrace,
  source?: InstalledUseCase["source"],
): Promise<InstalledUseCase> {
  const useCase = getUseCaseById(useCaseId);
  if (!useCase) {
    throw new Error(`Unknown use case '${useCaseId}'`);
  }

  const created: InstalledUseCase = installedUseCaseSchema.parse({
    id: randomUUID(),
    useCaseId: useCase.id,
    useCaseTitle: useCase.title,
    installedAt: new Date().toISOString(),
    status: "DRAFT",
    source: source ?? (modelForgeDataSet ? "model-forge-dataset-import" : "dummy-marketplace-install"),
    createdDataset: deriveCreatedDataset(useCase, modelForgeDataSet),
    createdDataStructures: deriveCreatedDataStructures(useCase, modelForgeDataSet),
    modelForge: useCase.modelForge,
    lastImportTrace: importTrace,
  });

  const entries = (await readInstalledUseCases()).filter((entry) => entry.useCaseId !== useCaseId);
  entries.push(created);
  await writeInstalledUseCases(entries);

  return created;
}
