import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Link2 } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { DemoDataHighlight } from "@/components/use-cases/demo-data-highlight";
import { FitCheck } from "@/components/use-cases/fit-check";
import { IncludedArtifactsSpec } from "@/components/use-cases/included-artifacts-spec";
import { InstallUseCaseButton } from "@/components/use-cases/install-use-case-button";
import { ProvidedSurfaces } from "@/components/use-cases/provided-surfaces";
import { TrustPanel } from "@/components/use-cases/trust-panel";
import { UseCaseFacts } from "@/components/use-cases/use-case-facts";
import { UseCaseGallery } from "@/components/use-cases/use-case-gallery";
import { UseCaseIllustration } from "@/components/use-cases/use-case-illustration";
import { DeprecatedNotice, TierBadge } from "@/components/use-cases/use-case-status";
import { getUseCaseById } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { publisherSlug } from "@/lib/slug";

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const text = getMarketplaceText();
  const useCase = await getUseCaseById(id);

  if (!useCase) {
    notFound();
  }

  // Deprecation may point to a successor entry; resolve it for the banner link.
  const successor = useCase.deprecated?.successorId
    ? await getUseCaseById(useCase.deprecated.successorId)
    : undefined;

  return (
    <MarketplacePageShell
      breadcrumb={`${text.sidebar.nav.breadcrumbUseCases} / ${useCase.title}`}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          href="/marketplace/use-cases"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {text.useCases.backToCatalog}
        </Link>

        {useCase.deprecated ? (
          <DeprecatedNotice
            deprecation={useCase.deprecated}
            successorHref={successor ? `/marketplace/use-cases/${successor.id}` : undefined}
            successorTitle={successor?.title}
          />
        ) : null}

        {/* Stacked text hero (the marketplace majority pattern) — screenshots
            live in the full-width media band below, never in a side rail. With
            no screenshots, a slim decorative illustration banner (clearly art,
            not a fake screenshot slot) gives the page its face. */}
        <section className="overflow-hidden rounded-xl border bg-card">
          {useCase.images.length === 0 ? (
            <UseCaseIllustration
              categories={useCase.categories}
              className="h-24 border-b lg:h-28"
            />
          ) : null}
          <div className="flex flex-col gap-4 p-6 lg:p-8">
              {useCase.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {useCase.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              ) : null}
              {/* Badge always directly below the title — inline placement made
                  its position depend on whether the title wraps. */}
              <div className="flex flex-col items-start gap-2">
                <h1 className="text-3xl font-bold text-foreground lg:text-4xl">{useCase.title}</h1>
                <TierBadge tier={useCase.curationTier} />
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground">{useCase.summary}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <Link
                      href={`/marketplace/publishers/${publisherSlug(useCase.publisher)}`}
                      className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {useCase.publisher}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {text.useCases.publisherLabel}
                    </span>
                  </span>
                </span>
              </div>

              <div className="mt-1 flex w-full flex-col items-start gap-1.5">
                <InstallUseCaseButton useCase={useCase} />
                <p className="text-xs text-muted-foreground">{text.useCases.installDescription}</p>
              </div>
          </div>
        </section>

        {/* Full-width 16:9 media band — renders only when screenshots exist. */}
        <UseCaseGallery useCase={useCase} />

        {/* The reason trying is cheap — placed high, right after the pictures. */}
        {useCase.demoData ? <DemoDataHighlight demoData={useCase.demoData} /> : null}

        {/* ── Fachlicher Teil: what it does, what you get, who vouches ───── */}
        <section className="rounded-md border bg-card p-6 lg:p-8">
          <h2 className="text-xl font-semibold text-foreground">{text.useCases.aboutHeading}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground lg:text-lg">
            {useCase.description}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-6">
            <ProvidedSurfaces surfaces={useCase.provides} />
          </section>

          <aside className="flex flex-col gap-6">
            <TrustPanel tier={useCase.curationTier} trust={useCase.trust} />
          </aside>
        </div>

        {/* ── Technischer Teil: visually separate zone for IT and data roles ── */}
        <section className="rounded-xl border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold text-foreground">
            {text.useCases.technicalHeading}
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-6">
              <IncludedArtifactsSpec
                title={text.useCases.includedArtifacts}
                artifacts={useCase.includedArtifacts}
                urn={useCase.modelForge.datasetId}
              />

              <section className="rounded-md border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{text.useCases.datasetReference}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{useCase.modelForge.note}</p>
              </section>
            </div>

            <aside className="flex flex-col gap-6">
              <FitCheck useCase={useCase} />

              <section className="rounded-md border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">{text.useCases.detailsHeading}</p>
                <div className="mt-2">
                  <UseCaseFacts useCase={useCase} text={text} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </MarketplacePageShell>
  );
}
