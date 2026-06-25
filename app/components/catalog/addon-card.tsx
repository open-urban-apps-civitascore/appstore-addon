import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Addon } from "@/types/catalog";

interface AddonCardProps {
  addon: Addon;
}

export const AddonCard = ({ addon }: AddonCardProps) => {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-card p-5 transition-shadow hover:shadow-sm flex-grow",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          v{addon.version}
        </span>
        <Badge variant="outline" className="border-transparent bg-muted">
          Core {addon.civitasCoreVersion}
        </Badge>
      </header>

      <h3 className="text-base font-semibold leading-tight text-foreground">{addon.name}</h3>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {addon.description}
      </p>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5" />
        <span>{addon.author}</span>
      </div>

      <footer className="mt-auto flex flex-col gap-3 pt-3 border-t">
        <div className="flex flex-wrap gap-1.5">
          {addon.requiredCapabilities && addon.requiredCapabilities.length > 0 ? (
             addon.requiredCapabilities.map(cap => (
               <Badge key={cap} variant="secondary" className="font-normal text-[10px] uppercase tracking-wider">
                 {cap}
               </Badge>
             ))
          ) : (
             <span className="text-xs text-muted-foreground">Keine Capabilities</span>
          )}
        </div>
      </footer>
    </article>
  );
};
