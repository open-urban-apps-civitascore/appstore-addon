import type { UseCaseBundle } from "@/lib/server/bundle";
import { parseUrn } from "@/lib/urn";
import type { DatasetLifecycleStatus, UseCase } from "@/types/use-cases";

/**
 * CORE-IR → portal-backend payload mapper.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  THIS IS THE ONE MODULE THAT GUESSES portal-backend REQUEST-BODY FIELD NAMES. │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * We have the platform's *contract* (endpoints, ordering, lifecycle, headers) but
 * NOT its OpenAPI spec or a live instance, so the exact DTO field names below are
 * assumptions. Every guessed field is tagged `TODO(confirm): field names vs live
 * OpenAPI`. Keep all such guesses here — do not scatter them across the client or
 * orchestrator — so confirming them against the real spec is a single-file change.
 *
 * Source of truth = the use case's CORE-IR bundle (`fetchUseCaseBundle`): a dataset
 * manifest plus one JSON Schema per datastructure element. The bundle does not
 * (yet) carry datasource / pipeline / datasink specs, so those are synthesized as
 * clearly-marked placeholders — a provisionable use case needs them, and the whole
 * point is to exercise the full install sequence. Real content should come from an
 * extended CORE-IR bundle (see follow-ups).
 */

/** Connector types the portal-backend's datasource endpoint accepts. */
export type DatasourceConnectorType = "MQTT" | "SQL";

export interface DatastructurePlanItem {
  /** CORE URN of the element (from the bundle). */
  ref: string;
  name: string;
  version: string;
  /** Body for `POST /datastructures`. */
  createBody: Record<string, unknown>;
  /** Body for `POST /datastructures/{id}/versions`. */
  versionBody: Record<string, unknown>;
}

export interface PortalBackendInstallPlan {
  datastructures: DatastructurePlanItem[];
  /** CORE URNs of the datastructures, in order (first is the pipeline target). */
  datastructureRefs: string[];
  /** Body for `POST /datasources`. */
  datasource: Record<string, unknown>;
  /** Body for `POST /datasets` (created in DRAFT). */
  dataset: Record<string, unknown>;
  /** Body for `POST /datasets/{id}/datasinks`. */
  datasink: Record<string, unknown>;
  /**
   * The pipeline body ({@link toPipelineBody}) is NOT part of the static plan: it
   * references the datasource's server-assigned id, which only exists once the
   * datasource has been created, so the orchestrator builds it mid-sequence.
   */
  /** Non-wire summary reused by the install store / UI. */
  summary: {
    datasetTitle: string;
    datasetDescription: string;
    dataStructures: { name: string; version: string }[];
  };
}

/** `POST /datastructures` body for one CORE-IR element. */
export function toDatastructureCreateBody(element: UseCaseBundle["elements"][number]): Record<string, unknown> {
  const { name } = parseUrn(element.ref);
  const title = typeof element.schema.title === "string" ? element.schema.title : name;
  // TODO(confirm): field names vs live OpenAPI — a datastructure "shell" carrying
  // its CORE URN + human title; the schema itself goes on the version below.
  return {
    name,
    urn: element.ref,
    title,
  };
}

/** `POST /datastructures/{id}/versions` body carrying the JSON Schema. */
export function toDatastructureVersionBody(element: UseCaseBundle["elements"][number]): Record<string, unknown> {
  const { version } = parseUrn(element.ref);
  // TODO(confirm): field names vs live OpenAPI — a version bundles the JSON Schema
  // and a semantic version label; whether the schema is `schema`, `jsonSchema` or
  // an inline document is unconfirmed.
  return {
    version,
    schema: element.schema,
  };
}

/**
 * `POST /datasources` body — a PLACEHOLDER connector. The CORE-IR bundle does not
 * carry connection details (or secrets) yet, so this is a stand-in MQTT source.
 */
export function toDatasourceBody(useCase: UseCase, bundle: UseCaseBundle): Record<string, unknown> {
  // TODO(confirm): field names vs live OpenAPI — connector type discriminator and
  // the shape of `config` (which in the real world also carries secrets).
  // TODO(content): real datasource spec should come from an extended CORE-IR bundle.
  const connectorType: DatasourceConnectorType = "MQTT";
  return {
    name: `${bundle.dataset.title} – Source`,
    connectorType,
    config: {
      // Placeholder connection details — replace with the use case's real source.
      host: "mqtt://localhost:1883",
      topic: `civitas/${useCase.id}`,
    },
  };
}

