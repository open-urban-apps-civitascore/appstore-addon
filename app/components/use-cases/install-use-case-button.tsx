"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  LoaderCircle,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DryRunPreview } from "@/components/use-cases/dry-run-preview";
import { buildDryRunPlan } from "@/lib/dry-run";
import { cn } from "@/lib/utils";
import type { InstallOptions } from "@/types/install-options";
import type { UseCase } from "@/types/use-cases";

/**
 * The pre-install wizard as a modal — one decision per view, a visible step
 * indicator, defaults so the fast path is "weiter, weiter, installieren"
 * (design session 2026-08-07; wizard guidance from the UX research note):
 *
 *   Datenquelle → Freigabe → Prüfen (dry run)
 *
 * "Freigabe" disappears for "Später konfigurieren" (the install stops at a
 * DRAFT shell). An "Experimentell" entry shows one acknowledge view before the
 * wizard (friction ∝ trust, D11). Install questions and role assignment were
 * dropped from the flow (Ewa, 2026-08-07) — the catalog fields still parse,
 * the wizard just no longer asks.
 *
 * Entered values survive closing the modal — reopening resumes where the user
 * left off. Broker credentials are sent only to the backend — never persisted
 * in the install record or shown again (D3).
 */

type DataSourceMode = "demo" | "own" | "later";
type GoLive = "release" | "stage";

