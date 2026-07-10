import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { USE_CASE_MATURITY_LABELS, type UseCase } from "@/types/use-cases";

// Accessible, hue-matched status colours (single source of truth). Meaning never
// relies on colour alone (barrierefrei): every status also carries a text label
// and a dot. Text/badge combos meet WCAG AA contrast on card/background surfaces
// (dark hue text on a light tint; light hue text on a faint tint in dark mode).
type Tone = "success" | "primary" | "warn" | "experimental";

const TONE: Record<Tone, { dot: string; text: string; badge: string }> = {
  success: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  primary: {
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  },
  warn: {
    dot: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  },
  experimental: {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  },
};

const MATURITY_TONE: Record<UseCase["maturity"], Tone> = {
  verified: "success",
  operational: "primary",
  prototype: "warn",
};

export const INSTALLABILITY_TONE: Record<UseCase["installability"], Tone> = {
  direct: "success",
  adaptation: "warn",
  experimental: "experimental",
};

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", TONE[tone].dot, className)}
    />
  );
}

/** Dot + hue-coloured label. Colour is present but always paired with the text. */
export function StatusLabel({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <StatusDot tone={tone} />
      <span className={TONE[tone].text}>{children}</span>
    </span>
  );
}

/** Maturity as a filled, colour-coded badge (dot + label) for the detail hero. */
export function MaturityBadge({ maturity }: { maturity: UseCase["maturity"] }) {
  const tone = MATURITY_TONE[maturity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[tone].badge,
      )}
    >
      <StatusDot tone={tone} />
      {USE_CASE_MATURITY_LABELS[maturity]}
    </span>
  );
}

/** Maturity as dot + coloured label for compact card footers. */
export function MaturityStatus({ maturity }: { maturity: UseCase["maturity"] }) {
  return <StatusLabel tone={MATURITY_TONE[maturity]}>{USE_CASE_MATURITY_LABELS[maturity]}</StatusLabel>;
}
