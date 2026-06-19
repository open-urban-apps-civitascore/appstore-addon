import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UseCaseCatalog } from "@/components/catalog/use-case-catalog";
import { MOCK_USE_CASES } from "@/lib/catalog/mock-data";

export default function CatalogPage() {
  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex h-svh flex-1 flex-col overflow-hidden">
        <AppHeader breadcrumb="Katalog" />
        <div className="flex-1 overflow-y-auto bg-muted/40 p-6">
          <UseCaseCatalog useCases={MOCK_USE_CASES} />
        </div>
      </main>
    </div>
  );
}
