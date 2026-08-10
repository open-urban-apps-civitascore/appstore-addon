import { Boxes, Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { parseUrn } from "@/lib/urn";
import { INCLUDED_ARTIFACT_KIND_LABELS, type UseCase } from "@/types/use-cases";

interface IncludedArtifactsSpecProps {
  title: string;
  artifacts: UseCase["includedArtifacts"];
  /** Dataset-level CORE URN, pinned at the bottom for traceability. */
  urn: string;
}

/**
 * Technical spec of a use case: its CORE artifacts rendered as a compact,
 * scannable list — a fixed-width mono type badge, the artifact title, and the
 * version parsed out of the artifact's own URN — with the dataset URN pinned
 * below.
 *
 * Each artifact may declare what it additionally needs in the real world
 * (sensors, hardware, external registers). That is the honest counterpart to
 * "install and it runs": the install creates the artifact, but with productive
 * data it only fills up once those exist (Ewa, 2026-08-07).
 */
export function IncludedArtifactsSpec({ title, artifacts, urn }: IncludedArtifactsSpecProps) {
  const hasPrerequisites = artifacts.some((artifact) => artifact.requires.length > 0);

  return (
    <div className="rounded-md border bg-card p-6">
      <div className="flex items-center gap-2">
        <Boxes className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      {hasPrerequisites ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Was das Paket anlegt — und was Sie für den Betrieb mit echten Daten zusätzlich
          brauchen.
        </p>
      ) : null}

      <ul className="mt-4">
        {artifacts.map((artifact) => {
          const { version, isVersioned } = parseUrn(artifact.id);
          return (
            <li key={artifact.id} className="border-b py-3 last:border-b-0">
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className="w-32 shrink-0 justify-center bg-muted font-mono text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  {INCLUDED_ARTIFACT_KIND_LABELS[artifact.kind]}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {artifact.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {isVersioned ? `v${version}` : "v—"}
                </span>
              </div>
              {artifact.description ? (
                <p className="mt-1 pl-0 text-sm text-muted-foreground sm:pl-36">
                  {artifact.description}
                </p>
              ) : null}

              {/* Amber, like the fit check's "fehlt noch" rows: across the whole
                  technical zone amber answers one question — was müssen Sie noch
                  beisteuern? Kept light on purpose: needing sensors is a plan
                  item, not a defect. */}
              {artifact.requires.length > 0 ? (
                <div className="mt-2 sm:pl-36">
                  <div className="rounded-md border border-l-4 border-amber-200 border-l-amber-500 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:border-l-amber-600 dark:bg-amber-950/25">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                      <Plug aria-hidden className="size-3.5" />
                      Für echte Daten zusätzlich nötig
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {artifact.requires.map((requirement) => (
                        <li
                          key={requirement.label}
                          className="text-xs text-amber-900/75 dark:text-amber-200/75"
                        >
                          <span className="font-medium text-amber-950 dark:text-amber-100">
                            {requirement.label}
                          </span>
                          {requirement.note ? <> — {requirement.note}</> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          CORE Dataset URN
        </p>
        <p className="mt-1 break-all font-mono text-xs text-foreground/80">{urn}</p>
      </div>
    </div>
  );
}
