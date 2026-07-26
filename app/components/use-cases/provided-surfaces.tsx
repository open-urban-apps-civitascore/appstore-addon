import { BarChart3, Download, ExternalLink, Map, Radio, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PROVIDED_SURFACE_KIND_LABELS, type ProvidedSurface } from "@/types/use-cases";

/**
 * "Was dieser Anwendungsfall bereitstellt" — the visible value a use case
 * delivers once it runs: a data API, a dashboard, a map. Without this panel an
 * installation is plumbing the user cannot see.
 *
 * Two flavours:
 *   - on the catalog detail page (`datasetId` absent) it reads as a promise
 *   - on an installation (`datasetId` present) the URLs resolve and become links
 *
 * INCOMPLETE: only the data API is actually produced by an install today.
 * Dashboards and maps can be declared, but nothing creates them yet — a bundle
 * cannot carry a dashboard, and the PostGIS/GeoServer path is not wired up.
 * Anything not yet real is labelled as such, never faked.
 */

const KIND_ICONS = {
  api: Radio,
  dashboard: BarChart3,
  map: Map,
  download: Download,
} as const;

function resolveUrl(surface: ProvidedSurface, datasetId?: string): string | undefined {
  if (!surface.urlTemplate) return undefined;
  if (!surface.urlTemplate.includes("{datasetId}")) return surface.urlTemplate;
  if (!datasetId) return undefined;
  return surface.urlTemplate.replace("{datasetId}", datasetId);
}

export function ProvidedSurfaces({
  surfaces,
  datasetId,
  isDemoData = false,
  title = "Was dieser Anwendungsfall bereitstellt",
}: {
  surfaces: ProvidedSurface[];
  /** Portal-backend dataset id of a concrete installation, if there is one. */
  datasetId?: string;
  isDemoData?: boolean;
  title?: string;
}) {
  if (surfaces.length === 0) return null;

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {isDemoData ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Sparkles className="size-3.5" />
            Läuft auf Demo-Daten
          </span>
        ) : null}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {surfaces.map((surface) => {
          const Icon = KIND_ICONS[surface.kind];
          const url = resolveUrl(surface, datasetId);

          return (
            <li
              key={`${surface.kind}-${surface.label}`}
              className="flex items-start gap-3 rounded-md border bg-background p-3"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{surface.label}</span>
                  <Badge variant="outline" className="text-[11px]">
                    {PROVIDED_SURFACE_KIND_LABELS[surface.kind]}
                  </Badge>
                  {surface.standard ? (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {surface.standard}
                    </Badge>
                  ) : null}
                </div>
                {surface.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">{surface.note}</p>
                ) : null}
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 break-all font-mono text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {url}
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {datasetId
                      ? "Wird bereitgestellt, sobald die zugehörige Komponente eingerichtet ist."
                      : "Steht nach der Installation zur Verfügung."}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
