import { BundleError, type UseCaseBundle } from "@/lib/server/bundle";
import type { UseCase } from "@/types/use-cases";

/**
 * Mock bundle fixtures — the real CORE-IR content of the three artifact repos,
 * embedded so the mock install needs no network. Faithful to reality on
 * 2026-07-18: only the trafficcounter ships `core-ir/pipeline.json`, so its mock
 * install reaches AVAILABLE while the other two send the empty placeholder model
 * and the (mock) saga compensates back to READY — exactly like the live stack.
 *
 * Keyed by `source.repoUrl` because that is all `fetchBundle` receives.
 */

const TRAFFICCOUNTER_BUNDLE: UseCaseBundle = {
  dataset: {
    "id": "urn:core:platform:civitas:dataset:common:TrafficCounter-Mittelerde:1.0.0",
    "title": "TrafficCounter Mittelerde",
    "description": "Als Entwurf installierter Datensatz für die Verkehrszählung der Kommune Mittelerde.",
    "version": "1.0",
    "dataStructureRefs": [
      "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
      "urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.0.0"
    ]
  },
  elements: [
    {
      "ref": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
        "title": "GeoPoint",
        "type": "object",
        "required": [
          "lat",
          "lon"
        ],
        "properties": {
          "lat": {
            "type": "number"
          },
          "lon": {
            "type": "number"
          }
        }
      }
    },
    {
      "ref": "urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.0.0",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.0.0",
        "title": "TrafficCounterReading",
        "type": "object",
        "required": [
          "counterId",
          "timestamp",
          "vehicleCount",
          "location"
        ],
        "properties": {
          "counterId": {
            "type": "string",
            "description": "Kennung der Zählstelle."
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "Zeitpunkt der Messung."
          },
          "vehicleCount": {
            "type": "integer",
            "minimum": 0,
            "description": "Anzahl gezählter Fahrzeuge im Messintervall."
          },
          "avgSpeedKmh": {
            "type": "number",
            "minimum": 0,
            "description": "Durchschnittsgeschwindigkeit in km/h, falls erfasst."
          },
          "direction": {
            "type": "string",
            "enum": [
              "inbound",
              "outbound"
            ],
            "description": "Fahrtrichtung relativ zur Zählstelle."
          },
          "deviceType": {
            "type": "string",
            "enum": [
              "dialog-display",
              "induction-loop",
              "radar"
            ],
            "description": "Art des Zählgeräts."
          },
          "location": {
            "$ref": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0"
          }
        }
      }
    }
  ],
  source: { repoUrl: "https://gitlab.com/civitascore-openurbanapps/commune-mittelerde-trafficcounter", gitIdentifier: "v1.1.0" },
  pipeline: {
    "edges": [
      {
        "id": "23307758-564a-418f-96e3-d040e3153490",
        "data": {
          "label": ""
        },
        "type": "smoothstep",
        "source": "d00c6065-7add-4bb7-bfa2-186631aff324",
        "target": "6508b640-daeb-4a33-a44a-66a20190f958"
      },
      {
        "id": "1ebcdc66-eade-47c2-aa29-292f0b47d2fd",
        "data": {
          "label": ""
        },
        "type": "smoothstep",
        "source": "6508b640-daeb-4a33-a44a-66a20190f958",
        "target": "4bc5c1fe-b6fa-4c9a-84da-500d4a35b75e"
      },
      {
        "id": "991def26-9653-4277-b7ae-d31fc95657cb",
        "data": {
          "label": ""
        },
        "type": "smoothstep",
        "source": "4bc5c1fe-b6fa-4c9a-84da-500d4a35b75e",
        "target": "7be58914-dec8-4a3f-97c9-fed8492f6b01"
      }
    ],
    "nodes": [
      {
        "id": "d00c6065-7add-4bb7-bfa2-186631aff324",
        "data": {
          "label": "Start",
          "nodeType": "start",
          "configured": true,
          "description": "Entry point of the pipeline. Execution begins here."
        },
        "type": "start",
        "dragging": false,
        "measured": {
          "width": 32,
          "height": 32
        },
        "position": {
          "x": 80,
          "y": 180
        },
        "selected": false
      },
      {
        "id": "6508b640-daeb-4a33-a44a-66a20190f958",
        "data": {
          "label": "DataSource",
          "entityId": null,
          "configured": true,
          "entityName": "TrafficCounter Mittelerde – Source",
          "entityType": "datasource",
          "entityMetadata": {
            "connector": "MQTT"
          }
        },
        "type": "dataSource",
        "dragging": false,
        "measured": {
          "width": 234,
          "height": 66
        },
        "position": {
          "x": 160,
          "y": 160
        },
        "selected": false
      },
      {
        "id": "4bc5c1fe-b6fa-4c9a-84da-500d4a35b75e",
        "data": {
          "label": "Sensor Data Storage",
          "version": "1.1",
          "entityId": null,
          "serverUrl": "",
          "configured": true,
          "entityType": "frost",
          "serverName": "Sensor Data Storage"
        },
        "type": "frost",
        "dragging": false,
        "measured": {
          "width": 185,
          "height": 56
        },
        "position": {
          "x": 480,
          "y": 160
        },
        "selected": false
      },
      {
        "id": "7be58914-dec8-4a3f-97c9-fed8492f6b01",
        "data": {
          "label": "End",
          "nodeType": "end",
          "configured": true,
          "description": "Exit point of the pipeline. Execution completes here."
        },
        "type": "end",
        "dragging": false,
        "measured": {
          "width": 32,
          "height": 32
        },
        "position": {
          "x": 780,
          "y": 160
        },
        "selected": true
      }
    ],
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1
    },
    "nodePositions": {
      "4bc5c1fe-b6fa-4c9a-84da-500d4a35b75e": {
        "x": 480,
        "y": 160
      },
      "6508b640-daeb-4a33-a44a-66a20190f958": {
        "x": 160,
        "y": 160
      },
      "7be58914-dec8-4a3f-97c9-fed8492f6b01": {
        "x": 780,
        "y": 160
      },
      "d00c6065-7add-4bb7-bfa2-186631aff324": {
        "x": 80,
        "y": 180
      }
    }
  },
};

