"use client";

import { useMemo, useState, type ReactNode } from "react";

import { CatalogFilters, type CatalogFilterState } from "@/components/catalog/catalog-filters";
import { UseCaseCard } from "@/components/use-cases/use-case-card";
import type { UseCase } from "@/types/use-cases";

interface UseCaseCatalogProps {
  useCases: UseCase[];
  heading: string;
  subtitle: string;
  countLabel: string;
  noResultsLabel: string;
  searchPlaceholder: string;
  /** Optional freshness line (repo-list "catalog as of …") rendered under the heading. */
  freshness?: ReactNode;
  /** Deep-link state: the landing page's search form and category chips land here. */
  initialSearch?: string;
  initialCategory?: string;
}

export const UseCaseCatalog = ({
  useCases,
  heading,
  subtitle,
  countLabel,
  noResultsLabel,
  searchPlaceholder,
  freshness,
  initialSearch = "",
  initialCategory = "",
}: UseCaseCatalogProps) => {
  const [filters, setFilters] = useState<CatalogFilterState>({
    search: initialSearch,
    category: initialCategory,
  });

  const categories = useMemo(
    () => Array.from(new Set(useCases.flatMap((useCase) => useCase.categories))).sort(),
    [useCases],
  );

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return useCases.filter((useCase) => {
      if (query) {
        const haystack =
          `${useCase.title} ${useCase.summary} ${useCase.publisher} ${useCase.categories.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (filters.category && !useCase.categories.includes(filters.category)) {
        return false;
      }

      return true;
    });
  }, [useCases, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {freshness ? <div className="mt-2">{freshness}</div> : null}
      </div>

      <CatalogFilters
        value={filters}
        onChange={setFilters}
        categories={categories}
        searchPlaceholder={searchPlaceholder}
      />

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> {countLabel}{" "}
        {useCases.length}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((useCase) => (
            <UseCaseCard key={useCase.id} useCase={useCase} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          {noResultsLabel}
        </div>
      )}
    </div>
  );
};
