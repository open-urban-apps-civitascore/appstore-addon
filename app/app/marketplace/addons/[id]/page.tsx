import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, FileText, GitBranch, GitPullRequest } from "lucide-react";

import { getCatalog } from "@/lib/getCatalog";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import type { Addon } from "@/types/addons";

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Turn the deployment reference into a copy-ready install snippet, mirroring
// how the upstream add-ons are activated (git clone + inventory entry, or helm).
function buildInstallSnippet(addon: Addon): string {
  const ref = addon.deploymentRef;

  if (ref.type === "helm") {
    const chart = ref.chartName ?? addon.id;
    return [`helm repo add civitas ${ref.url}`, `helm install ${chart} civitas/${chart}`].join("\n");
  }

  if (ref.type === "git") {
    const lines = [`# 1. Add-on klonen`, `git clone ${ref.url}`];
    if (ref.path) {
      lines.push(
        ``,
        `# 2. Im Inventory aktivieren`,
        `inv_addons:`,
        `  import: true`,
        `  addons:`,
        `    - '${ref.path}/tasks.yml'`,
      );
    }
    return lines.join("\n");
  }

  return `# Bundle\n${ref.url}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card p-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </span>
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
  const addon = (await getCatalog()).addons.find((entry) => entry.id === id);

  if (!addon) {
    notFound();
  }

  const monogram = addon.name.trim().charAt(0).toUpperCase();
  const coreVersions = addon.compatibility.map((entry) => entry.coreVersion);

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

        {/* Hero */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                {monogram}
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold leading-tight text-foreground">{addon.name}</h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {addon.description}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="size-4" />
                  <span>{addon.author}</span>
                </div>
                {addon.categories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {addon.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="font-normal">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button>
                  <GitPullRequest className="size-4" />
                  {text.detail.createInstallPr}
                </Button>
                {addon.repository && (
                  <Button variant="outline" asChild>
                    <a href={addon.repository} target="_blank" rel="noreferrer">
                      {text.detail.openRepository}
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {coreVersions.map((version) => (
                  <Badge key={version} variant="outline" className="font-normal">
                    Core {version}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={text.detail.addonLicense} value={addon.licenses?.addon ?? text.common.notAvailable} />
          <Fact label={text.detail.toolLicense} value={addon.licenses?.tool ?? text.common.notAvailable} />
          <Fact label={text.detail.deploymentLabel} value={addon.deploymentRef.type} />
          <Fact label={text.detail.coreVersionsLabel} value={coreVersions.join(", ")} />
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-md border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">{text.detail.readme}</h2>
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-muted/30 px-6 py-10 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{text.detail.readmeEmpty}</p>
              </div>
            </section>

            <section className="rounded-md border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{text.detail.installation}</h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{text.detail.installationHint}</p>
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
                <code>{buildInstallSnippet(addon)}</code>
              </pre>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-md border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">{text.detail.compatibility}</h2>
              <ul className="flex flex-col gap-2">
                {addon.compatibility.map((entry) => {
                  const updated = formatTimestamp(entry.lastUpdated);
                  return (
                    <li
                      key={entry.coreVersion}
                      className="rounded-md border bg-background p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">Civitas/Core {entry.coreVersion}</p>
                      {entry.branch && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <GitBranch className="size-3" />
                          {entry.branch}
                        </p>
                      )}
                      {updated && (
                        <p className="text-xs text-muted-foreground">
                          {text.detail.updated}: {updated}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-3 rounded-md border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                {text.detail.requiredCapabilities}
              </h2>
              {addon.requiredCapabilities && addon.requiredCapabilities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {addon.requiredCapabilities.map((capability) => (
                    <Badge
                      key={capability}
                      variant="outline"
                      className="font-normal uppercase tracking-wider"
                    >
                      {capability}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{text.detail.noCapabilities}</p>
              )}
            </section>

            {addon.repository && (
              <section className="flex flex-col gap-2 rounded-md border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">{text.detail.repository}</h2>
                <a
                  href={addon.repository}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all text-sm text-blue-600 hover:underline"
                >
                  {addon.repository.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </section>
            )}
          </aside>
        </div>
      </div>
    </MarketplacePageShell>
  );
}
