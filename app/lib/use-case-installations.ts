import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getUseCaseById } from "@/lib/getUseCases";
import {
  installedUseCaseListSchema,
  installedUseCaseSchema,
  type InstalledUseCase,
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

export async function installUseCaseById(useCaseId: string): Promise<InstalledUseCase> {
  const useCase = getUseCaseById(useCaseId);
  if (!useCase) {
    throw new Error(`Unknown use case '${useCaseId}'`);
  }

  const existing = (await readInstalledUseCases()).find((entry) => entry.useCaseId === useCaseId);
  if (existing) {
    return existing;
  }

  const created: InstalledUseCase = installedUseCaseSchema.parse({
    id: randomUUID(),
    useCaseId: useCase.id,
    useCaseTitle: useCase.title,
    installedAt: new Date().toISOString(),
    status: "DRAFT",
    source: "dummy-marketplace-install",
    createdDataset: {
      ...useCase.draftTemplate.dataset,
      status: "DRAFT",
    },
    createdDataStructures: useCase.draftTemplate.dataStructures.map((entry) => ({
      name: entry.name,
      version: entry.version,
    })),
    modelForge: useCase.modelForge,
  });

  const entries = await readInstalledUseCases();
  entries.push(created);
  await writeInstalledUseCases(entries);

  return created;
}
