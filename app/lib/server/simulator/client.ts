/**
 * Client for the demo data generator (`civitas/demo-data-generator`).
 *
 * The generator publishes believable sensor readings onto the bundled simulation
 * broker, so a freshly installed use case shows moving data instead of an empty
 * screen. It is a *separate add-on*, deliberately: a second marketplace replica
 * would otherwise duplicate every published message.
 *
 * Two rules shape this client:
 *
 *  - **Best-effort, always.** A demo tool must never be able to fail an install.
 *    Every call resolves; failures are reported to the caller as a message to put
 *    on the install record, not thrown. Not configured → not used, silently.
 *  - **The caller owns the id.** We pass the dataset id, so uninstall can DELETE
 *    without a lookup table and a retry converges instead of starting a second
 *    publisher.
 */

const DEFAULT_TIMEOUT_MS = 5000;

/** One field's value source — mirrors the generator's own scenario vocabulary. */
export type GeneratorSpec =
  | { kind: "constant"; value: unknown }
  | { kind: "now" }
  | { kind: "enum"; values: unknown[] }
  | { kind: "randomWalk"; min: number; max: number; step: number; start?: number; integer?: boolean }
  | { kind: "dailyProfile"; min: number; max: number; peakHours: number[]; noise?: number; integer?: boolean };

export interface Scenario {
  intervalSeconds: number;
  /** Field name → how its value is produced. Dotted paths nest. */
  fields: Record<string, GeneratorSpec>;
}

export interface RegisterSimulationInput {
  /** Broker URL **as the generator reaches it** — not the address NiFi uses. */
  brokerUrl: string;
  topic: string;
  scenario: Scenario;
}

/** Outcome of a best-effort call: either it is running, or here is why not. */
export type SimulatorOutcome = { ok: true } | { ok: false; error: string };

export interface SimulatorClient {
  register(id: string, input: RegisterSimulationInput): Promise<SimulatorOutcome>;
  unregister(id: string): Promise<SimulatorOutcome>;
}

export interface HttpSimulatorClientOptions {
  /** Control-plane base URL, e.g. `http://localhost:4300`. */
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class HttpSimulatorClient implements SimulatorClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: HttpSimulatorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * `PUT /simulations/{id}` — create or replace. The generator connects to the
   * broker during this call, so a 502 here means the broker is unreachable, not
   * that the request was malformed: it refuses to register a simulation that would
   * silently never publish.
   */
  async register(id: string, input: RegisterSimulationInput): Promise<SimulatorOutcome> {
    return this.call("PUT", `/simulations/${encodeURIComponent(id)}`, {
      transport: { kind: "mqtt", url: input.brokerUrl, topic: input.topic },
      scenario: input.scenario,
    });
  }

  /** `DELETE /simulations/{id}`. A 404 is success — nothing is publishing. */
  async unregister(id: string): Promise<SimulatorOutcome> {
    return this.call("DELETE", `/simulations/${encodeURIComponent(id)}`);
  }

  private async call(method: string, path: string, body?: unknown): Promise<SimulatorOutcome> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.ok || response.status === 404) return { ok: true };
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Der Demo-Datengenerator antwortete mit ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}.`,
      };
    } catch (error) {
      return {
        ok: false,
        error: `Der Demo-Datengenerator ist nicht erreichbar (${error instanceof Error ? error.message : "unbekannter Fehler"}).`,
      };
    }
  }
}

/**
 * Build the simulator client from environment configuration, or `undefined` when
 * `MARKETPLACE_SIMULATOR_URL` is unset — which is a supported deployment, not a
 * misconfiguration: an instance without the generator installs use cases normally
 * and simply offers no demo data.
 */
export function createSimulatorClient(): SimulatorClient | undefined {
  const baseUrl = process.env.MARKETPLACE_SIMULATOR_URL?.trim();
  return baseUrl ? new HttpSimulatorClient({ baseUrl }) : undefined;
}

/**
 * The broker address **the generator publishes to**, which is not the one the
 * datasource stores. NiFi consumes from inside the platform network
 * (`tcp://civitas-mosquitto:1883`); the generator usually runs on the host, where
 * the same broker is `mqtt://localhost:1884`. Same broker, two addresses — and
 * confusing them looks exactly like a dead pipeline.
 */
export function simulatorBrokerUrl(): string {
  return process.env.MARKETPLACE_SIMULATOR_BROKER_URL?.trim() || "mqtt://localhost:1884";
}
