import { LayoutGrid, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

interface AppHeaderProps {
  breadcrumb?: string;
  connection?: string;
}

export const AppHeader = async ({
  breadcrumb = "Katalog",
  connection = "core-prod",
}: AppHeaderProps) => {
  const session = await auth();
  const userName = session?.user?.name || "MK";
  const initials = userName.substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-13 items-center justify-between border-b bg-background px-4 py-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <LayoutGrid className="size-4 text-muted-foreground" />
        <span>{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Verbunden · {connection}
        </span>
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </div>
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
