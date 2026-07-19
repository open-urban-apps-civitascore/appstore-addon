"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { InstallOptions } from "@/types/install-options";

/**
 * The pre-install fork (D10), shown before anything is provisioned:
 *
 *   - Datenquelle: demo preset · own MQTT broker (prompts for the connection)
 *     · configure later (→ the install stops at a DRAFT shell)
 *   - Freigabe: release now (→ AVAILABLE) · stage for review (→ READY)
 *   - plus the bundle's own installQuestions as free-text inputs
 *
 * The primary button expands into the chooser; submitting POSTs the options to
 * the install route. Broker credentials are sent only to the backend — they are
 * never persisted in the install record or shown again (D3).
 */

type DataSourceMode = "demo" | "own" | "later";
type GoLive = "release" | "stage";

const DATA_SOURCE_CHOICES: { value: DataSourceMode; label: string; hint: string }[] = [
  {
    value: "demo",
    label: "Demo-Datenquelle",
    hint: "Vorkonfigurierte MQTT-Quelle — ideal zum Ausprobieren, keine Eingaben nötig.",
  },
  {
    value: "own",
    label: "Eigener MQTT-Broker",
    hint: "Verbindet den Anwendungsfall mit Ihrer eigenen Infrastruktur.",
  },
  {
    value: "later",
    label: "Später konfigurieren",
    hint: "Installiert als Entwurf — die Datenquelle wird bei der Aktivierung eingerichtet.",
  },
];

const GO_LIVE_CHOICES: { value: GoLive; label: string; hint: string }[] = [
  {
    value: "release",
    label: "Jetzt freigeben",
    hint: "Die Infrastruktur wird sofort provisioniert (Status: Verfügbar).",
  },
  {
    value: "stage",
    label: "Zur Freigabe vormerken",
    hint: "Bereitgestellt und validiert, wartet auf Freigabe (Status: Bereit).",
  },
];

export function InstallUseCaseButton({
  useCaseId,
  installQuestions = [],
}: {
  useCaseId: string;
  installQuestions?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<DataSourceMode>("demo");
  const [goLive, setGoLive] = useState<GoLive>("release");
  const [broker, setBroker] = useState({ url: "", topic: "", username: "", password: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ownIncomplete = mode === "own" && (!broker.url.trim() || !broker.topic.trim());

  async function handleInstall() {
    setIsPending(true);
    setError(null);

    const options: InstallOptions = {
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
      // "Später konfigurieren" stops at DRAFT anyway — the go-live axis only
      // applies once a data source exists (post-install activation).
      goLive: mode === "later" ? "release" : goLive,
      answers,
    };

    try {
      const response = await fetch(`/api/use-cases/${useCaseId}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Die Installation konnte nicht gestartet werden.");
      }

      router.push("/installed");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Die Installation konnte nicht gestartet werden.",
      );
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        Im Portal-Backend bereitstellen
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 rounded-lg border bg-card p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1 text-sm font-semibold text-foreground">Datenquelle</legend>
        {DATA_SOURCE_CHOICES.map((choice) => (
          <label
            key={choice.value}
            className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="dataSource"
              value={choice.value}
              checked={mode === choice.value}
              onChange={() => setMode(choice.value)}
              className="mt-0.5 accent-primary"
            />
            <span className="flex flex-col">
              <span className="font-medium text-foreground">{choice.label}</span>
              <span className="text-xs text-muted-foreground">{choice.hint}</span>
            </span>
          </label>
        ))}

        {mode === "own" ? (
          <div className="ml-6 mt-1 grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Broker-URL *
              <input
                type="text"
                value={broker.url}
                onChange={(event) => setBroker({ ...broker, url: event.target.value })}
                placeholder="tcp://broker.example:1883"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Topic *
              <input
                type="text"
                value={broker.topic}
                onChange={(event) => setBroker({ ...broker, topic: event.target.value })}
                placeholder="stadt/sensoren/verkehr"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Benutzername (optional)
              <input
                type="text"
                value={broker.username}
                onChange={(event) => setBroker({ ...broker, username: event.target.value })}
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Passwort (optional)
              <input
                type="password"
                value={broker.password}
                onChange={(event) => setBroker({ ...broker, password: event.target.value })}
                autoComplete="new-password"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Zugangsdaten werden nur an das Portal-Backend übermittelt und nicht im Marketplace
              gespeichert.
            </p>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2" disabled={mode === "later"}>
        <legend className="pb-1 text-sm font-semibold text-foreground">Freigabe</legend>
        {mode === "later" ? (
          <p className="text-xs text-muted-foreground">
            Entfällt — die Installation landet als Entwurf und wird bei der Aktivierung freigegeben.
          </p>
        ) : (
          GO_LIVE_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="goLive"
                value={choice.value}
                checked={goLive === choice.value}
                onChange={() => setGoLive(choice.value)}
                className="mt-0.5 accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium text-foreground">{choice.label}</span>
                <span className="text-xs text-muted-foreground">{choice.hint}</span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      {installQuestions.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-semibold text-foreground">
            Fragen zu diesem Anwendungsfall
          </legend>
          {installQuestions.map((question) => (
            <label key={question} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {question}
              <input
                type="text"
                value={answers[question] ?? ""}
                onChange={(event) => setAnswers({ ...answers, [question]: event.target.value })}
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={handleInstall} disabled={isPending || ownIncomplete}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {isPending ? "Wird bereitgestellt…" : "Bereitstellen"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Abbrechen
        </Button>
      </div>
      {ownIncomplete ? (
        <p className="text-xs text-muted-foreground">Broker-URL und Topic werden benötigt.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
