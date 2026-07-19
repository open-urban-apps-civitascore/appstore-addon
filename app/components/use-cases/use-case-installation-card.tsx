import { CalendarClock, Database, FileJson2, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { RemoveInstalledUseCaseButton } from "@/components/use-cases/remove-installed-use-case-button";
import {
  DATASET_LIFECYCLE_STATUS_LABELS,
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
          <Badge>{DATASET_LIFECYCLE_STATUS_LABELS[installation.status]}</Badge>
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
          <span>Portal-Backend-DataSet</span>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{installation.id}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Referenzierter CORE-Datensatz:{" "}
          <span className="break-all font-mono">{installation.datasetRef.datasetId}</span>
        </p>
      </section>

      {installation.installAnswers && Object.keys(installation.installAnswers).length > 0 ? (
        <section className="rounded-md border bg-background p-4">
          <p className="text-sm font-medium text-foreground">Angaben bei der Installation</p>
          <dl className="mt-2 flex flex-col gap-2">
            {Object.entries(installation.installAnswers).map(([question, answer]) => (
              <div key={question} className="text-xs">
                <dt className="text-muted-foreground">{question}</dt>
                <dd className="mt-0.5 font-medium text-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {installation.provisioningTrace ? (
        <details className="rounded-md border bg-background p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Provisionierungsprotokoll anzeigen
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Aufrufreihenfolge gegen das Portal-Backend ({formatTimestamp(installation.provisioningTrace.provisionedAt)})
          </p>
          <ol className="mt-3 flex flex-col gap-1">
            {installation.provisioningTrace.steps.map((traceStep, index) => (
              <li
                key={`${traceStep.method}-${traceStep.path}-${index}`}
                className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-xs"
              >
                <span className="w-5 shrink-0 text-right font-mono text-muted-foreground">
                  {index + 1}
                </span>
                <Badge
                  variant="outline"
                  className="w-14 shrink-0 justify-center font-mono text-[11px]"
                >
                  {traceStep.status}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {traceStep.label}
                </span>
                <span className="hidden shrink-0 font-mono text-muted-foreground sm:inline">
                  {traceStep.method} {traceStep.path}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
