import type { Scenario } from "@/lib/server/simulator/client";

/**
 * What a use case's demo data looks like.
 *
 * **This is the wrong home for it, on purpose and temporarily.** The question
 * "who knows that a village street sees 2 cars at 3am and 180 at 8am?" has exactly
 * one good answer: the use-case author. So the standing decision is that scenarios
 * live in the bundle (`demo/scenario.json`, fetched like the rest of the CORE-IR
 * content) and the marketplace only passes them through — see
 * `docs/architecture/demo-data-generator.md`.
 *
 * They are hardcoded here for the first working install because publishing a
 * bundle is a slower loop than editing this file, and the shape is still moving.
 *
 * TODO(content): read `demo/scenario.json` from the bundle, keep this table only
 * as the fallback for bundles that ship none. A use case without a scenario simply
 * has no demo mode — we never fabricate one from the JSON Schema, which produces
 * `vehicleCount: 0` forever or four million cars a minute.
 */

/** Scenario per use case id. Absent → that use case offers no demo data. */
const SCENARIOS: Record<string, Scenario> = {
  "hello-trafficcounter": {
    intervalSeconds: 10,
    fields: {
      counterId: { kind: "constant", value: "counter-001" },
      timestamp: { kind: "now" },
      // The generator that makes demo data believable: low at night, peaking at
      // the morning and evening commute. A flat random series between two bounds
      // reads as fake immediately.
      vehicleCount: { kind: "dailyProfile", min: 2, max: 180, peakHours: [8, 17], integer: true },
    },
  },
};

export function scenarioFor(useCaseId: string): Scenario | undefined {
  return SCENARIOS[useCaseId];
}
