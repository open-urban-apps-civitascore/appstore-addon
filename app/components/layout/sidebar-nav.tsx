"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  FileQuestion,
  LayoutGrid,
  type LucideIcon,
  PackageCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getMarketplaceText } from "@/lib/marketplace-text";

interface NavChild {
  title: string;
  href: string;
  /** Also stay selected on nested routes below href (e.g. detail pages). */
  matchNested?: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  hasChildren?: boolean;
  children?: NavChild[];
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
          hasChildren: true,
          children: [
            { title: text.nav.addons, href: "/marketplace/addons" },
            { title: text.nav.plugins, href: "/marketplace/plugins" },
            {
              title: `${text.nav.useCases} (${useCaseCount})`,
              href: "/marketplace/use-cases",
              matchNested: true,
            },
          ],
        },
        { title: text.nav.installed, href: "/installed", icon: PackageCheck, count: installedCount },
      ],
    },
    {
      title: text.sections.help,
      items: [{ title: text.nav.docs, href: "/docs", icon: FileQuestion }],
    },
  ];
};

export const SidebarNav = ({
  installedCount,
  useCaseCount,
}: {
  installedCount: number;
  useCaseCount: number;
}) => {
  const pathname = usePathname();
  const navSections = getNavSections(installedCount, useCaseCount);

  // Active state as in portal-frontend AppSidebarContent: exact pathname match,
  // parents light up when one of their children matches. Children with
  // matchNested also stay selected on routes below their href.
  const isChildActive = (child: NavChild) =>
    pathname === child.href || (child.matchNested === true && pathname.startsWith(`${child.href}/`));

  const isItemActive = (item: NavItem) =>
    pathname === item.href || (item.children?.some(isChildActive) ?? false);

  return (
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
                  isItemActive(item)
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
                      className={cn(
                        "rounded-md px-2 py-1 text-sm transition-colors",
                        isChildActive(child)
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
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
  );
};
