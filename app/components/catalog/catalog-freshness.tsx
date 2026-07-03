import { AlertTriangle, RefreshCw } from "lucide-react";

import { getRepoListMeta } from "@/lib/server/repo-list";

const formatWhen = (value: Date): string =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(value);

/**
 * A small line telling the operator where the catalog came from and how fresh it
 * is — the visible proof of the repo-list model (and of last-known-good when the
 * source is down). Server component; reuses the module-cached index (no extra fetch).
 */
export async function CatalogFreshness() {
  const meta = await getRepoListMeta();

  if (meta.origin === "unconfigured") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
        <AlertTriangle className="size-3.5" />
        Repo-List nicht konfiguriert (REPO_LIST_URL)
      </p>
    );
  }

  if (meta.origin === "unreachable") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
        <AlertTriangle className="size-3.5" />
        Repo-List nicht erreichbar
      </p>
    );
  }

  // origin === "remote"
  if (meta.stale) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
        <AlertTriangle className="size-3.5" />
        Repo-List nicht erreichbar – letzter Stand: {formatWhen(meta.fetchedAt)} · v{meta.version}
      </p>
    );
  }

  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className="size-3.5" />
      Katalog aktualisiert: {formatWhen(meta.fetchedAt)} · v{meta.version}
    </p>
  );
}
