"use client";

import { useState } from "react";
import { Check, CircleAlert, CircleSlash, MessageSquare, UserCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BADGE_LEVEL_HINTS,
  BADGE_LEVEL_LABELS,
  type BadgeLevel,
  type CurationEvaluation,
  type EvaluatedCheck,
} from "@/lib/curation";

/**
 * The curator's review of a submission: run through the checklist, pick a badge
 * level, decide.
 *
 * Machine-checked results are shown as findings the curator can read, not as a
 * gate that decides on its own — the badge is a human judgement, and a green
 * pipeline is not curation.
 *
 * NOT FUNCTIONAL: no decision is recorded and nothing is merged.
 */

const OUTCOME_STYLES: Record<EvaluatedCheck["outcome"], { icon: typeof Check; className: string }> = {
  pass: { icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
  fail: { icon: X, className: "text-destructive" },
  warn: { icon: CircleAlert, className: "text-amber-600 dark:text-amber-400" },
  manual: { icon: UserCheck, className: "text-muted-foreground" },
};

export function CurationReview({ evaluation }: { evaluation: CurationEvaluation }) {
  const [manualChecked, setManualChecked] = useState<Record<string, boolean>>({});
  const [badge, setBadge] = useState<BadgeLevel>("community");
  const [note, setNote] = useState("");

  const manualDone = evaluation.openManualChecks.every((check) => manualChecked[check.id]);
  const canApprove = evaluation.readyForDecision && manualDone;

  const automatic = evaluation.checks.filter((check) => check.automatic);
  const manual = evaluation.checks.filter((check) => !check.automatic);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Automatisch geprüft</h2>
          <span className="text-xs text-muted-foreground">
            {evaluation.blockers.length > 0
              ? `${evaluation.blockers.length} blockierend`
              : "nichts blockiert"}
            {evaluation.warnings.length > 0 ? ` · ${evaluation.warnings.length} zum Ansehen` : ""}
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {automatic.map((check) => {
            const { icon: Icon, className } = OUTCOME_STYLES[check.outcome];
            return (
              <li key={check.id} className="flex items-start gap-2.5 rounded-md bg-muted/50 px-3 py-2">
                <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{check.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {check.detail ?? check.hint}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Nur eine Person kann das beurteilen</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Diese Punkte lassen sich nicht automatisieren — sie sind der Grund, warum kuratiert wird.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {manual.map((check) => (
            <li key={check.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="checkbox"
                  checked={manualChecked[check.id] ?? false}
                  onChange={() =>
                    setManualChecked({ ...manualChecked, [check.id]: !manualChecked[check.id] })
                  }
                  className="mt-0.5 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{check.label}</span>
                  <span className="block text-xs text-muted-foreground">{check.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Einstufung</h2>
        <div className="mt-3 flex flex-col gap-2">
          {(Object.keys(BADGE_LEVEL_LABELS) as BadgeLevel[]).map((level) => (
            <label
              key={level}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="badge"
                checked={badge === level}
                onChange={() => setBadge(level)}
                className="mt-0.5 accent-primary"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {BADGE_LEVEL_LABELS[level]}
                </span>
                <span className="text-xs text-muted-foreground">{BADGE_LEVEL_HINTS[level]}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            Rückmeldung an die einreichende Stelle
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Was fehlt, was ist gut, was sollte vor der Aufnahme geändert werden?"
            className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!canApprove}>
          <Check className="size-4" />
          Aufnehmen als „{BADGE_LEVEL_LABELS[badge]}"
        </Button>
        <Button variant="outline">
          <CircleSlash className="size-4" />
          Änderungen erbitten
        </Button>
      </div>

      {!canApprove ? (
        <p className="text-xs text-muted-foreground">
          {evaluation.blockers.length > 0
            ? "Aufnahme nicht möglich, solange automatische Prüfungen fehlschlagen."
            : "Bitte zuerst die manuellen Punkte bestätigen."}
        </p>
      ) : null}

      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Attrappe — es wird nichts gespeichert, nichts gemergt und keine Rückmeldung verschickt.
      </p>

      <div className="flex flex-wrap gap-2">
        {evaluation.blockers.map((check) => (
          <Badge key={check.id} variant="outline" className="text-[11px] text-destructive">
            blockiert: {check.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
