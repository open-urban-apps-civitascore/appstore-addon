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
    modelForgeSource: string;
    backToCatalog: string;
    emptyInstalled: string;
    installedHeading: string;
    installedSubtitle: string;
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
      "Wiederverwendbare Use Cases als kontrollierter Entwurfsimport. Der Installationsfluss liest den referenzierten Datensatz direkt aus Model Forge und legt daraus lokal einen Draft an.",
    noResults: "Noch keine Anwendungsfälle im Katalog.",
    installQuestions: "Installationsfragen",
    includedArtifacts: "Enthaltene Artefakte",
    modelForgeSource: "Model-Forge-Quelldatensatz",
    backToCatalog: "Zurück zu den Anwendungsfällen",
    emptyInstalled: "Es wurden noch keine Anwendungsfälle installiert.",
    installedHeading: "Installierte Entwürfe",
    installedSubtitle:
      "Diese Liste zeigt die lokal erzeugten Draft-Installationen des Marketplace-Prototyps aus dem aktuellen Model-Forge-Datensatz inklusive Importprotokoll.",
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
