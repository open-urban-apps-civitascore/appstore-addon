import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { AddonCard } from "@/components/catalog/addon-card";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { UseCaseCard } from "@/components/use-cases/use-case-card";
import { getRepoListAddons, getRepoListUseCases } from "@/lib/server/repo-list";
import { publisherSlug } from "@/lib/slug";

/**
 * All artefacts published by one organisation, grouped by kind. Reached from the
 * clickable publisher name on a use-case or add-on detail page. The catalog has
 * no publisher entity — this is a live grouping of the catalog by `publisher` /
 * `author`, keyed by {@link publisherSlug}.
 */
export default async function PublisherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [allUseCases, allAddons] = await Promise.all([
    getRepoListUseCases(),
    getRepoListAddons(),
  ]);

  const useCases = allUseCases.filter((useCase) => publisherSlug(useCase.publisher) === slug);
  const addons = allAddons.filter((addon) => publisherSlug(addon.author) === slug);

  if (useCases.length === 0 && addons.length === 0) notFound();

  // The slug is a normalised key; recover the display name from the first match.
  const publisherName = useCases[0]?.publisher ?? addons[0]?.author ?? slug;
  const total = useCases.length + addons.length;

  return (
    <MarketplacePageShell breadcrumb={publisherName} tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/marketplace/use-cases"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Zurück zum Marktplatz
          </Link>

          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{publisherName}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Herausgeber · {total} {total === 1 ? "Artefakt" : "Artefakte"}
              </p>
            </div>
          </div>
        </div>

        {useCases.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Anwendungsfälle ({useCases.length})
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <UseCaseCard key={useCase.id} useCase={useCase} />
              ))}
            </div>
          </section>
        ) : null}

        {addons.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Add-ons ({addons.length})</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {addons.map((addon) => (
                <AddonCard key={addon.id} addon={addon} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MarketplacePageShell>
  );
}
