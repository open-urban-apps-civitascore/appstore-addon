import type { UseCase } from "./types";

// Placeholder catalog data mirroring the design mock. Replace with a real
// fetch against the AppStore backend once the API exists.
export const MOCK_USE_CASES: UseCase[] = [
  {
    id: "parkraum-monitoring",
    title: "Parkraum-Monitoring",
    description:
      "Echtzeit-Auslastung öffentlicher Parkflächen aus Sensorik und Schrankendaten, inkl. Prognose und Karten-Dashboard.",
    category: "mobility",
    maturity: "verified",
    installability: "direct",
    publisher: "Stadt Mannheim",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "starkregen-fruehwarnung",
    title: "Starkregen-Frühwarnung",
    description:
      "Frühwarnsystem für Starkregen aus Radar-, Pegel- und Wetterdaten mit Schwellenwert-Alarmen und Meldekanälen.",
    category: "environment",
    maturity: "operational",
    installability: "adaptation",
    publisher: "Stadt Wuppertal",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "luftqualitaetsdashboard",
    title: "Luftqualitätsdashboard",
    description:
      "Aggregiert Feinstaub- und NO₂-Messwerte stationärer und mobiler Sensoren zu einem öffentlichen Luftgüte-Dashboard.",
    category: "environment",
    maturity: "verified",
    installability: "direct",
    publisher: "Stadt Stuttgart",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "hitzeinseln-klimaanpassung",
    title: "Hitzeinseln & Klimaanpassung",
    description:
      "Identifiziert urbane Hitzeinseln aus Satelliten- und Sensordaten und priorisiert Flächen für Klimaanpassungsmaßnahmen.",
    category: "environment",
    maturity: "prototype",
    installability: "experimental",
    publisher: "Stadt Karlsruhe",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "verkehrsfluss-stau-analyse",
    title: "Verkehrsfluss & Stau-Analyse",
    description:
      "Wertet Detektor- und Floating-Car-Daten zu Verkehrsfluss, Reisezeiten und Stauschwerpunkten aus.",
    category: "mobility",
    maturity: "operational",
    installability: "adaptation",
    publisher: "Stadt Köln",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "maengelmelder-buergerhinweise",
    title: "Mängelmelder Bürgerhinweise",
    description:
      "Nimmt Bürgerhinweise zu Schäden im öffentlichen Raum entgegen, kategorisiert sie und steuert die Bearbeitung.",
    category: "citizen-service",
    maturity: "verified",
    installability: "direct",
    publisher: "Stadt Leipzig",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "ladeinfrastruktur-monitoring",
    title: "Ladeinfrastruktur-Monitoring",
    description:
      "Überwacht Verfügbarkeit und Auslastung öffentlicher Ladepunkte über OCPP und stellt Belegungsdaten bereit.",
    category: "energy",
    maturity: "operational",
    installability: "adaptation",
    publisher: "Stadt Freiburg",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "solarpotenzial-kataster",
    title: "Solarpotenzial-Kataster",
    description:
      "Berechnet das Photovoltaik-Potenzial von Dachflächen aus LiDAR- und Gebäudedaten für Bürger und Planung.",
    category: "energy",
    maturity: "prototype",
    installability: "experimental",
    publisher: "Stadt Münster",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
  {
    id: "abfall-fuellstandsmonitoring",
    title: "Abfall-Füllstandsmonitoring",
    description:
      "Misst Füllstände öffentlicher Abfallbehälter per Sensorik und optimiert Leerungstouren.",
    category: "waste",
    maturity: "operational",
    installability: "direct",
    publisher: "Stadt Bonn",
    capabilities: ["datasets", "datasources", "pipelines", "validation", "dashboard"],
  },
];
