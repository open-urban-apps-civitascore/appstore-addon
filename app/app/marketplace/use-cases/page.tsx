import { getUseCases } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { CatalogFreshness } from "@/components/catalog/catalog-freshness";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseCatalog } from "@/components/use-cases/use-case-catalog";

export default async function MarketplaceUseCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategorie?: string }>;
}) {
  const text = getMarketplaceText();
  const [useCases, { q, kategorie }] = await Promise.all([getUseCases(), searchParams]);

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.breadcrumbUseCases}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <UseCaseCatalog
          useCases={useCases}
          heading={text.useCases.heading}
          subtitle={text.useCases.subtitle}
          countLabel={text.useCases.countLabel}
          noResultsLabel={text.useCases.noResults}
          searchPlaceholder={text.useCases.searchPlaceholder}
          freshness={<CatalogFreshness />}
          initialSearch={q ?? ""}
          initialCategory={kategorie ?? ""}
        />
      </div>
    </MarketplacePageShell>
  );
}
