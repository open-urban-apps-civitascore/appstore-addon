"use client";

import { CircleCheck, FileSearch, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { targetStatusLabel, type DryRunPlan } from "@/lib/dry-run";

/**
 * The dry-run preview, shown between configuring an install and confirming it:
 * exactly what would be created, what was answered, and what is *not* touched.
 *
 * The point of the panel is the last part. "Nothing else is changed" is the
 * sentence that lets a data protection officer sign off — a readable list
 * instead of foreign software.
 */
export function DryRunPreview({ plan }: { plan: DryRunPlan }) {
  return (
    <div className="flex flex-col gap-4 rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <FileSearch className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Vorschau — das würde angelegt</p>
      </div>

      <ul className="flex flex-col gap-2">
        {plan.creates.map((entry, index) => (
          <li
            key={`${entry.kind}-${entry.label}-${index}`}
            className="flex items-start gap-2.5 rounded-md bg-muted/50 px-3 py-2"
          >
            <Badge variant="outline" className="mt-0.5 shrink-0 text-[11px]">
              {entry.kind}
            </Badge>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{entry.label}</span>
              {entry.detail ? (
                <span className="block text-xs text-muted-foreground">{entry.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

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
