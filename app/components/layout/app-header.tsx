import { LayoutGrid } from "lucide-react";

interface AppHeaderProps {
  breadcrumb?: string;
  connection?: string;
}

export const AppHeader = ({
  breadcrumb = "Katalog",
  connection = "core-prod",
}: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex h-13 items-center justify-between border-b bg-background px-4">
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
          MK
        </div>
      </div>
    </header>
  );
};
