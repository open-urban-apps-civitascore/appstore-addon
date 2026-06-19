"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UseCase } from "@/lib/catalog/types";

import { CatalogFilters, type CatalogFilterState } from "./catalog-filters";
import { UseCaseCard } from "./use-case-card";

const INITIAL_FILTERS: CatalogFilterState = {
  search: "",
  category: "all",
  maturity: "all",
  installability: "all",
};

interface UseCaseCatalogProps {
  useCases: UseCase[];
}

export const UseCaseCatalog = ({ useCases }: UseCaseCatalogProps) => {
  const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return useCases.filter((useCase) => {
      if (filters.category !== "all" && useCase.category !== filters.category) return false;
      if (filters.maturity !== "all" && useCase.maturity !== filters.maturity) return false;
      if (filters.installability !== "all" && useCase.installability !== filters.installability)
        return false;
      if (query) {
        const haystack = `${useCase.title} ${useCase.description} ${useCase.publisher}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [useCases, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground">Use Case Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wiederverwendbare Plattform-Bundles anderer Kommunen entdecken, prüfen und in
            CivitasCore installieren.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw />
            Aktualisieren
          </Button>
          <Button size="sm">
            <Plus />
            Use Case einreichen
          </Button>
        </div>
      </div>

      <CatalogFilters value={filters} onChange={setFilters} />

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> von{" "}
        {useCases.length} Use Cases
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((useCase) => (
            <UseCaseCard key={useCase.id} useCase={useCase} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Keine Use Cases für die aktuelle Auswahl gefunden.
        </div>
      )}
    </div>
  );
};
