"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { cn } from "@/lib/utils";

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
}

// How many category pills to show before collapsing behind a "+N weitere" toggle.
const COLLAPSED_CATEGORY_COUNT = 8;

function FilterPills({
  ariaLabel,
  options,
  value,
  onChange,
  trailing,
}: {
  ariaLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  trailing?: ReactNode;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}

export const CatalogFilters = ({
  value,
  onChange,
  categories,
  coreVersions,
}: CatalogFiltersProps) => {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const set = <K extends keyof CatalogFilterState>(key: K, next: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: next });

  const hasMoreCategories = categories.length > COLLAPSED_CATEGORY_COUNT;
  const visibleCategories =
    showAllCategories || !hasMoreCategories
      ? categories
      : (() => {
          const base = categories.slice(0, COLLAPSED_CATEGORY_COUNT);
          // Keep the active category visible even if it sits past the cut-off.
          if (value.category && !base.includes(value.category)) base.push(value.category);
          return base;
        })();
  const hiddenCount = categories.length - visibleCategories.length;

  const categoryOptions = [
    { value: "", label: "Alle" },
    ...visibleCategories.map((category) => ({ value: category, label: category })),
  ];
  const versionOptions = [
    { value: "", label: "Alle" },
    ...coreVersions.map((version) => ({ value: version, label: `Core ${version}` })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value.search}
          onChange={(event) => set("search", event.target.value)}
          placeholder="Add-on suchen …"
          className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      {categories.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Kategorie
          </p>
          <FilterPills
            ariaLabel="Kategorie"
            options={categoryOptions}
            value={value.category}
            onChange={(next) => set("category", next)}
            trailing={
              hasMoreCategories ? (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
                >
                  {showAllCategories ? (
                    <>
                      Weniger
                      <ChevronUp className="size-4" />
                    </>
                  ) : (
                    <>
                      {`+${hiddenCount} weitere`}
                      <ChevronDown className="size-4" />
                    </>
                  )}
                </button>
              ) : null
            }
          />
        </div>
      ) : null}

      {coreVersions.length > 1 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Core-Version
          </p>
          <FilterPills
            ariaLabel="Core-Version"
            options={versionOptions}
            value={value.coreVersion}
            onChange={(next) => set("coreVersion", next)}
          />
        </div>
      ) : null}
    </div>
  );
};
