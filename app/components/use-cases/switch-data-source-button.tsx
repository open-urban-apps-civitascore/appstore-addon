"use client";

import { useState } from "react";
import { ArrowRight, Cable, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Moving an installation from the demo source to the municipality's own one —
 * without reinstalling.
 *
 * This is what turns a trial into production. Reinstalling instead would throw
 * away everything configured around it (roles, released state, the dataset id
 * other systems already point at), which is why it has to be a swap.
 *
 * NOT FUNCTIONAL: nothing is applied. Updating a released dataset's data source
 * needs backend support that does not exist yet; the panel shows what would
 * change and states plainly that it is not carried out.
 */
export function SwitchDataSourceButton({ datasetName }: { datasetName: string }) {
  const [open, setOpen] = useState(false);
  const [broker, setBroker] = useState({ url: "", topic: "", username: "", password: "" });

  const incomplete = !broker.url.trim() || !broker.topic.trim();

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Cable className="size-4" />
        Auf eigene Datenquelle umstellen
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-md border bg-background p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Auf eigene Datenquelle umstellen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Der Anwendungsfall bleibt bestehen — nur die Datenquelle wird ausgetauscht. Freigabestatus,
          Rollen und die Adresse der Daten-API ändern sich nicht.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
          Demo-Datenquelle
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary">
          {broker.url.trim() || "Ihr MQTT-Broker"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Broker-URL *
          <input
            type="text"
            value={broker.url}
            onChange={(event) => setBroker({ ...broker, url: event.target.value })}
            placeholder="tcp://broker.musterstadt.de:1883"
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
      </div>

      <div className="rounded-md bg-emerald-500/5 p-3">
        <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-400">
          <CircleCheck className="size-3.5 shrink-0" />
          Was gleich bleibt
        </p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
          <li>
            Datensatz <span className="font-medium text-foreground">{datasetName}</span> samt
            Freigabestatus und Daten-API-Adresse.
          </li>
          <li>Datenstrukturen, Pipeline und zugewiesene Rollen.</li>
          <li>Bereits erfasste Demo-Messwerte bleiben erhalten und werden gekennzeichnet.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled>
          <Cable className="size-4" />
          Umstellen
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {incomplete
          ? "Broker-URL und Topic werden benötigt."
          : "Attrappe — die Umstellung wird nicht ausgeführt; dafür fehlt die Unterstützung im Backend."}
      </p>
    </div>
  );
}
