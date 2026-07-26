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
  detail: string;
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
 * Falls back to the legacy `compatibility` array (core versions) and
 * `requiredCapabilities` (building blocks) when a use case carries no explicit
 * `requirements` block, so entries from the published catalog still get a check
 * instead of an empty panel.
 */
export function checkFit(useCase: UseCase, profile: InstanceProfile): FitCheckResult {
  const rows: FitCheckRow[] = [];

  const coreVersions = useCase.requirements?.coreVersions?.length
    ? useCase.requirements.coreVersions
    : useCase.compatibility;

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

  const components = useCase.requirements?.components?.length
    ? useCase.requirements.components
    : useCase.requiredCapabilities.map((block) => block.name);

  for (const component of components) {
    rows.push(
      profile.components.includes(component)
        ? { label: component, detail: "In dieser Instanz vorhanden", status: "ok" }
        : {
            label: component,
            detail: "In dieser Instanz nicht bereitgestellt",
            status: "missing",
          },
    );
  }

  for (const connector of useCase.requirements?.connectors ?? []) {
    rows.push(
      profile.connectors.includes(connector)
        ? { label: `Konnektor ${connector}`, detail: "Verfügbar", status: "ok" }
        : {
            label: `Konnektor ${connector}`,
            detail: "Nicht verfügbar — Datenquelle kann nicht angebunden werden",
            status: "missing",
          },
    );
  }

  return { fits: rows.every((row) => row.status === "ok"), rows };
}
