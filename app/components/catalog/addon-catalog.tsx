"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { Addon } from "@/types/addons";

import { CatalogFilters, type CatalogFilterState } from "./catalog-filters";
import { AddonCard } from "./addon-card";

const INITIAL_FILTERS: CatalogFilterState = {
  search: "",
  category: "",
  coreVersion: "",
};

interface AddonCatalogProps {
  addons: Addon[];
  detailsPath?: string;
  heading?: string;
  subtitle?: string;
  countLabel?: string;
  noResultsLabel?: string;
  /** Optional freshness line (repo-list "catalog as of …") rendered under the heading. */
  freshness?: ReactNode;
}

export const AddonCatalog = ({
  addons,
  detailsPath = "/marketplace/addons",
  heading = "Add-on Katalog",
  subtitle = "Zentrale Komponenten, Adapter und Tools für deinen CivitasCore Cluster finden und installieren.",
  countLabel = "von",
  noResultsLabel = "Keine Add-ons für die aktuelle Suche gefunden.",
  freshness,
}: AddonCatalogProps) => {
  const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);

  const categories = useMemo(
    () => Array.from(new Set(addons.flatMap((addon) => addon.categories))).sort(),
    [addons],
  );

  const coreVersions = useMemo(
    () =>
      Array.from(
        new Set(addons.flatMap((addon) => addon.compatibility.map((entry) => entry.coreVersion))),
      ).sort(),
    [addons],
  );

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return addons.filter((addon) => {
      if (query) {
        const haystack =
          `${addon.name} ${addon.description} ${addon.author} ${addon.categories.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (filters.category && !addon.categories.includes(filters.category)) {
        return false;
      }

      if (
        filters.coreVersion &&
        !addon.compatibility.some((entry) => entry.coreVersion === filters.coreVersion)
      ) {
        return false;
      }

      return true;
    });
  }, [addons, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {freshness ? <div className="mt-2">{freshness}</div> : null}
      </div>

      <CatalogFilters
        value={filters}
        onChange={setFilters}
        categories={categories}
        coreVersions={coreVersions}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
        {countLabel} {addons.length}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((addon) => (
            <AddonCard key={addon.id} addon={addon} href={detailsPath} />
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
