/**
 * After installing with demo data the user should not face an empty shell — the
 * working thing belongs on screen, with data in it. That is the difference
 * between "installed" and "useful".
 *
 * PLACEHOLDER DATA — and it says so on screen. The series below is a fixed,
 * hand-written week; nothing is read from the installed dataset. Making it real
 * needs two things that do not exist yet: a producer publishing to the demo
 * broker, and a dashboard declared by the bundle. Until then the panel is
 * labelled "Beispielansicht" and never presented as live data.
 */

type DaySeries = { day: string; values: number[] };

/** One week of plausible traffic counts, deliberately constant (no randomness). */
const WEEK: DaySeries[] = [
  { day: "Mo", values: [12, 34, 78, 142, 96, 61] },
  { day: "Di", values: [14, 31, 84, 151, 102, 58] },
  { day: "Mi", values: [11, 36, 81, 147, 99, 64] },
  { day: "Do", values: [15, 38, 88, 156, 108, 71] },
  { day: "Fr", values: [18, 42, 95, 168, 131, 89] },
  { day: "Sa", values: [22, 29, 61, 88, 94, 76] },
  { day: "So", values: [16, 19, 44, 63, 71, 58] },
];

const HOURS = ["04", "07", "10", "13", "16", "19"];

const CHART_WIDTH = 700;
const CHART_HEIGHT = 180;
const PADDING_LEFT = 34;
const PADDING_BOTTOM = 22;

export function DemoDataPreview({
  title = "Verkehrsaufkommen je Zählstelle",
  unit = "Fahrzeuge/Stunde",
}: {
  title?: string;
  unit?: string;
}) {
  const allValues = WEEK.flatMap((entry) => entry.values);
  const max = Math.max(...allValues);
  const total = allValues.reduce((sum, value) => sum + value, 0);
  const peak = WEEK.reduce((best, entry) =>
    Math.max(...entry.values) > Math.max(...best.values) ? entry : best,
  );

  const plotWidth = CHART_WIDTH - PADDING_LEFT;
  const plotHeight = CHART_HEIGHT - PADDING_BOTTOM;
  const groupWidth = plotWidth / WEEK.length;
  const barWidth = (groupWidth - 8) / HOURS.length;

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Eine Woche · {unit} · {total.toLocaleString("de-DE")} Fahrzeuge gesamt
          </p>
        </div>
        <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          Beispielansicht
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-44 w-full min-w-[520px]"
          role="img"
          aria-label={`Balkendiagramm: ${title}, eine Woche, Spitzenwert ${max} ${unit} am ${peak.day}.`}
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = plotHeight - fraction * plotHeight;
            return (
              <g key={fraction}>
                <line
                  x1={PADDING_LEFT}
                  x2={CHART_WIDTH}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={PADDING_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {Math.round(fraction * max)}
                </text>
              </g>
            );
          })}

          {WEEK.map((entry, dayIndex) => (
            <g key={entry.day} transform={`translate(${PADDING_LEFT + dayIndex * groupWidth}, 0)`}>
              {entry.values.map((value, hourIndex) => {
                const height = (value / max) * plotHeight;
                return (
                  <rect
                    key={HOURS[hourIndex]}
                    x={4 + hourIndex * barWidth}
                    y={plotHeight - height}
                    width={Math.max(barWidth - 2, 1)}
                    height={height}
                    rx={1.5}
                    className="fill-primary/70"
                  >
                    <title>
                      {entry.day} {HOURS[hourIndex]}:00 — {value} {unit}
                    </title>
                  </rect>
                );
              })}
              <text
                x={groupWidth / 2}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {entry.day}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Spitzenlast am {peak.day} um {HOURS[peak.values.indexOf(Math.max(...peak.values))]}:00 mit{" "}
        {Math.max(...peak.values)} {unit}.{" "}
        <span className="text-foreground">
          Diese Ansicht zeigt den geplanten Zustand — echte Demo-Daten liefert der Datenerzeuger,
          der noch entsteht.
        </span>
      </p>
    </section>
  );
}
