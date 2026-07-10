import Link from "next/link";

import { AddonIcon } from "@/components/catalog/addon-icon";
import { Badge } from "@/components/ui/badge";
import type { Addon } from "@/types/catalog";

interface AddonCardProps {
  addon: Addon;
  href?: string;
}

export const AddonCard = ({ addon, href = "/marketplace/addons" }: AddonCardProps) => {
  return (
    <Link
      href={`${href}/${addon.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <article className="flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-shadow group-hover:shadow-md">
        <div className="flex items-start gap-3">
          <AddonIcon name={addon.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-foreground">
                {addon.name}
              </h3>
              <span className="max-w-[45%] shrink-0 truncate font-mono text-xs text-muted-foreground">
                {addon.author}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {addon.description}
            </p>
          </div>
        </div>

        {addon.categories.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {addon.categories.map((category) => (
              <Badge key={category} variant="secondary" className="font-normal">
                {category}
              </Badge>
            ))}
          </div>
        ) : null}
      </article>
    </Link>
  );
};
