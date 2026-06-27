import { CalendarClock, Database, FileJson2, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { RemoveInstalledUseCaseButton } from "@/components/use-cases/remove-installed-use-case-button";
import {
  INSTALLED_USE_CASE_SOURCE_LABELS,
  type InstalledUseCase,
} from "@/types/use-cases";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function UseCaseInstallationCard({ installation }: { installation: InstalledUseCase }) {
  return (
    <article className="flex flex-col gap-4 rounded-md border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{installation.useCaseTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{installation.createdDataset.description}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {INSTALLED_USE_CASE_SOURCE_LABELS[installation.source]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Badge>{installation.status}</Badge>
          <RemoveInstalledUseCaseButton useCaseId={installation.useCaseId} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="size-4" />
            <span>Datensatz</span>
          </div>
          <p className="mt-2 font-medium text-foreground">{installation.createdDataset.name}</p>
        </div>
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileJson2 className="size-4" />
            <span>Datenstrukturen</span>
          </div>
          <p className="mt-2 font-medium text-foreground">
            {installation.createdDataStructures.length}
          </p>
        </div>
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="size-4" />
            <span>Installiert</span>
          </div>
          <p className="mt-2 font-medium text-foreground">
            {formatTimestamp(installation.installedAt)}
          </p>
        </div>
      </div>

      <section className="rounded-md border bg-background p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="size-4" />
          <span>Model-Forge-Quelldatensatz</span>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          {installation.modelForge.resolvedDatasetEndpoint}
        </p>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          {installation.modelForge.datasetId}
        </p>
      </section>

      {installation.lastImportTrace ? (
        <details className="rounded-md border bg-background p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Importprotokoll anzeigen
          </summary>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model Forge Request
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
                <code>{JSON.stringify(installation.lastImportTrace.modelForgeRequest, null, 2)}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model Forge Response
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
                <code>{JSON.stringify(installation.lastImportTrace.modelForgeResponse, null, 2)}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lokaler Draft
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
                <code>{JSON.stringify(installation.lastImportTrace.localDraft, null, 2)}</code>
              </pre>
            </div>
          </div>
        </details>
      ) : null}
    </article>
  );
}
