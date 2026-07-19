import { ReactNode } from "react";

import { auth, signIn } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getMarketplaceText } from "@/lib/marketplace-text";
import { isMockMode } from "@/lib/server/mock/mode";

interface MarketplacePageShellProps {
  children: ReactNode;
  breadcrumb: string;
  tenantName?: string;
}

export async function MarketplacePageShell({
  children,
  breadcrumb,
  tenantName,
}: MarketplacePageShellProps) {
  const session = await auth();

  // Mock mode runs fully offline (no Keycloak) — skip the sign-in wall. The
  // header shows the mock badge instead of a user-backed session.
  if (!session?.user && !isMockMode()) {
    const text = getMarketplaceText();
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Civitas Marketplace</h1>
          <p className="text-slate-600 mb-8">{text.common.signInHint}</p>
          <form action={async () => { "use server"; await signIn("keycloak"); }}>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {text.common.signInButton}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex">
      <AppSidebar
        tenantName={tenantName || session?.user?.name || session?.user?.email || undefined}
      />
      <main className="flex h-svh flex-1 flex-col overflow-hidden">
        <AppHeader breadcrumb={breadcrumb} />
        <div className="flex-1 overflow-y-auto bg-muted/40 p-6">{children}</div>
      </main>
    </div>
  );
}
