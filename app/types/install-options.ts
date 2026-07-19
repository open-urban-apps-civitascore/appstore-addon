import { z } from "zod";

/**
 * The pre-install fork (D10): what the user chooses before an install runs.
 * Shared by the install form (client), the install API route (validation) and
 * the orchestrator (behavior). Everything defaults to the one-click demo path,
 * so a bodyless POST behaves exactly like before the fork existed.
 *
 * Two axes (see decisions.md D10):
 *  - data source: demo (preset config) · own broker (user-supplied MQTT
 *    connection) · later (no source yet → the install stops at a DRAFT shell)
 *  - go live: release (provision now → AVAILABLE) · stage (stop at READY —
 *    an authorised human releases later; respects DATASET_RELEASE separation)
 */

export const ownBrokerConfigSchema = z.object({
  /** MQTT broker URL, e.g. tcp://broker.example:1883 */
  url: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  username: z.string().trim().min(1).optional(),
  // A secret: forwarded into the datasource `configuration` on the backend,
  // NEVER persisted in the install record, the trace, or logs (D3).
  password: z.string().min(1).optional(),
});

export const installOptionsSchema = z.object({
  dataSource: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("demo") }),
      z.object({ mode: z.literal("own"), config: ownBrokerConfigSchema }),
      z.object({ mode: z.literal("later") }),
    ])
    .default({ mode: "demo" }),
  goLive: z.enum(["release", "stage"]).default("release"),
  /**
   * Answers to the bundle's `installQuestions`, keyed by the question text (the
   * catalog carries plain question strings, no ids). Free text, not secrets —
   * persisted on the install record for traceability.
   */
  answers: z.record(z.string(), z.string()).default({}),
});

export type InstallOptions = z.infer<typeof installOptionsSchema>;
export type OwnBrokerConfig = z.infer<typeof ownBrokerConfigSchema>;

/** The all-defaults options — the pre-fork one-click behavior. */
export const DEFAULT_INSTALL_OPTIONS: InstallOptions = installOptionsSchema.parse({});
