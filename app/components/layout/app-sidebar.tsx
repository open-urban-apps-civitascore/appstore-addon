import { Hexagon } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getUseCases } from "@/lib/getUseCases";
import { listInstalledUseCases } from "@/lib/use-case-installations";

export const AppSidebar = async ({
  tenantName = "Stadt Musterstadt",
}: {
  tenantName?: string;
}) => {
  // The installed count reads the local install store (+ a best-effort
  // portal-backend status refresh); the catalog (repo-list) does not. Degrade the
  // count instead of 500-ing every page — browsing the catalog must not depend on
  // the portal-backend being reachable.
  const [installations, useCases] = await Promise.all([
    listInstalledUseCases().catch((error) => {
      console.error("[sidebar] could not load installed use cases:", error);
      return [];
    }),
    getUseCases(),
  ]);

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

      <SidebarNav installedCount={installations.length} useCaseCount={useCases.length} />

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
