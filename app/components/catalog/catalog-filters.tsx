"use client";

import { Search } from "lucide-react";

export interface CatalogFilterState {
  search: string;
}

interface CatalogFiltersProps {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}

export const CatalogFilters = ({ value, onChange }: CatalogFiltersProps) => {
  const set = <K extends keyof CatalogFilterState>(key: K, next: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-md border bg-card p-4">
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
    </div>
  );
};