/** `POST /datasets` body (creates the DRAFT). References the datastructures by URN. */
export function toDatasetBody(bundle: UseCaseBundle, datastructureRefs: string[]): Record<string, unknown> {
  // TODO(confirm): field names vs live OpenAPI — dataset title/description/version
  // and how datastructures are referenced (`datastructureRefs` of URNs vs created ids).
  return {
    name: bundle.dataset.title,
    description: bundle.dataset.description ?? "",
    version: bundle.dataset.version ?? "1.0.0",
    datastructureRefs,
  };
}

/**
 * `POST /datasets/{id}/pipelines` body — a PLACEHOLDER pipeline wiring the
 * datasource to the first datastructure. Real pipeline steps should come from the
 * CORE-IR bundle.
 */
export function toPipelineBody(
  bundle: UseCaseBundle,
  datasourceRef: string,
  datastructureRef: string | undefined,
): Record<string, unknown> {
  // TODO(confirm): field names vs live OpenAPI — pipeline source/target references
  // and the `steps` shape validated by `stage`.
  // TODO(content): real pipeline definition should come from an extended CORE-IR bundle.
  return {
    name: `${bundle.dataset.title} – Pipeline`,
    datasourceRef,
    datastructureRef,
    steps: [],
  };
}

/**
 * `POST /datasets/{id}/datasinks` body — a PLACEHOLDER sink. In CivitasCore the
 * dataset release provisions a FROST project; the concrete sink config is unknown
 * here.
 */
export function toDatasinkBody(bundle: UseCaseBundle): Record<string, unknown> {
  // TODO(confirm): field names vs live OpenAPI — sink type discriminator + config.
  // TODO(content): real datasink definition should come from an extended CORE-IR bundle.
  return {
    name: `${bundle.dataset.title} – Sink`,
    type: "FROST",
    config: {},
  };
}

/** Build the full ordered install plan from a use case and its CORE-IR bundle. */
export function buildInstallPlan(useCase: UseCase, bundle: UseCaseBundle): PortalBackendInstallPlan {
  const datastructures: DatastructurePlanItem[] = bundle.elements.map((element) => {
    const { name, version } = parseUrn(element.ref);
    return {
      ref: element.ref,
      name,
      version,
      createBody: toDatastructureCreateBody(element),
      versionBody: toDatastructureVersionBody(element),
    };
  });

  const datastructureRefs = datastructures.map((item) => item.ref);

  return {
    datastructures,
    datastructureRefs,
    datasource: toDatasourceBody(useCase, bundle),
    dataset: toDatasetBody(bundle, datastructureRefs),
    datasink: toDatasinkBody(bundle),
    summary: {
      datasetTitle: bundle.dataset.title,
      datasetDescription: bundle.dataset.description ?? "",
      dataStructures: datastructures.map(({ name, version }) => ({ name, version })),
    },
  };
}

/**
 * Map the portal-backend's dataset lifecycle state (read from `GET /datasets/{id}`)
 * onto the app's {@link DatasetLifecycleStatus}. The raw status *field name and
 * values* are assumed — another guess centralized here.
 */
export function readLifecycleStatus(datasetBody: unknown): DatasetLifecycleStatus | null {
  if (!datasetBody || typeof datasetBody !== "object") return null;
  // TODO(confirm): field names vs live OpenAPI — the dataset's lifecycle field is
  // assumed to be `status` (or `state`) carrying these tokens.
  const record = datasetBody as Record<string, unknown>;
  const raw = record.status ?? record.state ?? record.lifecycleStatus;
  if (typeof raw !== "string") return null;

  switch (raw.toUpperCase()) {
    case "DRAFT":
      return "DRAFT";
    case "READY":
    case "STAGED":
      return "READY";
    case "AVAILABLE":
    case "RELEASED":
    case "PUBLISHED":
      return "AVAILABLE";
    case "RELEASING":
    case "PROVISIONING":
    case "PENDING":
      return "PROVISIONING";
    default:
      return null;
  }
}
