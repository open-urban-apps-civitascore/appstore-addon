import { cn } from "@/lib/utils";

// Up to two initials from the add-on name (word-initials when multi-word, else
// the first two letters): "Node-RED" → "NR", "Masterportal" → "MA".
function monogram(name: string): string {
  const parts = name.split(/[\s\-_/]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Add-on identity tile. Generic monogram by default (blue = platform/add-on
 * accent, distinct from the green use-case identity). A real `iconUrl` could
 * later render here instead — deferred (needs next/image remotePatterns config).
 */
export function AddonIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {monogram(name)}
    </span>
  );
}
