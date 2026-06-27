import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseInstallationCard } from "@/components/use-cases/use-case-installation-card";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { listInstalledUseCases } from "@/lib/use-case-installations";

export default async function InstalledPage() {
  const text = getMarketplaceText();
  const installations = await listInstalledUseCases();

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

        {installations.length > 0 ? (
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
