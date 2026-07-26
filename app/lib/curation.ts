/**
 * Reviewing a submission before it is listed.
 *
 * The checklist is split into checks a pipeline can run and checks that need a
 * person. Keeping that distinction explicit is the point: a curator who has to
 * verify machine-checkable facts by hand becomes the bottleneck, and a catalog
 * whose only gate is a green pipeline is not curated at all.
 *
 * PLACEHOLDER SOURCE: submissions are constants. They have to come from the
 * catalog repository's open merge requests instead. Evaluation below is real
 * logic and is unit-tested.
 */

export type CheckOutcome = "pass" | "fail" | "warn" | "manual";

export type CurationCheck = {
  id: string;
  label: string;
  hint: string;
  /** Automatic checks can be run by CI; manual ones need the curator's judgement. */
  automatic: boolean;
};

export const CURATION_CHECKS: CurationCheck[] = [
  {
    id: "manifest",
    label: "Manifest ist gültig",
    hint: "Bündel entspricht dem Schema und lässt sich vollständig lesen.",
    automatic: true,
  },
  {
    id: "license",
    label: "Lizenz angegeben und zulässig",
    hint: "Eine freie Lizenz ist Aufnahmekriterium für den Katalog.",
    automatic: true,
  },
  {
    id: "repository",
    label: "Repository öffentlich erreichbar",
    hint: "Ohne öffentliches Repository lässt sich nichts nachvollziehen.",
    automatic: true,
  },
  {
    id: "pinned-ref",
    label: "Unveränderliche Referenz",
    hint: "Version oder Commit statt Branch — sonst ändert sich der Inhalt hinter dem Rücken.",
    automatic: true,
  },
  {
    id: "no-secrets",
    label: "Keine Zugangsdaten im Bündel",
    hint: "Passwörter, Tokens und interne Adressen dürfen nicht enthalten sein.",
    automatic: true,
  },
  {
    id: "contact",
    label: "Pflegestelle und Kontakt benannt",
    hint: "Es muss jemanden geben, den eine andere Kommune ansprechen kann.",
    automatic: true,
  },
  {
    id: "requirements",
    label: "Plattform-Bedarf deklariert",
    hint: "Welche Komponenten und Konnektoren nötig sind, muss vor der Installation sichtbar sein.",
    automatic: true,
  },
  {
    id: "understandable",
    label: "Beschreibung ist verständlich",
    hint: "Erkennt eine fachfremde Person, was der Anwendungsfall löst?",
    automatic: false,
  },
  {
    id: "personal-data",
    label: "Umgang mit personenbezogenen Daten geklärt",
    hint: "Falls einschlägig: Selbstauskunft der einreichenden Stelle liegt vor.",
    automatic: false,
  },
];

export type BadgeLevel = "experimental" | "community" | "verified";

export const BADGE_LEVEL_LABELS: Record<BadgeLevel, string> = {
  experimental: "Experimentell",
  community: "Community",
  verified: "Verifiziert",
};

export const BADGE_LEVEL_HINTS: Record<BadgeLevel, string> = {
  experimental: "Läuft, ist aber nirgends produktiv erprobt.",
  community: "Von einer Kommune gepflegt und mindestens einmal produktiv im Einsatz.",
  verified: "Zusätzlich fachlich geprüft und mit belastbaren Referenzen.",
};

export type Submission = {
  id: string;
  title: string;
  summary: string;
  submittedBy: string;
  submittedAt: string;
  repository: string;
  gitIdentifier: string;
  license?: string;
  contact?: string;
  artifactCount: number;
  /** Outcome per automatic check id; missing entries count as not run. */
  automaticResults: Record<string, CheckOutcome>;
  /** Notes the submitter added for the curator. */
  note?: string;
};

const SUBMISSIONS: Submission[] = [
  {
    id: "sub-radverkehr",
    title: "Radverkehrszählung Innenstadt",
    summary:
      "Zählstellen an Knotenpunkten, stündlich aggregiert, mit Auswertung nach Richtung.",
    submittedBy: "Stadt Bamberg",
    submittedAt: "2026-07-22T09:14:00Z",
    repository: "https://gitlab.com/civitascore-openurbanapps/commune-bamberg-radverkehr",
    gitIdentifier: "v1.1.0",
    license: "EUPL-1.2",
    contact: "opendata@bamberg.example",
    artifactCount: 5,
    automaticResults: {
      manifest: "pass",
      license: "pass",
      repository: "pass",
      "pinned-ref": "pass",
      "no-secrets": "pass",
      contact: "pass",
      requirements: "pass",
    },
    note: "Läuft bei uns seit Januar produktiv.",
  },
  {
    id: "sub-schulwege",
    title: "Schulwege-Sicherheitsindex",
    summary: "Verknüpft Unfallmeldungen mit Schulstandorten und Gehwegbreiten.",
    submittedBy: "Kreis Seehafen",
    submittedAt: "2026-07-24T15:40:00Z",
    repository: "https://gitlab.com/civitascore-openurbanapps/kreis-seehafen-schulwege",
    gitIdentifier: "main",
    artifactCount: 7,
    automaticResults: {
      manifest: "pass",
      license: "fail",
      repository: "pass",
      "pinned-ref": "fail",
      "no-secrets": "warn",
      contact: "pass",
      requirements: "pass",
    },
    note: "Erste Einreichung — Rückmeldung willkommen.",
  },
];

export function listSubmissions(): Submission[] {
  return SUBMISSIONS;
}

export function getSubmission(id: string): Submission | undefined {
  return SUBMISSIONS.find((submission) => submission.id === id);
}

export type EvaluatedCheck = CurationCheck & { outcome: CheckOutcome; detail?: string };

export type CurationEvaluation = {
  checks: EvaluatedCheck[];
  /** Automatic checks that failed — these block listing until fixed. */
  blockers: EvaluatedCheck[];
  /** Automatic checks that need a closer look but do not block by themselves. */
  warnings: EvaluatedCheck[];
  /** Checks only a person can make. */
  openManualChecks: EvaluatedCheck[];
  /** True when nothing automatic failed; the human decision is still required. */
  readyForDecision: boolean;
};

export function evaluateSubmission(submission: Submission): CurationEvaluation {
  const checks: EvaluatedCheck[] = CURATION_CHECKS.map((check) => {
    if (!check.automatic) return { ...check, outcome: "manual" as CheckOutcome };

    const outcome = submission.automaticResults[check.id];
    if (!outcome) {
      return { ...check, outcome: "warn" as CheckOutcome, detail: "Nicht geprüft" };
    }

    let detail: string | undefined;
    if (check.id === "license" && outcome === "fail") {
      detail = submission.license ? `Lizenz „${submission.license}" nicht zugelassen` : "Keine Lizenz angegeben";
    }
    if (check.id === "pinned-ref" && outcome === "fail") {
      detail = `„${submission.gitIdentifier}" ist ein Branch — Inhalt kann sich später ändern`;
    }
    if (check.id === "no-secrets" && outcome === "warn") {
      detail = "Auffällige Zeichenketten gefunden — manuell ansehen";
    }

    return { ...check, outcome, detail };
  });

  return {
    checks,
    blockers: checks.filter((check) => check.outcome === "fail"),
    warnings: checks.filter((check) => check.outcome === "warn"),
    openManualChecks: checks.filter((check) => check.outcome === "manual"),
    readyForDecision: checks.every((check) => check.outcome !== "fail"),
  };
}
