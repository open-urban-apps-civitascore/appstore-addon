import { PlayCircle, Trash2, Zap } from "lucide-react";

import type { DemoData } from "@/types/use-cases";

/**
 * The demo-data pitch — the feature that makes trying cheap: the use case runs
 * with bundled sample data before the commune owns a single sensor. Given
 * prominent treatment on the detail page (Ewa, 2026-08-07) because it is what
 * turns "interesting" into "let's just try it".
 *
 * Only rendered for listings that actually declare demo data — a store that
 * promises sample data and then shows an empty dataset burns exactly the trust
 * the catalog is built on.
 */
export function DemoDataHighlight({ demoData }: { demoData: DemoData }) {
  return (
    <section className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
          <PlayCircle aria-hidden className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
            Ohne eigene Daten ausprobieren
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
            Dieser Anwendungsfall bringt Beispieldaten mit. Sie installieren ihn, sehen sofort
            das fertige Ergebnis mit Daten darin — und entscheiden erst danach, ob Sie eigene
            Sensoren anbinden.
            {demoData.contains ? (
              <>
                {" "}
                Enthalten: <span className="font-medium">{demoData.contains}</span>.
              </>
            ) : null}
          </p>
          {demoData.note ? (
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-200/80">
              {demoData.note}
            </p>
          ) : null}

          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            <Point icon={Zap} label="Keine Sensoren nötig" />
            <Point icon={PlayCircle} label="In Minuten startklar" />
            <Point icon={Trash2} label="Rückstandsfrei entfernbar" />
          </ul>
        </div>
      </div>
    </section>
  );
}

function Point({
  icon: Icon,
  label,
}: {
  icon: typeof PlayCircle;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md bg-emerald-100/70 px-3 py-2 text-xs font-medium text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </li>
  );
}

/** Compact catalog-card marker for the same feature. */
export function DemoDataBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      <PlayCircle aria-hidden className="size-3" />
      Demo-Daten
    </span>
  );
}
