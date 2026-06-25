import { auth, signIn } from "@/auth";
import { getCatalog } from "@/lib/getCatalog";
import { AddonCatalog } from "@/components/catalog/addon-catalog";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function CatalogPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Civitas Marketplace</h1>
          <p className="text-slate-600 mb-8">Bitte melde dich an, um den AppStore zu nutzen.</p>
          <form action={async () => { "use server"; await signIn("keycloak") }}>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Mit Civitas Login anmelden
            </button>
          </form>
        </div>
      </main>
    );
  }

  const catalog = getCatalog();

  return (
    <div className="flex">
      <AppSidebar tenantName={session.user.name || session.user.email || undefined} />
      <main className="flex h-svh flex-1 flex-col overflow-hidden">
        <AppHeader breadcrumb="Katalog" />
        <div className="flex-1 overflow-y-auto bg-muted/40 p-6">
          <AddonCatalog addons={catalog.addons} />
        </div>
      </main>
    </div>
  );
}
