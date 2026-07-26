import { INCLUDED_ARTIFACT_KIND_LABELS, type UseCase } from "@/types/use-cases";
import type { InstallOptions } from "@/types/install-options";

/**
 * The dry-run plan: exactly what an install would create, shown *before*
 * anything is applied — a readable list a data protection officer can sign off
 * on, rather than an opaque "Install" button.
 *
 * APPROXIMATE SOURCE: derived from the catalog entry's declared artifacts plus
 * the chosen fork. It should be computed from the fetched CORE-IR bundle and the
 * live instance instead, so it can also report *changes* to existing artifacts,
 * not just creations. The shape below is already the one that planner should
 * return, so only the producer has to change.
 */

export type DryRunEntry = {
  kind: string;
  label: string;
  detail?: string;
};

export type DryRunPlan = {
  creates: DryRunEntry[];
  /** Answers the installer gave, echoed back for confirmation. */
  answers: { question: string; answer: string }[];
  /** Target lifecycle state the install will stop at. */
  targetStatus: "DRAFT" | "READY" | "AVAILABLE";
  /** Plain-language statements about what is *not* touched. */
  untouched: string[];
};

const TARGET_STATUS_LABELS: Record<DryRunPlan["targetStatus"], string> = {
  DRAFT: "Entwurf — nichts wird provisioniert",
  READY: "Bereit — provisioniert nach Freigabe",
  AVAILABLE: "Verfügbar — wird sofort provisioniert",
};

export function targetStatusLabel(status: DryRunPlan["targetStatus"]): string {
  return TARGET_STATUS_LABELS[status];
}

export function buildDryRunPlan(useCase: UseCase, options: InstallOptions): DryRunPlan {
  const creates: DryRunEntry[] = useCase.includedArtifacts.map((artifact) => ({
    kind: INCLUDED_ARTIFACT_KIND_LABELS[artifact.kind],
    label: artifact.title,
    detail: artifact.description,
  }));

  if (options.dataSource.mode === "demo") {
    creates.push({
      kind: "Data Source",
      label: "Demo-Datenquelle",
      detail: "Voreingestellte MQTT-Verbindung — keine eigene Infrastruktur nötig.",
    });
  } else if (options.dataSource.mode === "own") {
    creates.push({
      kind: "Data Source",
      label: "Eigener MQTT-Broker",
      detail: options.dataSource.config?.url
        ? `Verbindung zu ${options.dataSource.config.url}`
        : "Verbindung zu Ihrer eigenen Infrastruktur.",
    });
  }

  for (const role of useCase.roles) {
    creates.push({
      kind: "Rolle",
      label: role.label,
      detail: role.description,
    });
  }

  // "Später konfigurieren" stops at DRAFT regardless of the go-live axis — the
  // same rule the install orchestrator applies.
  const targetStatus: DryRunPlan["targetStatus"] =
    options.dataSource.mode === "later"
      ? "DRAFT"
      : options.goLive === "stage"
        ? "READY"
        : "AVAILABLE";

  const answers = Object.entries(options.answers ?? {})
    .filter(([, answer]) => answer.trim().length > 0)
    .map(([question, answer]) => ({ question, answer }));

  const untouched = [
    "Bestehende Datensätze, Datenquellen und Pipelines bleiben unverändert.",
    "Es werden keine Nutzer, Gruppen oder Berechtigungen geändert.",
  ];

  if (options.dataSource.mode === "own") {
    untouched.push(
      "Zugangsdaten gehen ausschließlich an das Portal-Backend und werden im Marketplace nicht gespeichert.",
    );
  }

  return { creates, answers, targetStatus, untouched };
}
