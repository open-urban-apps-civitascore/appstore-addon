import { AlertTriangle } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseInstallationCard } from "@/components/use-cases/use-case-installation-card";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { listInstalledUseCases } from "@/lib/use-case-installations";
import type { InstalledUseCase } from "@/types/use-cases";

export default async function InstalledPage() {
  const text = getMarketplaceText();

  // This page reads its installs from the local install store and refreshes their
  // status from the portal-backend (best-effort). Surface a hard read failure as an
  // explicit notice rather than a 500 or a misleading "empty".
  let installations: InstalledUseCase[] = [];
  let loadError: string | null = null;
  try {
    installations = await listInstalledUseCases();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unbekannter Fehler";
  }

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.installed}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">{text.useCases.installedHeading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text.useCases.installedSubtitle}</p>
        </div>

        {loadError ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Installierte Anwendungsfälle konnten nicht geladen werden.</p>
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                Der lokale Installations-Speicher ist nicht lesbar. ({loadError})
              </p>
            </div>
          </div>
        ) : installations.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {installations.map((installation) => (
              <UseCaseInstallationCard
                key={installation.id}
                installation={installation}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            {text.useCases.emptyInstalled}
          </div>
        )}
      </div>
    </MarketplacePageShell>
  );
}
