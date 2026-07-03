import Link from "next/link";
import {
  ChevronRight,
  Database,
  FileQuestion,
  Hexagon,
  LayoutGrid,
  type LucideIcon,
  PackageCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getUseCases } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { listInstalledUseCases } from "@/lib/use-case-installations";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  hasChildren?: boolean;
  children?: { title: string; href: string }[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const getNavSections = (installedCount: number, useCaseCount: number): NavSection[] => {
  const text = getMarketplaceText().sidebar;

  return [
    {
      title: text.sections.platform,
      items: [
        {
          title: text.nav.marketplace,
          href: "/marketplace",
          icon: LayoutGrid,
          active: true,
          hasChildren: true,
          children: [
            { title: text.nav.addons, href: "/marketplace/addons" },
            { title: text.nav.plugins, href: "/marketplace/plugins" },
            { title: `${text.nav.useCases} (${useCaseCount})`, href: "/marketplace/use-cases" },
          ],
        },
        { title: text.nav.installed, href: "/installed", icon: PackageCheck, count: installedCount },
        {
          title: text.nav.data,
          href: "/data",
          icon: Database,
          hasChildren: true,
          children: [
            { title: text.nav.dataSets, href: "/data/datasets" },
            { title: text.nav.dataSources, href: "/data/datasources" },
            { title: text.nav.dataStructures, href: "/data/datastructures" },
          ],
        },
      ],
    },
    {
      title: text.sections.admin,
      items: [
        {
          title: text.nav.tenantManagement,
          href: "/tenant",
          icon: Users,
          hasChildren: true,
        },
      ],
    },
    {
      title: text.sections.help,
      items: [{ title: text.nav.docs, href: "/docs", icon: FileQuestion }],
    },
  ];
};

export const AppSidebar = async ({
  tenantName = "Stadt Musterstadt",
}: {
  tenantName?: string;
}) => {
  // The installed count needs Model Forge; the catalog (repo-list) does not.
  // Degrade the count instead of 500-ing every page when Model Forge is down —
  // browsing the catalog must not depend on Model Forge being reachable.
  const [installations, useCases] = await Promise.all([
    listInstalledUseCases().catch((error) => {
      console.error("[sidebar] could not load installed use cases (Model Forge unreachable?):", error);
      return [];
    }),
    getUseCases(),
  ]);
  const navSections = getNavSections(installations.length, useCases.length);

  return (
    <nav
      aria-label="Hauptnavigation"
      className="flex h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-2.5 p-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#036aa1]">
          <Hexagon className="size-5 text-white" />
        </div>
        <div className="grid leading-tight">
          <span className="truncate text-sm font-semibold">{tenantName}</span>
          <span className="truncate text-xs text-muted-foreground">CIVITAS/CORE</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <span className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </span>
            {section.items.map((item) => (
              <div key={item.title} className="flex flex-col">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                  {typeof item.count === "number" && (
                    <span className="ml-auto rounded bg-muted px-1.5 text-xs text-muted-foreground">
                      {item.count}
                    </span>
                  )}
                  {item.hasChildren && !item.children && (
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  )}
                </Link>
                {item.children && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href}
                        className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t p-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          MK
        </div>
        <div className="grid leading-tight">
          <span className="truncate text-sm font-medium">Maria Krause</span>
          <span className="truncate text-xs text-muted-foreground">Plattform-Admin</span>
        </div>
      </div>
    </nav>
  );
};
