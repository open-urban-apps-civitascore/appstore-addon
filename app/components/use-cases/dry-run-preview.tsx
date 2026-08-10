"use client";

import {
  Braces,
  CircleCheck,
  Database,
  FileSearch,
  type LucideIcon,
  Package,
  Radio,
  ShieldCheck,
  UsersRound,
  Workflow,
} from "lucide-react";

import { targetStatusLabel, type DryRunEntry, type DryRunPlan } from "@/lib/dry-run";

/**
 * The dry-run preview, shown between configuring an install and confirming it:
 * exactly what would be created, what was answered, and what is *not* touched.
 *
 * Grouped by kind rather than listed flat (Ewa, 2026-08-10): a commune reads
 * "1 Datensatz, 2 Datenstrukturen, 1 Datenquelle" as a plan, where a mixed
 * stack of six rows just reads as a lot.
 *
 * The point of the panel is the last part. "Nothing else is changed" is the
 * sentence that lets a data protection officer sign off — a readable list
 * instead of foreign software.
 */

/**
 * Display groups, in install order. Keyed by the `kind` strings the planner
 * emits (platform vocabulary); the headings are the plain-German equivalents.
 */
const GROUPS: { kinds: string[]; one: string; many: string; icon: LucideIcon }[] = [
  { kinds: ["Dataset"], one: "Datensatz", many: "Datensätze", icon: Database },
  { kinds: ["Datastructure"], one: "Datenstruktur", many: "Datenstrukturen", icon: Braces },
  { kinds: ["Data Source"], one: "Datenquelle", many: "Datenquellen", icon: Radio },
  { kinds: ["Pipeline"], one: "Pipeline", many: "Pipelines", icon: Workflow },
  { kinds: ["Rolle"], one: "Rolle", many: "Rollen", icon: UsersRound },
];

type Group = { title: string; icon: LucideIcon; entries: DryRunEntry[] };

function groupEntries(creates: DryRunEntry[]): Group[] {
  const groups: Group[] = [];

  for (const definition of GROUPS) {
    const entries = creates.filter((entry) => definition.kinds.includes(entry.kind));
    if (entries.length > 0) {
      groups.push({
        title: entries.length === 1 ? definition.one : definition.many,
        icon: definition.icon,
        entries,
      });
    }
  }

  // Anything the planner emits that has no group yet still has to appear —
  // silently dropping a created artifact would defeat the whole panel.
  const known = new Set(GROUPS.flatMap((definition) => definition.kinds));
  const rest = creates.filter((entry) => !known.has(entry.kind));
  if (rest.length > 0) {
    groups.push({ title: "Weitere Elemente", icon: Package, entries: rest });
  }

  return groups;
}

export function DryRunPreview({ plan }: { plan: DryRunPlan }) {
  const groups = groupEntries(plan.creates);

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Vorschau — das würde angelegt</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {plan.creates.length} {plan.creates.length === 1 ? "Element" : "Elemente"}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.title}>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon aria-hidden className="size-3.5" />
                {group.title}
                <span className="font-normal">({group.entries.length})</span>
              </p>
              <ul className="mt-1.5 divide-y rounded-md border">
                {group.entries.map((entry, index) => (
                  <li key={`${entry.kind}-${entry.label}-${index}`} className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    {entry.detail ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {entry.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CircleCheck className="size-3.5 shrink-0" />
        Zielzustand: <span className="font-medium text-foreground">{targetStatusLabel(plan.targetStatus)}</span>
      </p>

      {plan.answers.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">Ihre Angaben</p>
          <dl className="mt-1.5 flex flex-col gap-1.5">
            {plan.answers.map((entry) => (
              <div key={entry.question} className="text-xs">
                <dt className="text-muted-foreground">{entry.question}</dt>
                <dd className="font-medium text-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="rounded-md bg-emerald-500/5 p-3">
        <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-400">
          <ShieldCheck className="size-3.5 shrink-0" />
          Was unberührt bleibt
        </p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
          {plan.untouched.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
