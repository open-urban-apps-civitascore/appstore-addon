import useCaseCatalogData from "@/data/use-cases.json";
import { useCaseCatalogSchema, type UseCase, type UseCaseCatalog } from "@/types/use-cases";

export function getUseCaseCatalog(): UseCaseCatalog {
  return useCaseCatalogSchema.parse(useCaseCatalogData);
}

export function getUseCases(): UseCase[] {
  return getUseCaseCatalog().useCases;
}

export function getUseCaseById(id: string): UseCase | undefined {
  return getUseCases().find((entry) => entry.id === id);
}
