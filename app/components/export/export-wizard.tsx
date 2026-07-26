"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GitMerge, KeyRound, Package, ShieldCheck, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  INSTANCE_ARTIFACT_KIND_LABELS,
  resolveDependencies,
  type InstanceArtifact,
  type InstanceArtifactKind,
} from "@/lib/instance-inventory";

/**
 * Sharing something out of this instance: pick artifacts, describe the result,
 * see what the bundle would contain.
 *
 * Starting from the inventory rather than from an installation is the point —
 * what a municipality wants to share is usually something it modelled itself,
 * which no install record knows about.
 *
 * NOT FUNCTIONAL: no bundle is produced and nothing is submitted. The steps show
 * the intended flow and, in step 3, which instance-specific values would be
 * left behind.
 */

const KIND_ORDER: InstanceArtifactKind[] = ["dataset", "pipeline", "datasource", "datastructure"];

type Step = 1 | 2 | 3;

type CatalogDraft = {
  title: string;
  summary: string;
  categories: string;
  maintainer: string;
  contact: string;
  license: string;
};

const EMPTY_DRAFT: CatalogDraft = {
  title: "",
  summary: "",
  categories: "",
  maintainer: "",
  contact: "",
  license: "EUPL-1.2",
};

export function ExportWizard({
  inventory,
  preselectedIds = [],
}: {
  inventory: InstanceArtifact[];
  preselectedIds?: string[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>(preselectedIds);
  const [draft, setDraft] = useState<CatalogDraft>(EMPTY_DRAFT);

  const byId = useMemo(() => new Map(inventory.map((entry) => [entry.id, entry])), [inventory]);
  const { included, added } = useMemo(
    () => resolveDependencies(selected, inventory),
    [selected, inventory],
  );
  const includedArtifacts = included
    .map((id) => byId.get(id))
    .filter((entry): entry is InstanceArtifact => Boolean(entry));
  const secretCarriers = includedArtifacts.filter((entry) => entry.carriesSecrets);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {(["Artefakte wählen", "Beschreiben", "Vorschau"] as const).map((label, index) => {
          const value = (index + 1) as Step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  step === value
                    ? "bg-primary text-primary-foreground"
                    : step > value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > value ? <Check className="size-3.5" /> : value}
              </span>
              <span className={step === value ? "font-medium text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
              {index < 2 ? <ArrowRight className="size-3.5 text-muted-foreground" /> : null}
            </li>
          );
        })}
      </ol>

      {/* ── Step 1 · pick ─────────────────────────────────────────── */}
      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Wählen Sie, was geteilt werden soll. Abhängigkeiten ergänzt der Assistent selbst — ein
            Bündel ohne die referenzierte Datenstruktur wäre beim Empfänger unbrauchbar.
          </p>

          {KIND_ORDER.map((kind) => {
            const entries = inventory.filter((entry) => entry.kind === kind);
            if (entries.length === 0) return null;

            return (
              <fieldset key={kind} className="flex flex-col gap-2">
                <legend className="pb-1 text-sm font-semibold text-foreground">
                  {INSTANCE_ARTIFACT_KIND_LABELS[kind]}
                </legend>
                {entries.map((entry) => {
                  const isExplicit = selected.includes(entry.id);
                  const isImplicit = !isExplicit && included.includes(entry.id);

                  return (
                    <label
                      key={entry.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm ${
                        isImplicit ? "border-primary/40 bg-primary/5" : ""
                      } has-[:checked]:border-primary has-[:checked]:bg-primary/5`}
                    >
                      <input
                        type="checkbox"
                        checked={isExplicit}
                        onChange={() => toggle(entry.id)}
                        className="mt-0.5 accent-primary"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{entry.name}</span>
                          {entry.version ? (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {entry.version}
                            </Badge>
                          ) : null}
                          {entry.origin === "installed" ? (
                            <Badge variant="outline" className="text-[11px]">
                              aus dem Katalog installiert
                            </Badge>
                          ) : null}
                          {isImplicit ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <Wand2 className="size-3" />
                              automatisch ergänzt
                            </span>
                          ) : null}
                        </span>
                        {entry.description ? (
                          <span className="text-xs text-muted-foreground">{entry.description}</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setStep(2)} disabled={selected.length === 0}>
              Weiter
              <ArrowRight className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {included.length} Artefakte im Bündel
              {added.length > 0 ? ` (${added.length} automatisch ergänzt)` : ""}
            </span>
          </div>
        </div>
      ) : null}

      {/* ── Step 2 · describe ─────────────────────────────────────── */}
      {step === 2 ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Diese Angaben stehen später auf der Katalogseite. Sie entscheiden, ob eine andere
            Kommune den Anwendungsfall überhaupt findet und ihm traut.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              Titel *
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Radverkehrszählung Innenstadt"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              Kurzbeschreibung *
              <textarea
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                rows={2}
                placeholder="Was löst dieser Anwendungsfall — in einem Satz?"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Kategorien
              <input
                type="text"
                value={draft.categories}
                onChange={(event) => setDraft({ ...draft, categories: event.target.value })}
                placeholder="Mobilität, Radverkehr"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Lizenz
              <input
                type="text"
                value={draft.license}
                onChange={(event) => setDraft({ ...draft, license: event.target.value })}
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Pflegestelle *
              <input
                type="text"
                value={draft.maintainer}
                onChange={(event) => setDraft({ ...draft, maintainer: event.target.value })}
                placeholder="Stadt Musterstadt"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Kontakt *
              <input
                type="text"
                value={draft.contact}
                onChange={(event) => setDraft({ ...draft, contact: event.target.value })}
                placeholder="opendata@musterstadt.de"
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" />
              Zurück
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!draft.title.trim() || !draft.summary.trim() || !draft.maintainer.trim()}
            >
              Vorschau
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Step 3 · preview ──────────────────────────────────────── */}
      {step === 3 ? (
        <div className="flex flex-col gap-5">
          <section className="rounded-md border bg-card p-5">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                {draft.title || "Ohne Titel"}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{draft.summary}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Pflegestelle: <span className="font-medium text-foreground">{draft.maintainer}</span>
              {draft.license ? (
                <>
                  {" · Lizenz: "}
                  <span className="font-mono text-foreground">{draft.license}</span>
                </>
              ) : null}
            </p>

            <ul className="mt-4 flex flex-col gap-2">
              {includedArtifacts.map((artifact) => (
                <li
                  key={artifact.id}
                  className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"
                >
                  <Badge variant="outline" className="text-[11px]">
                    {INSTANCE_ARTIFACT_KIND_LABELS[artifact.kind]}
                  </Badge>
                  <span className="font-medium text-foreground">{artifact.name}</span>
                  {artifact.version ? (
                    <span className="font-mono text-muted-foreground">{artifact.version}</span>
                  ) : null}
                  {added.includes(artifact.id) ? (
                    <span className="text-primary">automatisch ergänzt</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border bg-emerald-500/5 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
              Was zurückbleibt
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              <li>Serverseitig vergebene IDs aller Artefakte — die Zielinstanz vergibt eigene.</li>
              <li>Projekt- und Instanzbezüge dieser Kommune.</li>
              {secretCarriers.length > 0 ? (
                <li className="text-foreground">
                  <KeyRound className="mr-1 inline size-3.5 text-amber-600 dark:text-amber-400" />
                  Zugangsdaten aus{" "}
                  <span className="font-medium">
                    {secretCarriers.map((entry) => entry.name).join(", ")}
                  </span>{" "}
                  — im Bündel wird daraus eine Frage an die installierende Kommune.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-md border border-dashed p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitMerge className="size-4" />
              Als Merge Request an den Community-Katalog einreichen
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Noch nicht funktionsfähig — es wird kein Bündel erzeugt und nichts eingereicht. Diese
              Seite zeigt den geplanten Ablauf.
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="size-4" />
              Zurück
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
