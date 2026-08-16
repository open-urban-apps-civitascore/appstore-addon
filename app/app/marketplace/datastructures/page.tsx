import { Database, Layers } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { listCatalogDataStructures } from "@/lib/datastructures-mock";
import { getMarketplaceText } from "@/lib/marketplace-text";

/**
 * Data structures as their own catalog section (P2.1 direction). Attrappe: the
 * entries are constants and nothing installs yet — the page says so rather than
 * implying a working catalogue.
 */
export default function MarketplaceDataStructuresPage() {
  const text = getMarketplaceText();
  const dataStructures = listCatalogDataStructures();

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.dataStructures}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="max-w-3xl">
          {/* <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Entwurf — noch nicht funktionsfähig
          </p> */}
          <h1 className="mt-1 text-3xl font-bold text-foreground">
            {text.sidebar.nav.dataStructures}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Datenstrukturen legen fest, wie ein Messwert aufgebaut ist. Wer dieselbe Struktur
            nutzt, kann Auswertungen und Anwendungsfälle anderer Kommunen direkt übernehmen —
            deshalb stehen sie hier als eigene Katalogeinträge und nicht nur als Teil eines
            Anwendungsfalls.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {dataStructures.map((dataStructure) => (
            <article
              key={dataStructure.urn}
              className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Database className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {dataStructure.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{dataStructure.publisher}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {dataStructure.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {dataStructure.domain}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="size-3.5" />
                  In {dataStructure.usedByUseCases}{" "}
                  {dataStructure.usedByUseCases === 1 ? "Anwendungsfall" : "Anwendungsfällen"}
                </span>
              </div>

              <p className="break-all font-mono text-[11px] text-muted-foreground/80">
                {dataStructure.urn}
              </p>
            </article>
          ))}
        </div>

        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Attrappe — die Einträge sind Beispiele aus dem Code, nicht aus dem Katalog. Installieren
          ist hier noch nicht möglich.
        </p>
      </div>
    </MarketplacePageShell>
  );
}
