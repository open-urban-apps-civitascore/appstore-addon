import Link from "next/link";
import { Archive, FlaskConical, type LucideIcon, ShieldCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CURATION_TIER_LABELS,
  type CurationTier,
  type Deprecation,
} from "@/types/curation-tier";

// Accessible, hue-matched status colours for the ONE graded trust vocabulary
// (single source of truth). Meaning never relies on colour alone (barrierefrei):
// every tier carries an icon and a text label. Text/badge combos meet WCAG AA
// contrast on card/background surfaces. One meaning per strong colour:
// emerald = Verifiziert, blue = Community, amber = Experimentell, gray = Veraltet.
type Tone = "success" | "primary" | "warn" | "neutral";

const TONE: Record<Tone, { text: string; badge: string }> = {
  success: {
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  primary: {
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  },
  warn: {
    text: "text-amber-800 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  },
  neutral: {
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

const TIER_TONE: Record<CurationTier, Tone> = {
  verified: "success",
  community: "primary",
  experimental: "warn",
};

const TIER_ICON: Record<CurationTier, LucideIcon> = {
  verified: ShieldCheck,
  community: Users,
  experimental: FlaskConical,
};

/** The curation tier as a filled badge (icon + label) for detail heroes. */
export function TierBadge({ tier }: { tier: CurationTier }) {
  const Icon = TIER_ICON[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[TIER_TONE[tier]].badge,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {CURATION_TIER_LABELS[tier]}
    </span>
  );
}

/** The curation tier as icon + coloured label for compact card footers. */
export function TierStatus({ tier }: { tier: CurationTier }) {
  const Icon = TIER_ICON[tier];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm font-medium", TONE[TIER_TONE[tier]].text)}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {CURATION_TIER_LABELS[tier]}
    </span>
  );
}

/** "Veraltet" as a compact status for card footers — replaces the tier there. */
export function DeprecatedStatus() {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", TONE.neutral.text)}>
      <Archive aria-hidden className="size-4 shrink-0" />
      Veraltet
    </span>
  );
}

/**
 * Deprecation banner for detail pages and the installed view. The successor is
 * resolved by the caller (use case vs add-on live under different routes).
 */
export function DeprecatedNotice({
  deprecation,
  successorHref,
  successorTitle,
}: {
  deprecation: Deprecation;
  successorHref?: string;
  successorTitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
      <Archive aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-300" />
      <div className="min-w-0">
        <p className="font-semibold text-amber-900 dark:text-amber-200">Veraltet</p>
        <p className="mt-0.5 text-amber-800 dark:text-amber-300">{deprecation.reason}</p>
        {successorHref && successorTitle ? (
          <p className="mt-1.5">
            <Link
              href={successorHref}
              className="font-medium text-amber-900 underline underline-offset-2 dark:text-amber-200"
            >
              Empfohlener Nachfolger: {successorTitle}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
