import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Link2 } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { IncludedArtifactsSpec } from "@/components/use-cases/included-artifacts-spec";
import { InstallUseCaseButton } from "@/components/use-cases/install-use-case-button";
import { RequiredBuildingBlocks } from "@/components/use-cases/required-building-blocks";
import { UseCaseFacts } from "@/components/use-cases/use-case-facts";
import { MaturityBadge } from "@/components/use-cases/use-case-status";
import { getUseCaseById } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";

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

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="grid lg:grid-cols-[1fr_360px]">
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
              <h1 className="text-3xl font-bold text-foreground lg:text-4xl">{useCase.title}</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">{useCase.summary}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-foreground">{useCase.publisher}</span>
                    <span className="text-xs text-muted-foreground">
                      {text.useCases.publisherLabel}
                    </span>
                  </span>
                </span>
                <MaturityBadge maturity={useCase.maturity} />
              </div>

              <div className="mt-1 flex flex-col items-start gap-1.5">
                <InstallUseCaseButton useCaseId={useCase.id} />
                <p className="text-xs text-muted-foreground">{text.useCases.installDescription}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-success/5 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-sm font-semibold text-foreground">{text.useCases.detailsHeading}</p>
              <UseCaseFacts useCase={useCase} text={text} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-6">
            <section className="rounded-md border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{text.useCases.aboutHeading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {useCase.description}
              </p>
            </section>

            <IncludedArtifactsSpec
              title={text.useCases.includedArtifacts}
              artifacts={useCase.includedArtifacts}
              urn={useCase.modelForge.datasetId}
            />
          </section>

          <aside className="flex flex-col gap-6">
            {useCase.requiredCapabilities.length > 0 ? (
              <RequiredBuildingBlocks
                title={text.useCases.requiredHeading}
                blocks={useCase.requiredCapabilities}
              />
            ) : null}

            <section className="rounded-md border bg-card p-5">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{text.useCases.modelForgeSource}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{useCase.modelForge.note}</p>
            </section>
          </aside>
        </div>
      </div>
    </MarketplacePageShell>
  );
}
