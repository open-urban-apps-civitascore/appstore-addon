import { installedUseCaseSchema, type InstalledUseCase } from "@/types/use-cases";

/**
 * Seed records for the mock install store — so the installed view shows lifecycle
 * variety on first launch without clicking anything:
 *
 *   - trafficcounter: a completed install (AVAILABLE) with the full, realistic
 *     provisioning trace (mirrors the sequence the live install produced)
 *   - baumkataster: a DRAFT install — a PREVIEW of the D10 "configure later"
 *     target state that the install flow doesn't produce yet, seeded so the
 *     activation UI can be built against real-shaped data
 *
 * The third use case (feinstaub) is deliberately NOT seeded: it stays free for a
 * live install click in the demo (its bundle has no pipeline, so the mock saga
 * compensates it to READY — after one click all four states have been on screen).
 *
 * Ids are prefixed `seed-` so they can never collide with ids the mock backend
 * mints (`mock-…`). The mock backend answers 404 for them, which the app treats
 * as "no newer state" (status falls back to the stored value) — and both
 * uninstall and reinstall handle the missing dataset gracefully.
 *
 * Validated through the real zod schema at module load: fixture drift fails loudly.
 */

const step = (label: string, method: string, path: string, status: number) => ({
  label,
  method,
  path,
  status,
});

const TRAFFICCOUNTER_INSTALL: InstalledUseCase = installedUseCaseSchema.parse({
  id: "seed-dataset-1",
  useCaseId: "mittelerde-trafficcounter",
  useCaseTitle: "Verkehrszählung Mittelerde (Hobbit-Land)",
  installedAt: "2026-07-15T13:47:00.000Z",
  status: "AVAILABLE",
  source: "portal-backend",
  createdDataset: {
    name: "TrafficCounter Mittelerde",
    description: "Als Entwurf installierter Datensatz für die Verkehrszählung der Kommune Mittelerde.",
    openDataAccess: false,
    status: "AVAILABLE",
  },
  createdDataStructures: [
    { name: "GeoPoint", version: "1.0.0" },
    { name: "TrafficCounterReading", version: "1.0.0" },
  ],
  datasetRef: {
    datasetId: "urn:core:platform:civitas:dataset:common:TrafficCounter-Mittelerde:1.0.0",
  },
  provisioningTrace: {
    provisionedAt: "2026-07-15T13:47:09.000Z",
    steps: [
      step("datastructure GeoPoint", "POST", "/datastructures", 201),
      step("datastructure version GeoPoint@1.0.0", "POST", "/datastructures/seed-structure-1/versions", 201),
      step("release version GeoPoint@1.0.0", "POST", "/datastructures/seed-structure-1/versions/seed-version-1/release", 200),
      step("release datastructure GeoPoint", "POST", "/datastructures/seed-structure-1/release", 200),
      step("datastructure TrafficCounterReading", "POST", "/datastructures", 201),
      step("datastructure version TrafficCounterReading@1.0.0", "POST", "/datastructures/seed-structure-2/versions", 201),
      step("release version TrafficCounterReading@1.0.0", "POST", "/datastructures/seed-structure-2/versions/seed-version-2/release", 200),
      step("release datastructure TrafficCounterReading", "POST", "/datastructures/seed-structure-2/release", 200),
      step("datasource", "POST", "/datasources", 201),
      step("release datasource", "POST", "/datasources/seed-source-1/release", 200),
      step("dataset (DRAFT)", "POST", "/datasets", 201),
      step("datasink (FROST)", "POST", "/datasets/seed-dataset-1/datasinks", 201),
      step("pipeline", "POST", "/datasets/seed-dataset-1/pipelines", 201),
      step("stage (DRAFT→READY)", "POST", "/datasets/seed-dataset-1/stage", 200),
      step("release (saga started)", "POST", "/datasets/seed-dataset-1/release", 202),
      step("saga succeeded (AVAILABLE)", "GET", "/datasets/seed-dataset-1", 200),
    ],
  },
  provisionedResources: {
    dataStructures: [
      { id: "seed-structure-1", versionId: "seed-version-1", name: "GeoPoint", version: "1.0.0" },
      { id: "seed-structure-2", versionId: "seed-version-2", name: "TrafficCounterReading", version: "1.0.0" },
    ],
    dataSourceId: "seed-source-1",
    dataSinkId: "seed-sink-1",
    pipelineId: "seed-pipeline-1",
  },
} satisfies InstalledUseCase);

const BAUMKATASTER_DRAFT: InstalledUseCase = installedUseCaseSchema.parse({
  id: "seed-dataset-2",
  useCaseId: "tree-register-starter",
  useCaseTitle: "Baumkataster Starter App",
  installedAt: "2026-07-17T09:12:00.000Z",
  status: "DRAFT",
  source: "portal-backend",
  createdDataset: {
    name: "Baumkataster Starter",
    description: "Als Entwurf installierter Datensatz für einen kommunalen Baumkataster-Prototyp.",
    openDataAccess: false,
    status: "DRAFT",
  },
  createdDataStructures: [{ name: "TreeRecord", version: "1.0.0" }],
  datasetRef: {
    datasetId: "urn:core:platform:civitas:dataset:common:Baumkataster-Starter:1.0.0",
  },
  provisioningTrace: {
    provisionedAt: "2026-07-17T09:12:04.000Z",
    steps: [
      step("datastructure TreeRecord", "POST", "/datastructures", 201),
      step("datastructure version TreeRecord@1.0.0", "POST", "/datastructures/seed-structure-3/versions", 201),
      step("release version TreeRecord@1.0.0", "POST", "/datastructures/seed-structure-3/versions/seed-version-3/release", 200),
      step("release datastructure TreeRecord", "POST", "/datastructures/seed-structure-3/release", 200),
      step("dataset (DRAFT)", "POST", "/datasets", 201),
    ],
  },
  provisionedResources: {
    dataStructures: [
      { id: "seed-structure-3", versionId: "seed-version-3", name: "TreeRecord", version: "1.0.0" },
    ],
  },
} satisfies InstalledUseCase);

export const mockInstalledSeed: InstalledUseCase[] = [TRAFFICCOUNTER_INSTALL, BAUMKATASTER_DRAFT];
