import { getRepoListUseCases } from "@/lib/server/repo-list";
import type { UseCase } from "@/types/use-cases";

/** Use cases from the repo-list (remote index, cached; bundled seed offline). */
export async function getUseCases(): Promise<UseCase[]> {
  return getRepoListUseCases();
}

export async function getUseCaseById(id: string): Promise<UseCase | undefined> {
  return (await getUseCases()).find((entry) => entry.id === id);
}
