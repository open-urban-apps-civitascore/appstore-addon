import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getUseCaseById } from "@/lib/getUseCases";
import {
  installedUseCaseListSchema,
  type InstalledUseCaseImportTrace,
  installedUseCaseSchema,
  type InstalledUseCase,
  type ModelForgeDataSet,
} from "@/types/use-cases";

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

function parseUrnNameAndVersion(value: string): { name: string; version: string } {
  const parts = value.split(":");
  if (parts.length >= 2) {
    return {
      name: parts.at(-2) ?? value,
      version: parts.at(-1) ?? "1.0.0",
    };
  }

  return {
    name: value,
    version: "1.0.0",
  };
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

  const dataStructureRefs = modelForgeDataSet?.dataStructureRefs ?? [];
  const createdDataStructures =
    dataStructureRefs.length > 0
      ? dataStructureRefs.map((entry) => parseUrnNameAndVersion(entry))
      : useCase.draftTemplate.dataStructures.map((entry) => ({
          name: entry.name,
          version: entry.version,
        }));

  const created: InstalledUseCase = installedUseCaseSchema.parse({
    id: randomUUID(),
    useCaseId: useCase.id,
    useCaseTitle: useCase.title,
    installedAt: new Date().toISOString(),
    status: "DRAFT",
    source: source ?? (modelForgeDataSet ? "model-forge-dataset-import" : "dummy-marketplace-install"),
    createdDataset: {
      name: modelForgeDataSet?.title ?? useCase.draftTemplate.dataset.name,
      description: modelForgeDataSet?.description ?? useCase.draftTemplate.dataset.description,
      openDataAccess: useCase.draftTemplate.dataset.openDataAccess,
      status: "DRAFT",
    },
    createdDataStructures,
    modelForge: useCase.modelForge,
    lastImportTrace: importTrace,
  });

  const entries = (await readInstalledUseCases()).filter((entry) => entry.useCaseId !== useCaseId);
  entries.push(created);
  await writeInstalledUseCases(entries);

  return created;
}
