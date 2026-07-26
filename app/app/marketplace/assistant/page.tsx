import { Info } from "lucide-react";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { getUseCases } from "@/lib/getUseCases";

/**
 * Assistant page — ask instead of search.
 *
 * PLACEHOLDER: local keyword matching over the catalog, no model involved. The
 * notice below states that on screen, deliberately — implying a capability that
 * does not exist would mislead anyone trying it.
 */
export default async function AssistantPage() {
  const useCases = await getUseCases();

  return (
    <MarketplacePageShell breadcrumb="Assistent" tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ausblick — noch nicht umgesetzt
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Nicht suchen. Fragen.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Beschreiben Sie, was in Ihrer Kommune ansteht — der Katalog schlägt passende
            Anwendungsfälle vor und sagt dazu, warum sie passen. Sie müssen die Begriffe des
            Katalogs nicht kennen.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">Attrappe.</span> Die Zuordnung erfolgt hier über einen
            einfachen Stichwortabgleich im Katalog — kein Sprachmodell, keine externe Anfrage. So
            sieht der Ablauf aus; die eigentliche Umsetzung steht noch aus.
          </p>
        </div>

        <AssistantChat useCases={useCases} />
      </div>
    </MarketplacePageShell>
  );
}
