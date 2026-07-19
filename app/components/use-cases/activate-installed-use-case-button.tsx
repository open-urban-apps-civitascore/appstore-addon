"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActivationOptions } from "@/types/install-options";
import type { DatasetLifecycleStatus } from "@/types/use-cases";

/**
 * Post-install activation (D10, second half), on the installed card:
 *
 *   - READY  → a one-click "Freigeben" (the privileged release action)
 *   - DRAFT  → "Aktivieren" expands into a small chooser: data source
 *              (demo preset / own broker) + go live now or stage for review
 *   - anything else → renders nothing
 *
 * On success the page refreshes; a started saga shows as "Wird provisioniert"
 * and the installed view's auto-refresh carries it to "Verfügbar".
 */
export function ActivateInstalledUseCaseButton({
  useCaseId,
  status,
}: {
  useCaseId: string;
  status: DatasetLifecycleStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"demo" | "own">("demo");
  const [goLive, setGoLive] = useState<"release" | "stage">("release");
  const [broker, setBroker] = useState({ url: "", topic: "", username: "", password: "" });

  if (status !== "DRAFT" && status !== "READY") return null;

  const ownIncomplete = mode === "own" && (!broker.url.trim() || !broker.topic.trim());

  async function activate(options: ActivationOptions) {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/use-cases/${useCaseId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Die Aktivierung konnte nicht gestartet werden.");
      }
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Die Aktivierung konnte nicht gestartet werden.",
      );
    } finally {
      setIsPending(false);
    }
  }

  // READY: the graph exists — releasing is the single remaining action.
  if (status === "READY") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          onClick={() => activate({ dataSource: { mode: "demo" }, goLive: "release" })}
          disabled={isPending}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {isPending ? "Wird freigegeben…" : "Freigeben"}
        </Button>
        {error ? <p className="max-w-56 text-right text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  // DRAFT: the data source is still missing — choose it now, then go live.
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Rocket className="size-4" />
        Aktivieren
      </Button>
    );
  }

  return (
    <div className="flex w-72 flex-col gap-3 rounded-md border bg-background p-3 text-left">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="pb-1 text-xs font-semibold text-foreground">Datenquelle</legend>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="radio"
            name={`activate-source-${useCaseId}`}
            checked={mode === "demo"}
            onChange={() => setMode("demo")}
            className="accent-primary"
          />
          Demo-Datenquelle (vorkonfiguriert)
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="radio"
            name={`activate-source-${useCaseId}`}
            checked={mode === "own"}
            onChange={() => setMode("own")}
            className="accent-primary"
          />
          Eigener MQTT-Broker
        </label>
        {mode === "own" ? (
          <div className="ml-5 mt-1 flex flex-col gap-1.5">
            <input
              type="text"
              value={broker.url}
              onChange={(event) => setBroker({ ...broker, url: event.target.value })}
              placeholder="Broker-URL * (tcp://…)"
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
            <input
              type="text"
              value={broker.topic}
              onChange={(event) => setBroker({ ...broker, topic: event.target.value })}
              placeholder="Topic *"
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
            <input
              type="text"
              value={broker.username}
              onChange={(event) => setBroker({ ...broker, username: event.target.value })}
              placeholder="Benutzername (optional)"
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
            <input
              type="password"
              value={broker.password}
              onChange={(event) => setBroker({ ...broker, password: event.target.value })}
              placeholder="Passwort (optional)"
              autoComplete="new-password"
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="pb-1 text-xs font-semibold text-foreground">Freigabe</legend>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="radio"
            name={`activate-golive-${useCaseId}`}
            checked={goLive === "release"}
            onChange={() => setGoLive("release")}
            className="accent-primary"
          />
          Jetzt freigeben (Verfügbar)
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="radio"
            name={`activate-golive-${useCaseId}`}
            checked={goLive === "stage"}
            onChange={() => setGoLive("stage")}
            className="accent-primary"
          />
          Zur Freigabe vormerken (Bereit)
        </label>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={isPending || ownIncomplete}
          onClick={() =>
            activate({
              dataSource:
                mode === "own"
                  ? {
                      mode,
                      config: {
                        url: broker.url.trim(),
                        topic: broker.topic.trim(),
                        username: broker.username.trim() || undefined,
                        password: broker.password || undefined,
                      },
                    }
                  : { mode },
              goLive,
            })
          }
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {isPending ? "Wird aktiviert…" : "Aktivieren"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Abbrechen
        </Button>
      </div>
      {ownIncomplete ? (
        <p className="text-xs text-muted-foreground">Broker-URL und Topic werden benötigt.</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
