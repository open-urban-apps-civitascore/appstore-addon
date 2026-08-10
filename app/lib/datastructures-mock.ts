/**
 * Data structures as first-class catalog citizens — the direction Mario set for
 * the catalogue POC (P2.1): a data structure can be found and installed on its
 * own, not only as part of a use-case bundle.
 *
 * PLACEHOLDER SOURCE: these entries are constants. They have to come from the
 * catalogue index (`type: "datastructure"`) instead, resolved the same way as
 * use cases and add-ons. The page states this on screen.
 */

export type CatalogDataStructure = {
  /** The logical CORE URN — the catalogue id and the install identity in one. */
  urn: string;
  name: string;
  description: string;
  publisher: string;
  domain: string;
  /** How many catalog use cases build on it — the reuse argument, visible. */
  usedByUseCases: number;
};

const DATA_STRUCTURES: CatalogDataStructure[] = [
  {
    urn: "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
    name: "GeoPoint",
    description:
      "Geokoordinate (Breite, Länge) als gemeinsames Element. Wird von Anwendungsfällen mitbenutzt statt neu definiert — deshalb passen ihre Daten zusammen.",
    publisher: "Civitas Connect e. V.",
    domain: "Basis",
    usedByUseCases: 2,
  },
  {
    urn: "urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.0.0",
    name: "TrafficCounterReading",
    description:
      "Eine Zählstellen-Messung: Fahrzeuganzahl, Durchschnittsgeschwindigkeit, Richtung und Standort — das Format hinter Verkehrszählungen.",
    publisher: "Kommune Mittelerde",
    domain: "Mobilität",
    usedByUseCases: 1,
  },
  {
    urn: "urn:core:platform:civitas:datastructure:environment:AirQualityReading:1.0.0",
    name: "AirQualityReading",
    description:
      "Eine Luftqualitätsmessung: PM2.5 und PM10 mit Zeitpunkt und Standort — anschlussfähig an gängige Sensor-Bausätze.",
    publisher: "Kommune Mittelerde",
    domain: "Umwelt",
    usedByUseCases: 1,
  },
];

export function listCatalogDataStructures(): CatalogDataStructure[] {
  return DATA_STRUCTURES;
}
