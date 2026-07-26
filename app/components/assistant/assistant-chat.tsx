"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { matchUseCases, type AssistantMatch } from "@/lib/assistant-match";
import { USE_CASE_MATURITY_LABELS, type UseCase } from "@/types/use-cases";

/**
 * Describe the problem in plain words instead of having to know the catalog's
 * vocabulary.
 *
 * PLACEHOLDER: matching is local keyword overlap (`lib/assistant-match.ts`) —
 * no model, no network. The page states this plainly on screen; an assistant
 * that quietly pretends to be smarter than it is would mislead the user.
 */

const EXAMPLE_PROMPTS = [
  "Das Parken rund um den Bahnhof ist chaotisch.",
  "Wir wollen wissen, wie der Verkehr am Bahnhof fließt.",
  "Die Luftqualität in der Innenstadt soll gemessen werden.",
  "Unser Baumbestand ist nur in einer Excel-Tabelle erfasst.",
];

type Exchange = { question: string; matches: AssistantMatch[] };

export function AssistantChat({ useCases }: { useCases: UseCase[] }) {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setExchanges((current) => [...current, { question: trimmed, matches: matchUseCases(trimmed, useCases) }]);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-5">
      {exchanges.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-6">
          <p className="text-sm text-muted-foreground">Zum Ausprobieren, zum Beispiel:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => ask(prompt)}
                className="rounded-full border px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {exchanges.map((exchange, index) => (
        <div key={`${exchange.question}-${index}`} className="flex flex-col gap-3">
          <p className="ml-auto max-w-lg rounded-2xl rounded-br-sm bg-primary/10 px-4 py-2.5 text-sm text-foreground">
            {exchange.question}
          </p>

          <div className="flex items-start gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              {exchange.matches.length > 0 ? (
                <>
                  <p className="text-sm text-foreground">
                    {exchange.matches.length === 1
                      ? "Dazu gibt es einen passenden Anwendungsfall im Katalog:"
                      : `Dazu gibt es ${exchange.matches.length} passende Anwendungsfälle im Katalog:`}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {exchange.matches.map((match) => (
                      <li key={match.useCase.id}>
                        <Link
                          href={`/marketplace/use-cases/${match.useCase.id}`}
                          className="flex flex-col gap-1.5 rounded-md border bg-card p-4 transition-colors hover:border-primary"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {match.useCase.title}
                            </span>
                            <Badge variant="outline" className="text-[11px]">
                              {USE_CASE_MATURITY_LABELS[match.useCase.maturity]}
                            </Badge>
                            <span className="ml-auto inline-flex items-center gap-1 text-xs text-primary">
                              Ansehen <ArrowRight className="size-3" />
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {match.useCase.summary}
                          </span>
                          <span className="text-xs font-medium text-foreground">{match.reason}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Dazu finde ich im Katalog nichts Passendes. Vielleicht ist das ein Anwendungsfall,
                  den Ihre Kommune selbst baut — und danach hier veröffentlicht.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 rounded-md border bg-card p-2"
      >
        <MessageSquare className="ml-1.5 size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Beschreiben Sie Ihr Problem in eigenen Worten…"
          className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" disabled={!input.trim()}>
          <Send className="size-4" />
          Fragen
        </Button>
      </form>
    </div>
  );
}
