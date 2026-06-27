import { CalendarClock, Database, FileJson2, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { InstalledUseCase } from "@/types/use-cases";

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
        </div>
        <Badge>{installation.status}</Badge>
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
          <span>Späterer Model-Forge-Importpunkt</span>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          {installation.modelForge.resolvedDatasetEndpoint}
        </p>
      </section>
    </article>
  );
}
