import { repoListIndexSchema, type RepoListIndex } from "@/types/repo-list";

/**
 * Mock catalog fixture — a verbatim copy of the real repo-list `index.json`
 * (civitas-marketplace-catalog, v1.3.1), so the mock UI browses exactly what
 * the live catalog serves. Parsed through the real zod schema at module load:
 * if the fixture ever drifts from the schema, the app fails loudly, not subtly.
 *
 * Regenerate: copy the current index.json content into RAW_INDEX (keep `$schema` out).
 */
const RAW_INDEX = {
  "version": "1.3.1",
  "updatedAt": "2026-07-19T12:00:00Z",
  "addons": [
    {
      "id": "nodered-addon",
      "name": "NodeRed",
      "description": "Flow-based programming for the Internet of Things",
      "author": "bonn-624-dev",
      "categories": [
        "Integration",
        "IoT",
        "Automation"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/nodered_addon",
      "compatibility": [
        {
          "coreVersion": "2.0"
        },
        {
          "coreVersion": "2.1"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/nodered_addon",
        "path": "addons/nodered_addon"
      }
    },
    {
      "id": "airflow-addon",
      "name": "Apache Airflow",
      "description": "Platform to programmatically author, schedule and monitor workflows",
      "author": "bonn-624-dev",
      "categories": [
        "Workflow",
        "Analytics",
        "ETL"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/airflow_addon",
      "licenses": {
        "addon": "European Union Public License 1.2",
        "tool": "Apache License 2.0"
      },
      "compatibility": [
        {
          "coreVersion": "2.0",
          "branch": "main",
          "lastUpdated": "2026-05-20T11:05:19+02:00"
        }
      ],
      "requiredCapabilities": [
        "KEYCLOAK",
        "APISIX_INGRESS"
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/airflow_addon",
        "path": "addons/airflow_addon"
      }
    },
    {
      "id": "minio-addon",
      "name": "MinIO",
      "description": "High Performance Object Storage",
      "author": "bonn-624-dev",
      "categories": [
        "Storage",
        "S3",
        "Object Storage"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/minio_addon",
      "licenses": {
        "tool": "GNU Affero General Public License v3.0"
      },
      "compatibility": [
        {
          "coreVersion": "2.0",
          "branch": "main",
          "lastUpdated": "2025-06-26T08:52:07+00:00"
        },
        {
          "coreVersion": "2.1",
          "branch": "devel-v2.1",
          "lastUpdated": "2025-11-29T02:26:25+01:00"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/minio_addon",
        "path": "addons/minio_addon"
      }
    },
    {
      "id": "appsmith-addon",
      "name": "Appsmith",
      "description": "Build internal tools, CRUD apps and dashboards",
      "author": "bonn-624-dev",
      "categories": [
        "Low-Code",
        "Dashboard",
        "Frontend"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/appsmith_addon",
      "licenses": {
        "addon": "European Union Public License 1.2",
        "tool": "Apache License 2.0"
      },
      "compatibility": [
        {
          "coreVersion": "2.0",
          "branch": "main",
          "lastUpdated": "2026-05-20T11:10:22+02:00"
        },
        {
          "coreVersion": "2.1",
          "branch": "devel-v2.1",
          "lastUpdated": "2025-11-29T02:26:37+01:00"
        }
      ],
      "requiredCapabilities": [
        "APISIX_INGRESS"
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/appsmith_addon",
        "path": "addons/appsmith_addon"
      }
    },
    {
      "id": "hasura-addon",
      "name": "Hasura",
      "description": "Instant GraphQL APIs on your data",
      "author": "bonn-624-dev",
      "categories": [
        "GraphQL",
        "API",
        "Database"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/hasura_addon",
      "compatibility": [
        {
          "coreVersion": "2.1"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/hasura_addon",
        "path": "addons/hasura_addon"
      }
    },
    {
      "id": "supabase-addon",
      "name": "Supabase",
      "description": "Open source Firebase alternative",
      "author": "tsb-udp",
      "categories": [
        "Database",
        "Authentication",
        "Storage"
      ],
      "repository": "https://gitlab.com/tsb-udp/supabase_addon",
      "licenses": {
        "tool": "Apache License 2.0"
      },
      "compatibility": [
        {
          "coreVersion": "2.0",
          "branch": "main",
          "lastUpdated": "2025-10-15T18:52:19+02:00"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/tsb-udp/supabase_addon",
        "path": "addons/supabase_addon"
      }
    },
    {
      "id": "outline-addon",
      "name": "Outline",
      "description": "Wiki and knowledge base for growing teams",
      "author": "bonn-624-dev",
      "categories": [
        "Documentation",
        "Wiki",
        "Knowledge Base"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/outline_addon",
      "compatibility": [
        {
          "coreVersion": "2.0"
        },
        {
          "coreVersion": "2.1"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/outline_addon",
        "path": "addons/outline_addon"
      }
    },
    {
      "id": "opensearch-addon",
      "name": "OpenSearch",
      "description": "Open source distributed search & analytics suite",
      "author": "bonn-624-dev",
      "categories": [
        "Search",
        "Analytics",
        "Logging"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/opensearch_addon",
      "compatibility": [
        {
          "coreVersion": "2.0"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/opensearch_addon",
        "path": "addons/opensearch_addon"
      }
    },
    {
      "id": "geonetwork-addon",
      "name": "GeoNetwork",
      "description": "Catalog application to manage spatially referenced resources",
      "author": "bonn-624-dev",
      "categories": [
        "GIS",
        "Metadata",
        "Catalog"
      ],
      "repository": "https://gitlab.com/bonn-624-dev/platform/geonetwork_addon",
      "compatibility": [
        {
          "coreVersion": "2.0"
        }
      ],
      "deploymentRef": {
        "type": "git",
        "url": "https://gitlab.com/bonn-624-dev/platform/geonetwork_addon",
        "path": "addons/geonetwork_addon"
      }
    }
  ],
  "useCases": [
    {
      "id": "tree-register-starter",
      "title": "Baumkataster Starter App",
      "summary": "Ein kleines, wiederverwendbares Starterpaket für einen kommunalen Baumkataster-Datensatz.",
      "description": "Dieser Demo-Anwendungsfall installiert einen einfachen CORE-Datensatz inklusive einer Datenstruktur für Baumeinträge über das CivitasCore Portal-Backend. Er dient als prototypischer Installationsfluss im Marketplace Add-on.",
      "publisher": "Stadt Musterstadt",
      "categories": [
        "Umwelt",
        "Grünflächen",
        "Kataster"
      ],
      "maturity": "prototype",
      "installability": "direct",
      "compatibility": [
        "2.0",
        "2.1"
      ],
      "requiredCapabilities": [
        "PORTAL_BACKEND"
      ],
      "installQuestions": [
        "Welche Fachabteilung soll den Datensatz später übernehmen?"
      ],
      "includedArtifacts": [
        {
          "id": "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0",
          "title": "Tree Register Starter",
          "kind": "dataset",
          "description": "Ein CORE-Datensatz für kommunale Baumeinträge."
        },
        {
          "id": "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0",
          "title": "TreeRecord",
          "kind": "datastructure",
          "description": "Minimale JSON-Schema-Datenstruktur für einen Baumdatensatz."
        }
      ],
      "modelForge": {
        "datasetId": "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0",
        "note": "Beim Installieren legt der Marketplace die Artefakte (DataStructure + DataSet) über das CivitasCore Portal-Backend an, falls sie noch nicht existieren, und durchläuft den DataSet-Lebenszyklus (stage → release)."
      },
      "source": {
        "repoUrl": "https://gitlab.com/civitascore-openurbanapps/commune-musterstadt-baumkataster",
        "gitIdentifier": "v1.0.0"
      }
    },
    {
      "id": "mittelerde-trafficcounter",
      "title": "Verkehrszählung Mittelerde (Hobbit-Land)",
      "summary": "Verkehrszählung über Dialog-Displays: Fahrzeugzahlen und Geschwindigkeiten je Zählstelle als wiederverwendbares Use-Case-Paket.",
      "description": "Die Kommune Mittelerde erfasst mit Dialog-Displays (Smiley-Tafeln) Fahrzeugzahlen und Durchschnittsgeschwindigkeiten. Dieser Use-Case installiert die Datenstrukturen und den Datensatz dafür über das CivitasCore Portal-Backend. Die Artefakt-Quelle liegt in einem eigenen Git-Repo (siehe source); der Marketplace installiert direkt aus diesem Repo.",
      "publisher": "Kommune Mittelerde",
      "categories": [
        "Mobilität",
        "Verkehr"
      ],
      "maturity": "prototype",
      "installability": "direct",
      "compatibility": [
        "2.0",
        "2.1"
      ],
      "requiredCapabilities": [
        "PORTAL_BACKEND"
      ],
      "installQuestions": [
        "Welche Zählstellen-Standorte sollen initial erfasst werden?"
      ],
      "includedArtifacts": [
        {
          "id": "urn:core:platform:civitas:dataset:common:TrafficCounter-Mittelerde:1.0.0",
          "title": "TrafficCounter Mittelerde",
          "kind": "dataset",
          "description": "Datensatz für die Verkehrszählung der Kommune Mittelerde."
        },
        {
          "id": "urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.0.0",
          "title": "TrafficCounterReading",
          "kind": "datastructure",
          "description": "Eine Zählstellen-Messung: Fahrzeuganzahl, Geschwindigkeit, Richtung, Standort."
        },
        {
          "id": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
          "title": "GeoPoint",
          "kind": "datastructure",
          "description": "Geokoordinate (lat/lon), gemeinsam genutztes Plattform-Element."
        }
      ],
      "source": {
        "repoUrl": "https://gitlab.com/civitascore-openurbanapps/commune-mittelerde-trafficcounter",
        "gitIdentifier": "v1.1.0"
      },
      "modelForge": {
        "datasetId": "urn:core:platform:civitas:dataset:common:TrafficCounter-Mittelerde:1.0.0",
        "note": "Beim Installieren legt der Marketplace die Artefakte (GeoPoint, TrafficCounterReading, DataSet) über das CivitasCore Portal-Backend an, falls sie noch nicht existieren. GeoPoint wird wiederverwendet, wenn es bereits existiert."
      }
    },
    {
      "id": "mittelerde-feinstaub",
      "title": "Feinstaub Mittelerde",
      "summary": "Feinstaub-Messwerte (PM2.5/PM10) je Messstation als wiederverwendbares Use-Case-Paket.",
      "description": "Die Kommune Mittelerde erfasst Feinstaub (PM2.5/PM10) an Messstationen. Beim Installieren wird der Inhalt direkt aus dem Artefakt-Repo (Tag v1.0.0) geladen und über das CivitasCore Portal-Backend angelegt — der Marketplace liefert nichts davon mit.",
      "publisher": "Kommune Mittelerde",
      "categories": [
        "Umwelt",
        "Luftqualität"
      ],
      "maturity": "prototype",
      "installability": "direct",
      "compatibility": [
        "2.0",
        "2.1"
      ],
      "requiredCapabilities": [
        "PORTAL_BACKEND"
      ],
      "includedArtifacts": [
        {
          "id": "urn:core:platform:civitas:dataset:common:Feinstaub-Mittelerde:1.0.0",
          "title": "Feinstaub Mittelerde",
          "kind": "dataset",
          "description": "Datensatz für die Feinstaub-Messungen der Kommune Mittelerde."
        },
        {
          "id": "urn:core:platform:civitas:datastructure:environment:AirQualityReading:1.0.0",
          "title": "AirQualityReading",
          "kind": "datastructure",
          "description": "Eine Feinstaub-Messung: PM2.5/PM10, Zeitpunkt, Standort."
        },
        {
          "id": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
          "title": "GeoPoint",
          "kind": "datastructure",
          "description": "Geokoordinate (lat/lon), gemeinsam genutztes Plattform-Element."
        }
      ],
      "source": {
        "repoUrl": "https://gitlab.com/civitascore-openurbanapps/commune-mittelerde-feinstaub",
        "gitIdentifier": "v1.0.0"
      },
      "modelForge": {
        "datasetId": "urn:core:platform:civitas:dataset:common:Feinstaub-Mittelerde:1.0.0",
        "note": "Beim Installieren wird das Bundle aus dem Artefakt-Repo (Tag v1.0.0) geholt und über das CivitasCore Portal-Backend angelegt. GeoPoint wird wiederverwendet, falls es bereits existiert."
      }
    }
  ]
};

export const mockRepoListIndex: RepoListIndex = repoListIndexSchema.parse(RAW_INDEX);
