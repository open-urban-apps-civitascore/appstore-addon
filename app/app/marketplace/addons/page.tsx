import { getCatalog } from "@/lib/getCatalog";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { AddonCatalog } from "@/components/catalog/addon-catalog";
import { CatalogFreshness } from "@/components/catalog/catalog-freshness";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";

export default async function MarketplaceAddonsPage() {
  const text = getMarketplaceText();
  const catalog = await getCatalog();

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.breadcrumbCatalog}
      tenantName="Stadt Musterstadt"
    >
      <AddonCatalog
        addons={catalog.addons}
        detailsPath="/marketplace/addons"
        heading={text.catalog.heading}
        subtitle={text.catalog.subtitle}
        countLabel={text.catalog.countLabel}
        noResultsLabel={text.catalog.noResults}
        freshness={<CatalogFreshness />}
      />
    </MarketplacePageShell>
  );
}
