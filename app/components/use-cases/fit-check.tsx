import { Check, CircleAlert, CircleHelp, ServerCog } from "lucide-react";

import { checkFit, getInstanceProfile } from "@/lib/instance-profile";
import type { UseCase } from "@/types/use-cases";

/**
 * Does this use case fit *this* instance? Answered before the install rather
 * than discovered halfway through it. The ONE card for everything the
 * installation needs — the former separate "Benötigt" building-block card is
 * merged in here as checklist rows (add-ons/plugins as honest "unknown").
 *
 * PLACEHOLDER SOURCE: the instance profile is a constant
 * (`lib/instance-profile.ts`) and has to be read from the live backend instead.
 * The comparison itself is already the real logic and is unit-tested.
 */
export function FitCheck({ useCase }: { useCase: UseCase }) {
  const profile = getInstanceProfile();
  const result = checkFit(useCase, profile);
  const hasUnknown = result.rows.some((row) => row.status === "unknown");

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex items-center gap-2">
        <ServerCog className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Passt zu dieser Instanz?</h2>
      </div>

      <p
        className={`mt-3 flex items-center gap-2 text-sm font-medium ${
          result.fits ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
        }`}
      >
        {result.fits ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
        {result.fits
          ? `Passt zu ${profile.tenantName}`
          : "Diese Instanz erfüllt nicht alle Voraussetzungen"}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {result.rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2 text-xs">
            {row.status === "ok" ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : row.status === "unknown" ? (
              <CircleHelp className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="min-w-0">
              <span className="font-medium text-foreground">{row.label}</span>
              {row.detail ? (
                <span className="block text-muted-foreground">{row.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {!result.fits ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Fehlende Komponenten stellt der Betreiber der Instanz bereit — die Installation ist
          weiterhin möglich, einzelne Funktionen bleiben aber leer.
        </p>
      ) : null}

      {hasUnknown ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Punkte mit Fragezeichen lassen sich nicht automatisch prüfen — im Zweifel beim
          Betreiber der Instanz nachfragen.
        </p>
      ) : null}
    </section>
  );
}
