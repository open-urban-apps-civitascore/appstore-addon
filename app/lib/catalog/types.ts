// Domain model for the Use Case Catalog (AppStore for CIVITAS/CORE v2).
// A "use case" is a reusable platform bundle published by one municipality and
// installable into another's CIVITAS/CORE instance.

export type UseCaseCategory =
  | "mobility"
  | "environment"
  | "citizen-service"
  | "energy"
  | "waste";

/** Reife — how proven the bundle is. */
export type Maturity = "verified" | "operational" | "prototype";

/** Installierbarkeit — how much effort installing it takes. */
export type Installability = "direct" | "adaptation" | "experimental";

/** Building blocks a bundle ships with (drives the icon row on a card). */
export type Capability =
  | "datasets"
  | "datasources"
  | "pipelines"
  | "validation"
  | "dashboard";

export interface UseCase {
  id: string;
  title: string;
  description: string;
  category: UseCaseCategory;
  maturity: Maturity;
  installability: Installability;
  /** Publishing municipality, e.g. "Stadt Mannheim". */
  publisher: string;
  capabilities: Capability[];
}

export const CATEGORY_LABELS: Record<UseCaseCategory, string> = {
  mobility: "Mobilität",
  environment: "Umwelt & Klima",
  "citizen-service": "Bürgerservice",
  energy: "Energie",
  waste: "Ver- & Entsorgung",
};

export const MATURITY_LABELS: Record<Maturity, string> = {
  verified: "Verifiziert",
  operational: "In Betrieb",
  prototype: "Prototype",
};

export const INSTALLABILITY_LABELS: Record<Installability, string> = {
  direct: "Direkt installierbar",
  adaptation: "Anpassung nötig",
  experimental: "Experimentell",
};

/** Short labels used in the filter bar. */
export const INSTALLABILITY_FILTER_LABELS: Record<Installability, string> = {
  direct: "Direkt",
  adaptation: "Anpassung",
  experimental: "Experimentell",
};
