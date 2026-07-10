type IllustrationKind = "grid" | "bars" | "line" | "gauge";

// Generic, always-available header art derived from the use case's category —
// no per-entry image needed, never a broken image, and it themes with the green
// use-case accent. A catalog `image` field could later override this default.
function illustrationForCategory(categories: string[]): IllustrationKind {
  const haystack = categories.join(" ").toLowerCase();
  if (/(umwelt|klima|luft|wasser|regen)/.test(haystack)) return "line";
  if (/(energie|solar|strom|lade)/.test(haystack)) return "gauge";
  if (/(grün|baum|natur|abfall)/.test(haystack)) return "bars";
  // mobility, citizen services, and everything else → a map/grid motif.
  return "grid";
}

function IllustrationBody({ kind }: { kind: IllustrationKind }) {
  switch (kind) {
    case "bars":
      return (
        <g className="fill-emerald-600 dark:fill-emerald-500">
          <rect x="40" y="70" width="45" height="80" rx="4" />
          <rect x="110" y="45" width="45" height="105" rx="4" />
          <rect x="180" y="90" width="45" height="60" rx="4" />
          <rect x="250" y="30" width="45" height="120" rx="4" />
          <rect x="320" y="60" width="45" height="90" rx="4" />
        </g>
      );
    case "line":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline
            className="stroke-emerald-500/40"
            strokeWidth="6"
            strokeDasharray="4 10"
            points="20,120 90,105 160,115 230,80 300,95 380,65"
          />
          <polyline
            className="stroke-emerald-600 dark:stroke-emerald-500"
            strokeWidth="8"
            points="20,100 90,72 160,90 230,45 300,62 380,28"
          />
        </g>
      );
    case "gauge":
      return (
        <g fill="none" strokeLinecap="round">
          <path className="stroke-emerald-500/25" strokeWidth="22" d="M 90 132 A 110 110 0 0 1 310 132" />
          <path
            className="stroke-emerald-600 dark:stroke-emerald-500"
            strokeWidth="22"
            d="M 90 132 A 110 110 0 0 1 265 42"
          />
          <circle className="fill-emerald-600 dark:fill-emerald-500" cx="200" cy="132" r="10" />
        </g>
      );
    case "grid":
    default:
      return (
        <g>
          <g className="stroke-emerald-500/25" strokeWidth="12">
            <line x1="0" y1="52" x2="400" y2="52" />
            <line x1="0" y1="108" x2="400" y2="108" />
            <line x1="115" y1="0" x2="115" y2="150" />
            <line x1="255" y1="0" x2="255" y2="150" />
          </g>
          <circle className="fill-emerald-600 dark:fill-emerald-500" cx="115" cy="52" r="13" />
          <circle className="fill-emerald-600 dark:fill-emerald-500" cx="255" cy="108" r="13" />
          <circle className="fill-amber-500" cx="185" cy="80" r="13" />
        </g>
      );
  }
}

export function UseCaseIllustration({ categories }: { categories: string[] }) {
  const kind = illustrationForCategory(categories);
  return (
    <div className="h-32 w-full bg-emerald-500/10">
      <svg
        viewBox="0 0 400 150"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <IllustrationBody kind={kind} />
      </svg>
    </div>
  );
}
