import { FileJson2, KeyRound, Package, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { InstalledUseCase } from "@/types/use-cases";

/**
 * Turn a running installation back into a portable bundle — and show that
 * everything local stays behind.
 *
 * The load-bearing part is the "bleibt zurück" markers: secrets and
 * instance-specific ids rendered as placeholders. That what leaves the house is
 * the recipe and never the keys has to be *shown*, not claimed.
 *
 * APPROXIMATE SOURCE: the file list is derived from the install record. A real
 * export has to read the live artifacts back out of the portal-backend and
 * write an actual bundle; nothing is produced here.
 */

type ExportEntry = {
  path: string;
  kind: string;
  note: string;
  stripped?: string[];
};

function buildExportEntries(installation: InstalledUseCase): ExportEntry[] {
  const entries: ExportEntry[] = [
    {
      path: "core-ir/dataset.json",
      kind: "Manifest",
      note: `Datensatz „${installation.createdDataset.name}“ mit Titel, Beschreibung und Referenzen.`,
      stripped: ["Portal-Backend-ID des Datensatzes", "Projekt-ID der Instanz"],
    },
  ];

  for (const structure of installation.createdDataStructures) {
    entries.push({
      path: `core-ir/${structure.name}.schema.json`,
      kind: "Datenstruktur",
      note: `JSON-Schema, Version ${structure.version}.`,
      stripped: ["serverseitig vergebene $id"],
    });
  }

  entries.push({
    path: "core-ir/pipeline.json",
    kind: "Pipeline",
    note: "Verarbeitungsgraph mit Quelle, Mapping und Senke.",
    stripped: ["Objekt-IDs der Instanz", "Verbindungsdaten der Datenquelle"],
  });

  entries.push({
    path: "catalog-entry.json",
    kind: "Katalog",
    note: "Titel, Zusammenfassung, Kategorien, Pflege- und Lizenzangaben für die Listung.",
  });

  return entries;
}

export function ExportPreview({ installation }: { installation: InstalledUseCase }) {
  const entries = buildExportEntries(installation);
  const strippedTotal = entries.reduce((sum, entry) => sum + (entry.stripped?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border bg-card p-5">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Inhalt des Bündels</h2>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.path} className="rounded-md border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <FileJson2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-sm font-medium text-foreground">{entry.path}</span>
                <Badge variant="outline" className="text-[11px]">
                  {entry.kind}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{entry.note}</p>
              {entry.stripped ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <KeyRound className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-muted-foreground">Bleibt zurück:</span>
                  {entry.stripped.map((item) => (
                    <span
                      key={item}
                      className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 dark:text-amber-300"
                    >
                      {item}
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border bg-emerald-500/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
          <ShieldCheck className="size-4" />
          {strippedTotal} instanzspezifische Angaben verlassen das Haus nicht
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Passwörter, Broker-Adressen und interne IDs sind bauartbedingt nicht Teil des Bündels: Was
          exportiert wird, ist die maschinenlesbare Beschreibung des Anwendungsfalls — nie laufender
          Code und nie Zugangsdaten. Die empfangende Kommune legt beim Installieren ihre eigenen an.
        </p>
      </section>

      {installation.installAnswers && Object.keys(installation.installAnswers).length > 0 ? (
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Wird zur Installationsfrage</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Was Sie bei der Installation angegeben haben, wird im Bündel wieder zur Frage — die
            nächste Kommune beantwortet sie mit ihren eigenen Werten.
          </p>
          <dl className="mt-3 flex flex-col gap-2">
            {Object.entries(installation.installAnswers).map(([question, answer]) => (
              <div key={question} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                <dt className="text-muted-foreground">{question}</dt>
                <dd className="mt-0.5">
                  <span className="font-medium text-muted-foreground line-through">{answer}</span>
                  <span className="ml-2 font-medium text-foreground">→ bleibt offen</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
