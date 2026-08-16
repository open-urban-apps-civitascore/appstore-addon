import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  ExternalLink,
  GitPullRequest,
  Lock,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

import { AddonIcon } from "@/components/catalog/addon-icon";
import { AddonReadmeView } from "@/components/catalog/addon-readme";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { Button } from "@/components/ui/button";
import { TrustPanel } from "@/components/use-cases/trust-panel";
import { UseCaseGallery } from "@/components/use-cases/use-case-gallery";
import { UseCaseIllustration } from "@/components/use-cases/use-case-illustration";
import { DeprecatedNotice, TierBadge } from "@/components/use-cases/use-case-status";
import { fetchAddonReadme } from "@/lib/server/addon-readme";
import { getCatalog } from "@/lib/getCatalog";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { publisherSlug } from "@/lib/slug";
import { addonCurationTier } from "@/types/addons";

// Generic explainer of how every add-on attaches to the platform (SSO + REST) —
// true for all add-ons, so it needs no per-entry data.
function IntegrationFeature({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg bg-orange-500/5 p-4">
      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
        <Icon className="size-5" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function AddonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const text = getMarketplaceText();
  const { id } = await params;
  const catalog = await getCatalog();
  const addon = catalog.addons.find((entry) => entry.id === id);

  if (!addon) {
    notFound();
  }

  // The repository's own README is the technical documentation shown below —
  // fetched server-side, resolved to null when unreachable.
  const readme = await fetchAddonReadme(addon.repository);
  const successor = addon.deprecated?.successorId
    ? catalog.addons.find((entry) => entry.id === addon.deprecated?.successorId)
    : undefined;

  return (
    <MarketplacePageShell
      breadcrumb={`${text.sidebar.nav.breadcrumbCatalog} / ${addon.name}`}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          href="/marketplace/addons"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {text.catalog.backToCatalog}
        </Link>

        {addon.deprecated ? (
          <DeprecatedNotice
            deprecation={addon.deprecated}
            successorHref={successor ? `/marketplace/addons/${successor.id}` : undefined}
            successorTitle={successor?.name}
          />
        ) : null}

        {/* Stacked text hero — the same vertical rhythm as the use-case detail.
            Screenshots live in the full-width media band below; without them an
            orange-toned illustration banner (orange = add-on identity, the
            complement of the CIVITAS blue) gives the page its face. */}
        <section className="overflow-hidden rounded-xl border bg-card">
          {addon.images.length === 0 ? (
            <UseCaseIllustration
              categories={addon.categories}
              tone="orange"
              className="h-24 border-b lg:h-28"
            />
          ) : null}
          <div className="flex flex-col gap-4 p-6 lg:p-8">
            {/* Monogram pinned to the top-right corner (top-aligned with the
                chips row); the left text column reads exactly like the
                use-case hero, badge always directly below the title. */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col items-start gap-4">
                {addon.categories.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {addon.categories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center rounded-md bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-col items-start gap-2">
                  <h1 className="text-3xl font-bold leading-tight text-foreground lg:text-4xl">
                    {addon.name}
                  </h1>
                  <TierBadge tier={addonCurationTier(addon)} />
                </div>
              </div>
              <AddonIcon name={addon.name} className="size-14 shrink-0 rounded-xl text-lg" />
            </div>

            <p className="text-lg leading-relaxed text-muted-foreground">{addon.description}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400">
                  <Building2 className="size-4" />
                </span>
                <span className="flex flex-col leading-tight">
                  <Link
                    href={`/marketplace/publishers/${publisherSlug(addon.author)}`}
                    className="font-mono text-sm font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {addon.author}
                  </Link>
                  <span className="text-xs text-muted-foreground">{text.detail.publisher}</span>
                </span>
              </span>
            </div>

            <div className="mt-1 flex w-full flex-col items-start gap-1.5">
              <Button>
                <GitPullRequest className="size-4" />
                {text.detail.createInstallPr}
              </Button>
              <p className="text-xs text-muted-foreground">{text.detail.installPrHint}</p>
            </div>
          </div>
        </section>

        {/* Full-width 16:9 media band — renders only when screenshots exist. */}
        <UseCaseGallery images={addon.images} title={addon.name} />

        {/* ── Fachlicher Teil: what attaching it gives you, who vouches ───── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-6">
            <section className="rounded-md border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                {text.detail.integration.heading}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <IntegrationFeature
                  icon={Lock}
                  title={text.detail.integration.ssoTitle}
                  body={text.detail.integration.ssoBody}
                />
                <IntegrationFeature
                  icon={ArrowLeftRight}
                  title={text.detail.integration.restTitle}
                  body={text.detail.integration.restBody}
                />
              </div>
            </section>
          </section>

          <aside className="flex flex-col gap-6">
            {/* Same trust panel as use cases: explains the tier and shows who
                vouches; says honestly when nothing more is on file. */}
            <TrustPanel tier={addonCurationTier(addon)} trust={addon.trust} />
          </aside>
        </div>

        {/* ── Technischer Teil: visually separate zone for IT and data roles ── */}
        <section className="rounded-xl border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold text-foreground">
            {text.useCases.technicalHeading}
          </h2>

          {/* The repo's own README is the install/operations documentation —
              no curated copy that would drift from the source. */}
          <section className="mt-6 rounded-md border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">{text.detail.readme}</h3>
              {addon.repository ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={addon.repository} target="_blank" rel="noreferrer">
                    {text.detail.openRepository}
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
            {readme ? (
              <AddonReadmeView readme={readme} className="mt-4" />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{text.detail.readmeEmpty}</p>
            )}
          </section>
        </section>
      </div>
    </MarketplacePageShell>
  );
}
