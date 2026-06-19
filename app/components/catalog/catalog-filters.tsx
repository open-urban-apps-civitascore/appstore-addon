"use client";

import { Search } from "lucide-react";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import {
  CATEGORY_LABELS,
  INSTALLABILITY_FILTER_LABELS,
  type Installability,
  type Maturity,
  MATURITY_LABELS,
  type UseCaseCategory,
} from "@/lib/catalog/types";

export type CategoryFilter = UseCaseCategory | "all";
export type MaturityFilter = Maturity | "all";
export type InstallabilityFilter = Installability | "all";

export interface CatalogFilterState {
  search: string;
  category: CategoryFilter;
  maturity: MaturityFilter;
  installability: InstallabilityFilter;
}

interface CatalogFiltersProps {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}

const MATURITY_OPTIONS: SegmentedOption<MaturityFilter>[] = [
  { value: "all", label: "Alle" },
  { value: "verified", label: MATURITY_LABELS.verified },
  { value: "operational", label: MATURITY_LABELS.operational },
  { value: "prototype", label: MATURITY_LABELS.prototype },
];

const INSTALLABILITY_OPTIONS: SegmentedOption<InstallabilityFilter>[] = [
  { value: "all", label: "Alle" },
  { value: "direct", label: INSTALLABILITY_FILTER_LABELS.direct },
  { value: "adaptation", label: INSTALLABILITY_FILTER_LABELS.adaptation },
  { value: "experimental", label: INSTALLABILITY_FILTER_LABELS.experimental },
];

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
          placeholder="Use Case suchen …"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      <Field label="Kategorie">
        <select
          value={value.category}
          onChange={(event) => set("category", event.target.value as CategoryFilter)}
          className="h-9 w-48 cursor-pointer rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="all">Alle Kategorien</option>
          {(Object.keys(CATEGORY_LABELS) as UseCaseCategory[]).map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Reife">
        <SegmentedControl
          ariaLabel="Reife"
          options={MATURITY_OPTIONS}
          value={value.maturity}
          onChange={(next) => set("maturity", next)}
        />
      </Field>

      <Field label="Installierbarkeit">
        <SegmentedControl
          ariaLabel="Installierbarkeit"
          options={INSTALLABILITY_OPTIONS}
          value={value.installability}
          onChange={(next) => set("installability", next)}
        />
      </Field>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    {children}
  </div>
);
