import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Addon } from "@/types/catalog";

interface AddonCardProps {
  addon: Addon;
  href?: string;
}

export const AddonCard = ({ addon, href = "/marketplace/addons" }: AddonCardProps) => {
  return (
    <Link
      href={`${href}/${addon.id}`}
      className="flex rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <article
        className={cn(
          "flex flex-grow flex-col gap-3 rounded-md border bg-card p-5 transition-shadow hover:shadow-sm",
        )}
      >
        <h3 className="text-base font-semibold leading-tight text-foreground">{addon.name}</h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {addon.description}
        </p>

        {addon.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {addon.categories.map((category) => (
              <Badge key={category} variant="secondary" className="font-normal">
                {category}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5" />
          <span>{addon.author}</span>
        </div>

        <footer className="mt-auto flex flex-col gap-1.5 border-t pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Kompatibel mit
          </span>
          <div className="flex flex-wrap gap-1.5">
            {addon.compatibility.map((entry) => (
              <Badge
                key={entry.coreVersion}
                variant="outline"
                className="border-transparent bg-muted font-normal"
              >
                {entry.coreVersion}
              </Badge>
            ))}
          </div>
        </footer>
      </article>
    </Link>
  );
};