const BAUMKATASTER_BUNDLE: UseCaseBundle = {
  dataset: {
    "id": "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0",
    "title": "Baumkataster Starter",
    "description": "Als Entwurf installierter Datensatz für einen kommunalen Baumkataster-Prototyp.",
    "version": "1.0",
    "dataStructureRefs": [
      "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0"
    ]
  },
  elements: [
    {
      "ref": "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0",
        "title": "TreeRecord",
        "type": "object",
        "required": [
          "treeId",
          "species",
          "location"
        ],
        "properties": {
          "treeId": {
            "type": "string",
            "description": "Lokale Kennung des Baums."
          },
          "species": {
            "type": "string",
            "description": "Baumart."
          },
          "plantedAt": {
            "type": "string",
            "format": "date",
            "description": "Pflanzdatum, falls bekannt."
          },
          "location": {
            "type": "object",
            "required": [
              "lat",
              "lon"
            ],
            "properties": {
              "lat": {
                "type": "number"
              },
              "lon": {
                "type": "number"
              }
            }
          }
        }
      }
    }
  ],
  source: { repoUrl: "https://gitlab.com/civitascore-openurbanapps/commune-musterstadt-baumkataster", gitIdentifier: "v1.0.0" },
};

const FEINSTAUB_BUNDLE: UseCaseBundle = {
  dataset: {
    "id": "urn:core:platform:civitas:dataset:common:Feinstaub-Mittelerde:1.0.0",
    "title": "Feinstaub Mittelerde",
    "description": "Feinstaub-Messwerte (PM2.5/PM10) der Kommune Mittelerde.",
    "version": "1.0",
    "dataStructureRefs": [
      "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
      "urn:core:platform:civitas:datastructure:environment:AirQualityReading:1.0.0"
    ]
  },
  elements: [
    {
      "ref": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0",
        "title": "GeoPoint",
        "type": "object",
        "required": [
          "lat",
          "lon"
        ],
        "properties": {
          "lat": {
            "type": "number"
          },
          "lon": {
            "type": "number"
          }
        }
      }
    },
    {
      "ref": "urn:core:platform:civitas:datastructure:environment:AirQualityReading:1.0.0",
      "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "urn:core:platform:civitas:datastructure:environment:AirQualityReading:1.0.0",
        "title": "AirQualityReading",
        "type": "object",
        "required": [
          "stationId",
          "timestamp",
          "location"
        ],
        "properties": {
          "stationId": {
            "type": "string",
            "description": "Kennung der Messstation."
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "Zeitpunkt der Messung."
          },
          "pm25": {
            "type": "number",
            "minimum": 0,
            "description": "Feinstaub PM2.5 in µg/m³."
          },
          "pm10": {
            "type": "number",
            "minimum": 0,
            "description": "Feinstaub PM10 in µg/m³."
          },
          "location": {
            "$ref": "urn:core:platform:civitas:datastructure:common:GeoPoint:1.0.0"
          }
        }
      }
    }
  ],
  source: { repoUrl: "https://gitlab.com/civitascore-openurbanapps/commune-mittelerde-feinstaub", gitIdentifier: "v1.0.0" },
};

export const mockBundlesByRepoUrl: Record<string, UseCaseBundle> = {
  [TRAFFICCOUNTER_BUNDLE.source.repoUrl]: TRAFFICCOUNTER_BUNDLE,
  [BAUMKATASTER_BUNDLE.source.repoUrl]: BAUMKATASTER_BUNDLE,
  [FEINSTAUB_BUNDLE.source.repoUrl]: FEINSTAUB_BUNDLE,
};

/** Drop-in for `fetchUseCaseBundle` in mock mode — resolves from the fixtures above. */
export async function mockFetchBundle(
  source: NonNullable<UseCase["source"]>,
): Promise<UseCaseBundle> {
  const bundle = mockBundlesByRepoUrl[source.repoUrl];
  if (!bundle) {
    throw new BundleError(`Mock mode has no bundle fixture for ${source.repoUrl}`, 424);
  }
  return bundle;
}
