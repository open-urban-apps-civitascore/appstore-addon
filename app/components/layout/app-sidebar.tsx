import Link from "next/link";
import {
  ClipboardCheck,
  FileQuestion,
  Hexagon,
  LayoutGrid,
  type LucideIcon,
  PackageCheck,
  PackagePlus,
  Sparkles,
} from "lucide-react";

import { RoleSwitch } from "@/components/layout/role-switch";
import { cn } from "@/lib/utils";
import { getUseCases } from "@/lib/getUseCases";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { getMockRole, MOCK_ROLE_PROFILES, type MockRole } from "@/lib/mock-role";
import { listInstalledUseCases } from "@/lib/use-case-installations";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  children?: { title: string; href: string }[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const getNavSections = (
  installedCount: number,
  useCaseCount: number,
  role: MockRole,
): NavSection[] => {
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
          children: [
            { title: `${text.nav.useCases} (${useCaseCount})`, href: "/marketplace/use-cases" },
            { title: text.nav.addons, href: "/marketplace/addons" },
            { title: text.nav.dataStructures, href: "/marketplace/datastructures" },
          ],
        },
        { title: text.nav.installed, href: "/installed", icon: PackageCheck, count: installedCount },
        // Contributing starts from the instance inventory, so it is a peer of
        // "Installiert" rather than an action on one installation. Deliberately
        // not "Teilen": in a data platform that reads as sharing data, while
        // what leaves here is the blueprint, never a row. PackagePlus mirrors
        // PackageCheck above — same object, opposite direction.
        { title: "Beitragen", href: "/export", icon: PackagePlus },
        // Curation belongs to Civitas Connect e. V. — a commune never sees it.
        ...(role === "curator"
          ? [{ title: "Kuratierung", href: "/curation", icon: ClipboardCheck }]
          : []),
        // Outlook feature — labelled as a draft in the page itself, not here.
        { title: "Assistent", href: "/marketplace/assistant", icon: Sparkles },
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
  // The installed count reads the local install store (+ a best-effort
  // portal-backend status refresh); the catalog (repo-list) does not. Degrade the
  // count instead of 500-ing every page — browsing the catalog must not depend on
  // the portal-backend being reachable.
  const [installations, useCases, role] = await Promise.all([
    listInstalledUseCases().catch((error) => {
      console.error("[sidebar] could not load installed use cases:", error);
      return [];
    }),
    getUseCases(),
    getMockRole(),
  ]);
  const navSections = getNavSections(installations.length, useCases.length, role);
  const profile = MOCK_ROLE_PROFILES[role];

  return (
    <nav
      aria-label="Hauptnavigation"
      className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:h-svh"
    >
      <div className="flex items-center gap-2.5 p-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#036aa1]">
          <Hexagon className="size-5 text-white" />
        </div>
        <div className="grid leading-tight">
          <span className="truncate text-sm font-semibold">
            {role === "curator" ? profile.organisation : tenantName}
          </span>
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

      <div className="flex flex-col gap-3 border-t p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {profile.initials}
          </div>
          <div className="grid min-w-0 leading-tight">
            <span className="truncate text-sm font-medium">{profile.person}</span>
            <span className="truncate text-xs text-muted-foreground">{profile.organisation}</span>
          </div>
        </div>
        <RoleSwitch role={role} />
      </div>
    </nav>
  );
};
