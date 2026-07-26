/**
 * The artifacts that exist in the tenant's instance — the starting point for
 * sharing something.
 *
 * Most artifacts worth sharing were never installed from the catalog: they were
 * modelled by hand in the portal. So the inventory, not the install store, is
 * what an export has to start from; installs are just one possible origin.
 *
 * PLACEHOLDER SOURCE: a constant. It has to be read from the portal-backend
 * instead (datasets, datastructures, datasources, pipelines the caller may see).
 * Dependency resolution below is real logic and is unit-tested.
 */

export type InstanceArtifactKind =
  | "dataset"
  | "datastructure"
  | "datasource"
  | "pipeline";

export type InstanceArtifact = {
  id: string;
  name: string;
  kind: InstanceArtifactKind;
  version?: string;
  description?: string;
  /** Ids this artifact cannot work without. */
  dependsOn: string[];
  /** Hand-modelled in the portal, or created by installing a catalog entry. */
  origin: "manual" | "installed";
  /** Set when `origin` is "installed" — which catalog entry created it. */
  fromUseCaseId?: string;
  /** True when the artifact holds instance-specific connection data. */
  carriesSecrets?: boolean;
};

export const INSTANCE_ARTIFACT_KIND_LABELS: Record<InstanceArtifactKind, string> = {
  dataset: "Datensatz",
  datastructure: "Datenstruktur",
  datasource: "Datenquelle",
  pipeline: "Pipeline",
};

const INVENTORY: InstanceArtifact[] = [
  {
    id: "ds-radverkehr",
    name: "Radverkehrszählung Innenstadt",
    kind: "dataset",
    description: "Zählstellen an sieben Knotenpunkten, stündlich aggregiert.",
    dependsOn: ["pipe-radverkehr", "struct-bicyclecount", "struct-geopoint"],
    origin: "manual",
  },
  {
    id: "pipe-radverkehr",
    name: "Radverkehr Ingest",
    kind: "pipeline",
    description: "MQTT-Quelle → Mapping → FROST-Senke.",
    dependsOn: ["src-zaehlstellen", "struct-bicyclecount"],
    origin: "manual",
  },
  {
    id: "src-zaehlstellen",
    name: "MQTT Zählstellen Innenstadt",
    kind: "datasource",
    description: "Broker der Verkehrsbetriebe, Topic je Zählstelle.",
    dependsOn: [],
    origin: "manual",
    carriesSecrets: true,
  },
  {
    id: "struct-bicyclecount",
    name: "BicycleCountReading",
    kind: "datastructure",
    version: "1.2.0",
    description: "Zählwert mit Zeitstempel, Richtung und Zählstellenbezug.",
    dependsOn: ["struct-geopoint"],
    origin: "manual",
  },
  {
    id: "struct-geopoint",
    name: "GeoPoint",
    kind: "datastructure",
    version: "1.0.0",
    description: "Punktgeometrie, von mehreren Strukturen verwendet.",
    dependsOn: [],
    origin: "manual",
  },
  {
    id: "ds-winterdienst",
    name: "Winterdienst-Einsätze",
    kind: "dataset",
    description: "Räum- und Streufahrten der Stadtreinigung.",
    dependsOn: ["struct-geopoint"],
    origin: "manual",
  },
  {
    id: "ds-trafficcounter",
    name: "TrafficCounter Mittelerde",
    kind: "dataset",
    description: "Aus dem Katalog installiert.",
    dependsOn: [],
    origin: "installed",
    fromUseCaseId: "traffic-counter-mittelerde",
  },
];

export function getInstanceInventory(): InstanceArtifact[] {
  return INVENTORY;
}

/**
 * Everything the selection needs in order to work, following `dependsOn`
 * transitively. Returns the ids that were pulled in *in addition* to the
 * explicit selection, so the UI can label them as automatically added — a
 * bundle that silently drops a referenced structure is broken on arrival.
 */
export function resolveDependencies(
  selectedIds: string[],
  inventory: InstanceArtifact[],
): { included: string[]; added: string[] } {
  const byId = new Map(inventory.map((artifact) => [artifact.id, artifact]));
  const included = new Set<string>();
  const queue = [...selectedIds];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || included.has(id)) continue;
    included.add(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      if (!included.has(dependency)) queue.push(dependency);
    }
  }

  const explicit = new Set(selectedIds);
  return {
    included: [...included],
    added: [...included].filter((id) => !explicit.has(id)),
  };
}
