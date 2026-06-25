"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Addon } from "@/types/catalog";

import { CatalogFilters, type CatalogFilterState } from "./catalog-filters";
import { AddonCard } from "./addon-card";

const INITIAL_FILTERS: CatalogFilterState = {
  search: "",
};

interface AddonCatalogProps {
  addons: Addon[];
}

export const AddonCatalog = ({ addons }: AddonCatalogProps) => {
  const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!query) return addons;

    return addons.filter((addon) => {
      const haystack = `${addon.name} ${addon.description} ${addon.author}`.toLowerCase();
      if (!haystack.includes(query)) return false;
      return true;
    });
  }, [addons, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground">Add-on Katalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zentrale Komponenten, Adapter und Tools für deinen CivitasCore Cluster finden und installieren.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Aktualisieren
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add-on einreichen
          </Button>
        </div>
      </div>

      <CatalogFilters value={filters} onChange={setFilters} />

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> von{" "}
        {addons.length} Add-ons
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((addon) => (
            <AddonCard key={addon.id} addon={addon} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Keine Add-ons für die aktuelle Suche gefunden.
        </div>
      )}
    </div>
  );
};