const DATA_SOURCE_CHOICES: {
  value: DataSourceMode;
  label: string;
  hint: string;
  /** The recommended path: try the use case before touching own infrastructure. */
  featured?: boolean;
}[] = [
    {
      value: "demo",
      label: "Mit Demo-Daten starten",
      hint: "Der Anwendungsfall läuft sofort mit mitgelieferten Beispieldaten — ohne eigene Sensoren, ohne Konfiguration. Ideal, um zu sehen, ob er zu Ihrer Kommune passt.",
      featured: true,
    },
    {
      value: "own",
      label: "Eigene Datenquelle anbinden",
      hint: "Verbindet den Anwendungsfall direkt mit Ihrem MQTT-Broker.",
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

type StepId = "source" | "golive" | "review";

const STEP_LABELS: Record<StepId, string> = {
  source: "Datenquelle",
  golive: "Freigabe",
  review: "Prüfen",
};

const STEP_HINTS: Record<StepId, string> = {
  source: "Woher kommen die Daten? Zum Ausprobieren brauchen Sie noch keine eigenen.",
  golive: "Wann soll der Anwendungsfall live gehen?",
  review: "Alles auf einen Blick — erst nach Ihrer Bestätigung wird etwas angelegt.",
};

export function InstallUseCaseButton({ useCase }: { useCase: UseCase }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Friction proportional to trust: an "Experimentell" entry asks for one
  // plain-language acknowledgement before the wizard starts. Curated tiers
  // install without a warning — the absence of it is the trust signal.
  const [acknowledged, setAcknowledged] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<DataSourceMode>("demo");
  const [goLive, setGoLive] = useState<GoLive>("release");
  const [broker, setBroker] = useState({ url: "", topic: "", username: "", password: "" });

  // "Später konfigurieren" stops at DRAFT — the Freigabe axis only applies
  // once a data source exists, so its step disappears from the wizard.
  const steps: StepId[] = [
    "source",
    ...(mode !== "later" ? (["golive"] as StepId[]) : []),
    "review",
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;

  const ownIncomplete = mode === "own" && (!broker.url.trim() || !broker.topic.trim());
  const needsAcknowledgement = useCase.curationTier === "experimental" && !acknowledged;

  function currentOptions(): InstallOptions {
    return {
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
      goLive: mode === "later" ? "release" : goLive,
      answers: {},
      roleAssignments: {},
    };
  }

  async function handleInstall() {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/use-cases/${useCase.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentOptions()),
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

  function close() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        Installieren
      </Button>

      <Modal open={open} onClose={close} labelledBy="install-wizard-title">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <h2 id="install-wizard-title" className="text-lg font-semibold text-foreground">
            „{useCase.title}“ installieren
          </h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={close}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {needsAcknowledgement ? (
          <>
            <div
              role="alertdialog"
              aria-labelledby="experimental-ack-title"
              className="flex flex-col gap-3 overflow-y-auto p-5"
            >
              <div className="flex items-center gap-2">
                <FlaskConical aria-hidden className="size-4 text-amber-800 dark:text-amber-300" />
                <p
                  id="experimental-ack-title"
                  className="text-sm font-semibold text-amber-900 dark:text-amber-200"
                >
                  Als „Experimentell“ eingestuft
                </p>
              </div>
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                Dieser Eintrag wurde noch nicht von der Kuratierung geprüft. Ausprobieren ist
                gefahrlos — die Installation lässt sich rückstandsfrei entfernen. Für den
                Produktivbetrieb wird ein geprüfter Eintrag empfohlen.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={close}>
                Abbrechen
              </Button>
              <Button onClick={() => setAcknowledged(true)}>Verstanden, weiter</Button>
            </div>
          </>
        ) : (
          <>
            {/* Step indicator */}
            <ol aria-label="Schritte" className="flex flex-wrap items-center gap-1.5 px-5 pt-4">
              {steps.map((id, position) => (
                <li
                  key={id}
                  aria-current={position === stepIndex ? "step" : undefined}
                  className="flex items-center gap-1.5"
                >
                  {position > 0 ? <span aria-hidden className="h-px w-4 bg-border" /> : null}
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-xs font-semibold",
                      position === stepIndex
                        ? "bg-primary text-primary-foreground"
                        : position < stepIndex
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {position + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      position === stepIndex ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STEP_LABELS[id]}
                  </span>
                </li>
              ))}
            </ol>

            {/* Step body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <p className="text-sm text-muted-foreground">{STEP_HINTS[step]}</p>

              {step === "source" ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Datenquelle</legend>
                  {DATA_SOURCE_CHOICES.map((choice) => (
                    <label
                      key={choice.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm",
                        choice.featured
                          ? "border-emerald-300 bg-emerald-50/60 p-3 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:has-[:checked]:border-emerald-600"
                          : "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
                      )}
                    >
                      <input
                        type="radio"
                        name="dataSource"
                        value={choice.value}
                        checked={mode === choice.value}
                        onChange={() => setMode(choice.value)}
                        className={cn("mt-0.5", choice.featured ? "accent-emerald-600" : "accent-primary")}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{choice.label}</span>
                          {choice.featured ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                              <PlayCircle aria-hidden className="size-3" />
                              Empfohlen zum Ausprobieren
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            choice.featured
                              ? "leading-relaxed text-emerald-900/80 dark:text-emerald-200/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {choice.hint}
                        </span>
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
                          onChange={(event) =>
                            setBroker({ ...broker, username: event.target.value })
                          }
                          className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Passwort (optional)
                        <input
                          type="password"
                          value={broker.password}
                          onChange={(event) =>
                            setBroker({ ...broker, password: event.target.value })
                          }
                          autoComplete="new-password"
                          className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
                        />
                      </label>
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        Zugangsdaten werden nur an das Portal-Backend übermittelt und nicht im
                        Marketplace gespeichert.
                      </p>
                    </div>
                  ) : null}
                </fieldset>
              ) : null}

              {step === "golive" ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Freigabe</legend>
                  {GO_LIVE_CHOICES.map((choice) => (
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
                  ))}
                </fieldset>
              ) : null}

              {step === "review" ? (
                <div className="flex flex-col gap-3">
                  <DryRunPreview plan={buildDryRunPlan(useCase, currentOptions())} />
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>
              ) : null}

              {step === "source" && ownIncomplete ? (
                <p className="text-xs text-muted-foreground">
                  Broker-URL und Topic werden benötigt.
                </p>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4">
              <Button variant="ghost" onClick={close} disabled={isPending}>
                Abbrechen
              </Button>
              <div className="flex gap-2">
                {stepIndex > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => setStepIndex(stepIndex - 1)}
                    disabled={isPending}
                  >
                    <ArrowLeft className="size-4" />
                    Zurück
                  </Button>
                ) : null}
                {isLastStep ? (
                  <Button onClick={handleInstall} disabled={isPending}>
                    {isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {isPending ? "Wird installiert…" : "Jetzt installieren"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setStepIndex(stepIndex + 1)}
                    disabled={step === "source" && ownIncomplete}
                  >
                    Weiter
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
