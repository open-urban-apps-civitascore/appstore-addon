import { getMarketplaceText } from "@/lib/marketplace-text";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";

export default function MarketplacePluginsPage() {
  const text = getMarketplaceText();

  return (
    <MarketplacePageShell
      breadcrumb={text.sidebar.nav.breadcrumbPlugins}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-md border bg-card p-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {text.sidebar.nav.plugins || "Plugins"}
        </h1>
        <p className="text-sm text-muted-foreground">{text.placeholders.pluginsCount}</p>
      </div>
    </MarketplacePageShell>
  );
}
