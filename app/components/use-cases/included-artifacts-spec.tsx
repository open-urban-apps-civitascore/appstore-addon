import { Boxes } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { parseUrn } from "@/lib/urn";
import { INCLUDED_ARTIFACT_KIND_LABELS, type UseCase } from "@/types/use-cases";

interface IncludedArtifactsSpecProps {
  title: string;
  artifacts: UseCase["includedArtifacts"];
  /** Dataset-level ModelForge URN, pinned at the bottom for traceability. */
  urn: string;
}

/**
 * Technical spec of a use case: its ModelForge artifacts rendered as a compact,
 * scannable list — a fixed-width mono type badge, the artifact title, and the
 * version parsed out of the artifact's own URN — with the dataset URN pinned
 * below. Replaces the earlier one-card-per-artifact layout so a use case with
 * many artifacts stays readable at a glance.
 */
export function IncludedArtifactsSpec({ title, artifacts, urn }: IncludedArtifactsSpecProps) {
  return (
    <div className="rounded-md border bg-card p-6">
      <div className="flex items-center gap-2">
        <Boxes className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

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
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          ModelForge URN
        </p>
        <p className="mt-1 break-all font-mono text-xs text-foreground/80">{urn}</p>
      </div>
    </div>
  );
}
