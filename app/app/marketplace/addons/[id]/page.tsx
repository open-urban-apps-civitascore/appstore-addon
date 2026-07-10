import { type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, ExternalLink, GitPullRequest, Lock } from "lucide-react";
import { type LucideIcon } from "lucide-react";

import { AddonIcon } from "@/components/catalog/addon-icon";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/getCatalog";
import { getMarketplaceText } from "@/lib/marketplace-text";
import type { Addon } from "@/types/addons";

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
    <div className="rounded-lg bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="size-5" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
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
        <section className="rounded-xl border border-t-2 border-t-primary bg-card p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <AddonIcon name={addon.name} className="size-14 rounded-xl text-lg" />
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {text.detail.addonKindLabel}
                </span>
                <h1 className="text-2xl font-bold leading-tight text-foreground">{addon.name}</h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {addon.description}
                </p>
                {addon.categories.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {addon.categories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <Button>
                <GitPullRequest className="size-4" />
                {text.detail.createInstallPr}
              </Button>
              {addon.repository ? (
                <Button variant="outline" asChild>
                  <a href={addon.repository} target="_blank" rel="noreferrer">
                    {text.detail.openRepository}
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-6">
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

            <section className="rounded-md border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{text.detail.installation}</h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{text.detail.installationHint}</p>
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
                <code>{buildInstallSnippet(addon)}</code>
              </pre>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-md border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">{text.detail.details}</h2>
              <dl className="mt-3">
                <DetailRow label={text.detail.publisher}>
                  <span className="font-mono text-xs">{addon.author}</span>
                </DetailRow>
                {addon.licenses?.addon ? (
                  <DetailRow label={text.detail.addonLicense}>
                    <span className="font-mono text-xs">{addon.licenses.addon}</span>
                  </DetailRow>
                ) : null}
                {addon.licenses?.tool ? (
                  <DetailRow label={text.detail.toolLicense}>
                    <span className="font-mono text-xs">{addon.licenses.tool}</span>
                  </DetailRow>
                ) : null}
              </dl>
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {text.detail.compatibility}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coreVersions.map((version) => (
                    <Badge
                      key={version}
                      variant="outline"
                      className="border-transparent bg-muted font-mono font-normal"
                    >
                      Core {version}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-md border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                {text.detail.requiredCapabilities}
              </h2>
              {addon.requiredCapabilities && addon.requiredCapabilities.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
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
                <p className="mt-3 text-sm text-muted-foreground">{text.detail.noCapabilities}</p>
              )}
            </section>

            {addon.repository ? (
              <section className="rounded-md border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">{text.detail.repository}</h2>
                <a
                  href={addon.repository}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 break-all text-sm text-primary hover:underline"
                >
                  {addon.repository.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </MarketplacePageShell>
  );
}
