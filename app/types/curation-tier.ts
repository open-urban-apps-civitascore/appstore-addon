import { z } from "zod";

// The ONE graded trust vocabulary of the store (design decision 2026-08-07).
// A single curation tier — assigned by the curator, revocable, with public
// criteria — replaces the three previous overlapping scales (maturity,
// installability-as-grade, curation badge). Everything else about an entry is
// an ungraded, machine-verifiable fact: fit check, production references,
// license, install path.
export const curationTierSchema = z.enum(["experimental", "community", "verified"]);
export type CurationTier = z.infer<typeof curationTierSchema>;

// How an entry gets onto an instance — a fact, not a grade. `operator` covers
// add-ons: their install is a GitOps change made by the platform operator,
// never 1-click (glossary rule).
export const installPathSchema = z.enum(["portal", "operator", "adaptation"]);
export type InstallPath = z.infer<typeof installPathSchema>;

// Deprecation is a state overlay, independent of the tier: unlike `revoked`
// (tombstone, hidden) a deprecated entry stays visible, warns, and may point
// to a successor. It must also reach instances that already installed it.
export const deprecationSchema = z.object({
  reason: z.string(),
  successorId: z.string().optional(),
});
export type Deprecation = z.infer<typeof deprecationSchema>;

export const CURATION_TIER_LABELS: Record<CurationTier, string> = {
  experimental: "Experimentell",
  community: "Community",
  verified: "Verifiziert",
};

export const CURATION_TIER_HINTS: Record<CurationTier, string> = {
  experimental: "Formal gültig eingereicht, aber noch nicht inhaltlich geprüft.",
  community: "Von der Kuratierung geprüft: Lizenz, Kontakt, Plattform-Bedarf.",
  verified: "Zusätzlich fachlich geprüft und produktiv im Einsatz — mit benannter Referenz.",
};

// The published per-tier criteria ("Was bedeutet dieses Siegel?"). Cumulative:
// each tier includes everything below it. Public criteria are what make the
// badge auditable for the people who sign off (Amtsleitung, Datenschutz).
// Mirrors the curation checklist in `lib/curation.ts`.
export const CURATION_TIER_CRITERIA: Record<CurationTier, string[]> = {
  experimental: [
    "Manifest ist gültig und vollständig lesbar",
    "Repository öffentlich erreichbar",
    "Keine Zugangsdaten im Bündel",
    "Unveränderliche Versions-Referenz",
  ],
  community: [
    "Alle Kriterien von „Experimentell“",
    "Freie Lizenz angegeben und zulässig",
    "Pflegestelle und Kontakt benannt",
    "Plattform-Bedarf deklariert",
    "Beschreibung auch fachfremd verständlich",
  ],
  verified: [
    "Alle Kriterien von „Community“",
    "Mindestens eine Kommune produktiv im Einsatz — benannt",
    "Fachliche Prüfung durch die Kuratierung",
  ],
};

export const INSTALL_PATH_LABELS: Record<InstallPath, string> = {
  portal: "Über das Portal",
  operator: "Durch den Betreiber",
  adaptation: "Mit Anpassung",
};
