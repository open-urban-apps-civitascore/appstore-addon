import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { ExportWizard } from "@/components/export/export-wizard";
import { getInstanceInventory } from "@/lib/instance-inventory";

/**
 * Entry point for sharing something out of this instance.
 *
 * Starts from the instance inventory, not from an installation: what a
 * municipality wants to publish is usually something it modelled by hand, so
 * requiring a prior catalog install would rule out the common case.
 *
 * `?from=<useCaseId>` preselects the artifacts an installed use case created,
 * so the installed view can link straight into this flow.
 */
export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const inventory = getInstanceInventory();

  const preselectedIds = from
    ? inventory.filter((artifact) => artifact.fromUseCaseId === from).map((artifact) => artifact.id)
    : [];

  return (
    <MarketplacePageShell breadcrumb="Teilen" tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          {/* <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entwurf — noch nicht funktionsfähig
          </p> */}
          <h1 className="mt-1 text-3xl font-bold text-foreground">Anwendungsfall teilen</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Aus dem, was in Ihrer Instanz läuft, wird ein portables Bündel für andere Kommunen. Sie
            wählen die Artefakte — ob Sie sie selbst modelliert oder aus dem Katalog installiert
            haben, spielt keine Rolle. Alles Instanzspezifische bleibt zurück.
          </p>
        </div>

        <ExportWizard inventory={inventory} preselectedIds={preselectedIds} />
      </div>
    </MarketplacePageShell>
  );
}
