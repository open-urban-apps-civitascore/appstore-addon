export interface MarketplaceTexts {
  locale: "de";
  sidebar: {
    sections: {
      platform: string;
      admin: string;
      help: string;
    };
    nav: {
      marketplace: string;
      addons: string;
      plugins: string;
      useCases: string;
      installed: string;
      data: string;
      dataSets: string;
      dataSources: string;
      dataStructures: string;
      tenantManagement: string;
      docs: string;
      breadcrumbCatalog: string;
      breadcrumbPlugins: string;
      breadcrumbUseCases: string;
    };
  };
  catalog: {
    heading: string;
    subtitle: string;
    countLabel: string;
    noResults: string;
    addonCountUnit: string;
    backToCatalog: string;
  };
  useCases: {
    heading: string;
    subtitle: string;
    noResults: string;
    installQuestions: string;
    includedArtifacts: string;
    datasetReference: string;
    backToCatalog: string;
    emptyInstalled: string;
    installedHeading: string;
    installedSubtitle: string;
    detailsHeading: string;
    installabilityLabel: string;
    compatibilityLabel: string;
    artifactsLabel: string;
    sourceLabel: string;
    installHeading: string;
    installDescription: string;
    requiredHeading: string;
    aboutHeading: string;
    publisherLabel: string;
  };
  detail: {
    createInstallPr: string;
    openRepository: string;
    addonLicense: string;
    toolLicense: string;
    deploymentLabel: string;
    coreVersionsLabel: string;
    categories: string;
    compatibility: string;
    branch: string;
    updated: string;
    readme: string;
    readmeEmpty: string;
    installation: string;
    installationHint: string;
    requiredCapabilities: string;
    noCapabilities: string;
    repository: string;
    details: string;
    publisher: string;
    addonKindLabel: string;
    integration: {
      heading: string;
      ssoTitle: string;
      ssoBody: string;
      restTitle: string;
      restBody: string;
    };
  };
  placeholders: {
    addonsCount: string;
    pluginsCount: string;
    useCasesCount: string;
  };
  common: {
    signInHint: string;
    signInButton: string;
    connected: string;
    notAvailable: string;
    comingSoon: string;
  };
}

const MARKETPLACE_TEXT_DE: Omit<MarketplaceTexts, "locale"> = {
  sidebar: {
    sections: {
      platform: "Plattform",
      admin: "Admin",
      help: "Hilfe",
    },
    nav: {
      marketplace: "Marktplatz",
      addons: "Add-ons",
      plugins: "Plugins",
      useCases: "Anwendungsfälle",
      installed: "Installiert",
      data: "Unsere Daten",
      dataSets: "Datensätze",
      dataSources: "Datenquellen",
      dataStructures: "Datenstrukturen",
      tenantManagement: "Mandantenverwaltung",
      docs: "Dokumentation",
      breadcrumbCatalog: "Katalog",
      breadcrumbPlugins: "Plugins",
      breadcrumbUseCases: "Anwendungsfälle",
    },
  },
  catalog: {
    heading: "Add-on Katalog",
    subtitle:
      "Zentrale Komponenten, Adapter und Tools für deinen CivitasCore Cluster finden und installieren.",
    countLabel: "von",
    noResults: "Keine Add-ons für die aktuelle Suche gefunden.",
    addonCountUnit: "Add-ons",
    backToCatalog: "Zurück zum Katalog",
  },
  useCases: {
    heading: "Anwendungsfälle",
    subtitle:
      "Wiederverwendbare Use Cases. Die Installation stellt den Anwendungsfall über das CivitasCore Portal-Backend bereit: Der DataSet-Lebenszyklus löst die Provisionierung (FROST-Projekt, APISIX-Route, NiFi-Pipeline) aus.",
    noResults: "Noch keine Anwendungsfälle im Katalog.",
    installQuestions: "Installationsfragen",
    includedArtifacts: "Enthaltene Artefakte",
    datasetReference: "Referenzierter CORE-Datensatz",
    backToCatalog: "Zurück zu den Anwendungsfällen",
    emptyInstalled: "Es wurden noch keine Anwendungsfälle installiert.",
    installedHeading: "Installierte Anwendungsfälle",
    installedSubtitle:
      "Diese Liste zeigt die über das Portal-Backend bereitgestellten Anwendungsfälle inklusive Provisionierungsprotokoll und aktuellem Lebenszyklus-Status.",
    detailsHeading: "Details",
    installabilityLabel: "Installierbarkeit",
    compatibilityLabel: "Kompatibilität",
    artifactsLabel: "Artefakte",
    sourceLabel: "Quelle",
    installHeading: "Installieren",
    installDescription:
      "Stellt den Anwendungsfall über das CivitasCore Portal-Backend bereit. Der DataSet-Lebenszyklus (stage → release) löst die Provisionierung der Infrastruktur aus.",
    requiredHeading: "Benötigt",
    aboutHeading: "Worum es geht",
    publisherLabel: "Herausgeber",
  },
  detail: {
    createInstallPr: "Create Install PR for my cluster",
    openRepository: "Open repository",
    addonLicense: "Add-on Lizenz",
    toolLicense: "Tool Lizenz",
    deploymentLabel: "Deployment",
    coreVersionsLabel: "Core-Versionen",
    categories: "Kategorien",
    compatibility: "Kompatibilität",
    branch: "Branch",
    updated: "Aktualisiert",
    readme: "README",
    readmeEmpty: "Für dieses Add-on wurde noch keine README hinterlegt.",
    installation: "Installation",
    installationHint:
      "Klone das Add-on in das Deployment-Repository und aktiviere es in deinem Inventory.",
    requiredCapabilities: "Benötigte Capabilities",
    noCapabilities: "Keine besonderen Anforderungen.",
    repository: "Repository",
    details: "Details",
    publisher: "Herausgeber",
    addonKindLabel: "Add-on · Web-App",
    integration: {
      heading: "Integration in CIVITAS/CORE",
      ssoTitle: "Single-Sign-On",
      ssoBody: "Anmeldung über Keycloak – dieselben Nutzer:innen und Rollen wie im Core.",
      restTitle: "REST & Webhooks",
      restBody: "API-Aufrufe und Webhook-Registrierungen für den Datenaustausch.",
    },
  },
  placeholders: {
    addonsCount: "Noch keine Add-ons verfügbar.",
    pluginsCount: "Noch keine Plugins verfügbar.",
    useCasesCount: "Noch keine Anwendungsfälle verfügbar.",
  },
  common: {
    signInHint: "Bitte melde dich an, um den AppStore zu nutzen.",
    signInButton: "Mit Civitas Login anmelden",
    connected: "Verbunden",
    notAvailable: "—",
    comingSoon: "Kommt bald.",
  },
};

export function getMarketplaceText(): MarketplaceTexts {
  return {
    locale: "de",
    ...MARKETPLACE_TEXT_DE,
  };
}
