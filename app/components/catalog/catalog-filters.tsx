"use client";

import { Search, X } from "lucide-react";

export interface CatalogFilterState {
  search: string;
  category: string;
  coreVersion: string;
}

interface CatalogFiltersProps {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  categories: string[];
  coreVersions: string[];
  onReset: () => void;
}

const selectClass =
  "h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const CatalogFilters = ({
  value,
  onChange,
  categories,
  coreVersions,
  onReset,
}: CatalogFiltersProps) => {
  const set = <K extends keyof CatalogFilterState>(key: K, next: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: next });

  const hasActiveFilters =
    value.search !== "" || value.category !== "" || value.coreVersion !== "";

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-4 rounded-md border bg-card p-4">
      <label className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value.search}
          onChange={(event) => set("search", event.target.value)}
          placeholder="Add-on suchen …"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        <span>Kategorie</span>
        <select
          value={value.category}
          onChange={(event) => set("category", event.target.value)}
          className={selectClass}
        >
          <option value="">Alle Kategorien</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        <span>Core-Version</span>
        <select
          value={value.coreVersion}
          onChange={(event) => set("coreVersion", event.target.value)}
          className={selectClass}
        >
          <option value="">Alle Core-Versionen</option>
          {coreVersions.map((coreVersion) => (
            <option key={coreVersion} value={coreVersion}>
              Civitas/Core {coreVersion}
            </option>
          ))}
        </select>
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          Zurücksetzen
        </button>
      )}
    </div>
  );
};
