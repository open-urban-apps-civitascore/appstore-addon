import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitMerge, Send } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { ExportPreview } from "@/components/use-cases/export-preview";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { listInstalledUseCases } from "@/lib/use-case-installations";

/**
 * Export screen — the first step for a municipality that wants to share a use
 * case it runs.
 *
 * NOT FUNCTIONAL: nothing is produced yet. The page shows what the bundle would
 * contain, what stays behind, and how submission is meant to work. Both the
 * export and the submission path still have to be built.
 */
export default async function ExportInstalledUseCasePage({
  params,
}: {
  params: Promise<{ useCaseId: string }>;
}) {
  const { useCaseId } = await params;
  const text = getMarketplaceText();

  const installations = await listInstalledUseCases();
  const installation = installations.find((entry) => entry.useCaseId === useCaseId);

  if (!installation) {
    notFound();
  }

  return (
    <MarketplacePageShell
      breadcrumb={`${text.sidebar.nav.installed} / ${installation.useCaseTitle} / Exportieren`}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Link
          href="/installed"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Zurück zu den installierten Anwendungsfällen
        </Link>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entwurf — noch nicht umgesetzt
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">
            „{installation.useCaseTitle}“ teilen
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Aus dem laufenden Anwendungsfall wird ein portables Bündel. Alles Lokale bleibt
            automatisch zurück — was das Haus verlässt, ist die Beschreibung der Lösung, nie die
            Schlüssel.
          </p>
        </div>

        <ExportPreview installation={installation} />

        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Und dann?</h2>
          <ol className="mt-3 flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Bündel erzeugen</span> — Dateien wie
                oben, in ein Git-Repository Ihrer Kommune.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Einreichen</span> — als Merge Request
                an den Community-Katalog, zusammen mit Kurzbeschreibung und Kontakt.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Kuratiert werden</span> — Prüfung von
                Lizenz, Dokumentation und Plattform-Bedarf, dann gelistet mit Ihrer Kommune als
                Pflegestelle.
              </span>
            </li>
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-dashed p-4">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Send className="size-4" />
              Bündel erzeugen
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitMerge className="size-4" />
              Zur Kuratierung einreichen
            </span>
            <span className="text-xs text-muted-foreground">
              — beides noch nicht funktionsfähig; diese Seite zeigt den geplanten Ablauf.
            </span>
          </div>
        </section>
      </div>
    </MarketplacePageShell>
  );
}
