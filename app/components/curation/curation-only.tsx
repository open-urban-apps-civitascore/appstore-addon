import Link from "next/link";
import { Lock } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";

/**
 * Shown when a commune view opens a curation route. The section exists for
 * Civitas Connect e. V.; hiding it in the navigation alone would still leave
 * the route reachable by link.
 */
export function CurationOnly() {
  return (
    <MarketplacePageShell breadcrumb="Kuratierung" tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 rounded-xl border bg-card p-8">
        <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Lock className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Kuratierung ist der Community vorbehalten
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Einreichungen prüft Civitas Connect e. V. — nicht die einzelne Kommune. Für diese
            Ansicht fehlen Ihnen die Rechte.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            In dieser Demo können Sie unten links in der Seitenleiste zur Ansicht „Civitas
            Connect“ wechseln.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Zurück zum Marktplatz
        </Link>
      </div>
    </MarketplacePageShell>
  );
}
