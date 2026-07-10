import { getUseCases } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { CatalogFreshness } from "@/components/catalog/catalog-freshness";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseCard } from "@/components/use-cases/use-case-card";

export default async function MarketplaceUseCasesPage() {
  const text = getMarketplaceText();
  const useCases = await getUseCases();

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.breadcrumbUseCases}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">{text.useCases.heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text.useCases.subtitle}</p>
          <div className="mt-2">
            <CatalogFreshness />
          </div>
        </div>

        {useCases.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase) => (
              <UseCaseCard key={useCase.id} useCase={useCase} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            {text.useCases.noResults}
          </div>
        )}
      </div>
    </MarketplacePageShell>
  );
}
