import type { UseCase } from "@/types/use-cases";

/**
 * What the target CivitasCore instance offers — the other half of the
 * compatibility check shown on a use case ("passt zu deiner Instanz").
 *
 * PLACEHOLDER SOURCE: the profile is a constant. It has to be read from the
 * portal-backend / deployment instead, which is why the check below is a pure
 * function over a profile object rather than reading globals — swapping the
 * source must not touch the checking logic or the UI.
 */
export type InstanceProfile = {
  tenantName: string;
  coreVersion: string;
  /** Provisionable platform components, e.g. FROST, POSTGIS, GEOSERVER. */
  components: string[];
  /** Connector types the instance can drive, e.g. MQTT, SQL, HTTP. */
  connectors: string[];
};

const MOCK_INSTANCE: InstanceProfile = {
  tenantName: "Stadt Musterstadt",
  coreVersion: "2.1",
  // Deliberately missing SUPERSET: a check that is green for everything proves
  // nothing on stage. One amber row shows the check is real.
  components: ["PORTAL_BACKEND", "FROST", "NIFI", "POSTGIS", "GEOSERVER", "APISIX", "KEYCLOAK"],
  connectors: ["MQTT", "SQL"],
};

export function getInstanceProfile(): InstanceProfile {
  return MOCK_INSTANCE;
}

export type FitCheckRow = {
  label: string;
  /** Help text — only set when something is missing or not checkable; a plain
      checkmark needs no explanation (Ewa, 2026-08-07). */
  detail?: string;
  status: "ok" | "missing" | "unknown";
};

export type FitCheckResult = {
  /** True when nothing is missing — the green headline on the detail page. */
  fits: boolean;
  rows: FitCheckRow[];
};

/**
 * Compare a use case's declared requirements against an instance profile.
 *
 * ONE checklist for everything the installation needs (design decision
 * 2026-08-07: the former "Benötigt" building-block card merged into this
 * check). Falls back to the legacy `compatibility` array (core versions) when
 * a use case carries no explicit `requirements` block, and always includes the
 * typed `requiredCapabilities` blocks: checkable kinds get a verdict, add-ons
 * and plugins get an honest "unknown" instead of a fake checkmark.
 *
 * `fits` means "nothing is known to be missing" — an unchecked row does not
 * turn the headline amber, it gets its own note in the UI.
 */
export function checkFit(useCase: UseCase, profile: InstanceProfile): FitCheckResult {
  const rows: FitCheckRow[] = [];

  const coreVersions = useCase.requirements?.coreVersions?.length
    ? useCase.requirements.coreVersions
    : useCase.compatibility;

  // The version row keeps its detail even when green — "which version runs
  // here vs. which are supported" is information, not boilerplate.
  rows.push(
    coreVersions.includes(profile.coreVersion)
      ? {
          label: "CivitasCore-Version",
          detail: `Instanz ${profile.coreVersion} — unterstützt: ${coreVersions.join(", ")}`,
          status: "ok",
        }
      : {
          label: "CivitasCore-Version",
          detail: `Instanz ${profile.coreVersion} — der Anwendungsfall unterstützt ${coreVersions.join(", ")}`,
          status: "missing",
        },
  );

  const components = useCase.requirements?.components ?? [];

  for (const component of components) {
    rows.push(
      profile.components.includes(component)
        ? { label: component, status: "ok" }
        : {
            label: component,
            detail: "In dieser Instanz nicht bereitgestellt",
            status: "missing",
          },
    );
  }

  const connectors = useCase.requirements?.connectors ?? [];

  for (const connector of connectors) {
    rows.push(
      profile.connectors.includes(connector)
        ? { label: `Konnektor ${connector}`, status: "ok" }
        : {
            label: `Konnektor ${connector}`,
            detail: "Nicht verfügbar — Datenquelle kann nicht angebunden werden",
            status: "missing",
          },
    );
  }

  // The typed building blocks, deduped against the explicit requirement rows
  // (fixture entries declare PORTAL_BACKEND in both places).
  const covered = new Set([...components, ...connectors]);

  for (const block of useCase.requiredCapabilities) {
    if (covered.has(block.name)) continue;
    covered.add(block.name);

    if (block.kind === "connector") {
      // Legacy catalog entries coerce bare component names into connector
      // blocks, so check both instance lists before calling something missing.
      const available =
        profile.connectors.includes(block.name) || profile.components.includes(block.name);
      rows.push(
        available
          ? { label: block.name, status: "ok" }
          : {
              label: block.name,
              detail: "Konnektor nicht verfügbar — Datenquelle kann nicht angebunden werden",
              status: "missing",
            },
      );
    } else if (block.kind === "addon") {
      rows.push({
        label: block.name,
        detail: "Add-on — Installation übernimmt der Betreiber der Instanz; hier nicht automatisch prüfbar",
        status: "unknown",
      });
    } else {
      rows.push({
        label: block.name,
        detail: "Plugin — hier nicht automatisch prüfbar",
        status: "unknown",
      });
    }
  }

  return { fits: rows.every((row) => row.status !== "missing"), rows };
}
