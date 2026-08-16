import Link from "next/link";
import { ArrowRight, Blocks, Database, Search } from "lucide-react";

import { CatalogFreshness } from "@/components/catalog/catalog-freshness";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseCard } from "@/components/use-cases/use-case-card";
import { getCatalog } from "@/lib/getCatalog";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { getUseCases } from "@/lib/getUseCases";

/**
 * The marketplace landing page — Alex's front door (design session 2026-08-07).
 * Use cases lead the page; add-ons are a secondary entry tile; the search
 * routes into the use-case catalog (`?q=`), category chips deep-link the same
 * way (`?kategorie=`). Deliberately no AI-assistant teaser here.
 */
export default async function MarketplacePage() {
  const text = getMarketplaceText();
  const [useCases, catalog] = await Promise.all([
    getUseCases(),
    getCatalog().catch(() => ({ addons: [] })),
  ]);

  const categories = Array.from(
    new Set(useCases.flatMap((useCase) => useCase.categories)),
  ).sort();

  return (
    <MarketplacePageShell breadcrumb={text.sidebar.nav.marketplace} tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground">{text.landing.heading}</h1>
          <p className="mt-2 text-base text-muted-foreground">{text.landing.subtitle}</p>

          {/* Plain GET form — lands on the use-case catalog with `?q=` prefilled. */}
          <form
            action="/marketplace/use-cases"
            method="get"
            className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row"
          >
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                placeholder={text.landing.searchPlaceholder}
                className="h-11 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {text.landing.searchButton}
            </button>
          </form>

          {categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/marketplace/use-cases?kategorie=${encodeURIComponent(category)}`}
                  className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {category}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-foreground">{text.landing.useCasesHeading}</h2>
            <Link
              href="/marketplace/use-cases"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {text.landing.allUseCases} ({useCases.length})
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {useCases.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.slice(0, 6).map((useCase) => (
                <UseCaseCard key={useCase.id} useCase={useCase} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
              {text.useCases.noResults}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href="/marketplace/addons"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          >
            {/* Orange = add-on identity (complement of the CIVITAS blue). */}
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400">
              <Blocks className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                {text.landing.addonsTitle} ({catalog.addons.length})
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {text.landing.addonsHint}
              </span>
            </span>
          </Link>

          <Link
            href="/marketplace/datastructures"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Database className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                {text.sidebar.nav.dataStructures}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Gemeinsame Datenformate — die Grundlage dafür, dass Auswertungen anderer
                Kommunen auf Ihre Daten passen.
              </span>
            </span>
          </Link>
        </section>

        <CatalogFreshness />
      </div>
    </MarketplacePageShell>
  );
}
