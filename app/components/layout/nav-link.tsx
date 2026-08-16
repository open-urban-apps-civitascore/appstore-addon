"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The sidebar knows which page it is on. It has to be a client component to do
 * it — the sidebar itself is an async server component (it awaits the install
 * count, the catalog and the role), and only the browser knows the current
 * route.
 *
 * Matching counts a page AND everything below it, so a use-case detail page
 * keeps its section marked instead of unhighlighting the whole navigation.
 */
function isWithin(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  childHrefs,
  children,
}: {
  href: string;
  /** When present, the entry is a section: it also lights up for its children. */
  childHrefs?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // A section matches its own page or one of its children — deliberately NOT
  // every path that merely starts with its href: "Assistent" lives under
  // /marketplace but is its own entry, and must not light up "Marktplatz".
  const active = childHrefs
    ? pathname === href || childHrefs.some((child) => isWithin(pathname, child))
    : isWithin(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      {children}
    </Link>
  );
}

export function SubNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = isWithin(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2 py-1 text-sm transition-colors",
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
