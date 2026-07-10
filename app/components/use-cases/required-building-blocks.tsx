import { Blocks, Cable, type LucideIcon, Puzzle } from "lucide-react";

import { cn } from "@/lib/utils";
import { type RequiredBuildingBlock } from "@/types/use-cases";

type Kind = RequiredBuildingBlock["kind"];

// Colour-codes the taxonomy so the distinction is readable at a glance. The
// colour lives in the left rail + tinted icon tile; the kind label stays muted
// for legibility. Tones reuse existing tokens (would become dedicated tokens
// when this graduates from prototype).
const BLOCK_META: Record<
  Kind,
  { label: string; icon: LucideIcon; accent: string; tile: string; text: string }
> = {
  addon: {
    label: "Add-on",
    icon: Blocks,
    accent: "border-l-blue-500",
    tile: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    text: "text-blue-700 dark:text-blue-400",
  },
  plugin: {
    label: "Plugin",
    icon: Puzzle,
    accent: "border-l-violet-500",
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    text: "text-violet-700 dark:text-violet-400",
  },
  connector: {
    label: "Connector",
    icon: Cable,
    accent: "border-l-amber-500",
    tile: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-400",
  },
};

export function RequiredBuildingBlocks({
  title,
  blocks,
}: {
  title: string;
  blocks: RequiredBuildingBlock[];
}) {
  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {blocks.map((block) => {
          const meta = BLOCK_META[block.kind];
          const Icon = meta.icon;
          return (
            <li
              key={`${block.kind}-${block.name}`}
              className={cn("flex items-center gap-3 rounded-md border border-l-4 p-3", meta.accent)}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", meta.tile)}>
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{block.name}</span>
                <span className={cn("font-mono text-[11px] uppercase tracking-wide", meta.text)}>
                  {meta.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
