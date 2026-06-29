import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Building2, CircleHelp, Link2 } from "lucide-react";

import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { Badge } from "@/components/ui/badge";
import { InstallUseCaseButton } from "@/components/use-cases/install-use-case-button";
import { getUseCaseById } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import {
  USE_CASE_INSTALLABILITY_LABELS,
  USE_CASE_MATURITY_LABELS,
} from "@/types/use-cases";

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const text = getMarketplaceText();
  const useCase = getUseCaseById(id);

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

        <section className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-3xl flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="size-4" />
                <span>{useCase.publisher}</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{useCase.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{useCase.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{USE_CASE_MATURITY_LABELS[useCase.maturity]}</Badge>
                <Badge variant="secondary">
                  {USE_CASE_INSTALLABILITY_LABELS[useCase.installability]}
                </Badge>
                {useCase.compatibility.map((version) => (
                  <Badge key={version} variant="outline">
                    Core {version}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 rounded-lg border bg-background p-4 lg:w-[280px]">
              <h2 className="text-sm font-semibold text-foreground">Prototype Install</h2>
              <p className="text-sm text-muted-foreground">
                Der Button legt die Artefakte des Use-Cases (DataStructure + DataSet) direkt in
                Model Forge an, falls sie noch nicht existieren, und speichert daraus lokal einen
                Draft. Das Civitas Portal Backend wird dabei noch nicht aufgerufen.
              </p>
              <InstallUseCaseButton useCaseId={useCase.id} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="flex flex-col gap-6">
            <div className="rounded-md border bg-card p-6">
              <div className="flex items-center gap-2">
                <Boxes className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  {text.useCases.includedArtifacts}
                </h2>
              </div>
              <div className="mt-4 grid gap-3">
                {useCase.includedArtifacts.map((artifact) => (
                  <div key={artifact.id} className="rounded-md border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{artifact.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {artifact.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="uppercase tracking-wide">
                        {artifact.kind}
                      </Badge>
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                      {artifact.id}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-card p-6">
              <div className="flex items-center gap-2">
                <CircleHelp className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  {text.useCases.installQuestions}
                </h2>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {useCase.installQuestions.map((question) => (
                  <li key={question} className="rounded-md border bg-background p-4 text-sm text-foreground">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-md border bg-card p-5">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{text.useCases.modelForgeSource}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{useCase.modelForge.note}</p>
              <p className="mt-3 break-all rounded-md bg-background p-3 font-mono text-xs text-muted-foreground">
                {useCase.modelForge.datasetId}
              </p>
            </section>

            {useCase.requiredCapabilities.length > 0 ? (
              <section className="rounded-md border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">Required Capabilities</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {useCase.requiredCapabilities.map((capability) => (
                    <Badge key={capability} variant="outline" className="uppercase tracking-wide">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </MarketplacePageShell>
  );
}
