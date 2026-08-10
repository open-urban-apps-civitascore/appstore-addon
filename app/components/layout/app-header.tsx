import { FlaskConical, LayoutGrid, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

import { MobileNavTrigger } from "@/components/layout/app-shell";
import { isMockMode } from "@/lib/server/mock/mode";

interface AppHeaderProps {
  breadcrumb?: string;
  connection?: string;
}

export const AppHeader = async ({
  breadcrumb = "Katalog",
  connection = "core-prod",
}: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex h-13 items-center justify-between border-b bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
        <MobileNavTrigger />
        <LayoutGrid className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
        <span className="truncate">{breadcrumb}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {isMockMode() ? (
          // Unmistakable mock signal: never let demo data pass for a live backend.
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
            <FlaskConical className="size-3.5" />
            <span className="hidden sm:inline">Mock-Modus · Demo-Daten</span>
            <span className="sm:hidden">Mock</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            <span className="hidden sm:inline">Verbunden · {connection}</span>
          </span>
        )}
        {/* No avatar here — the CIVITAS/CORE portal header carries none; the
            signed-in identity lives in the sidebar footer. */}
        <form action={async () => {
          "use server";
          const currentSession = await auth();
          // @ts-expect-error - id_token injected via callbacks
          const idToken = currentSession?.id_token;

          // 1. Destroy local NextAuth session
          await signOut({ redirect: false });

          // 2. Redirect to Keycloak to destroy federated session
          const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
          const postLogoutUri = process.env.AUTH_URL || "http://localhost:3001";

          if (idToken && issuer) {
            redirect(`${issuer}/protocol/openid-connect/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri)}`);
          } else {
            redirect('/');
          }
        }}>
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" title="Abmelden">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
};
