import type { UseCase } from "@/types/use-cases";

/**
 * Mocked "describe your problem, get matching use cases" matching.
 *
 * PLACEHOLDER MATCHER: deliberately dumb — normalised keyword overlap against
 * title, summary, description and categories, with a generated reason sentence.
 * No model, no embeddings, no network. What the real assistant should be is
 * still open; keeping the matcher a pure function means the UI does not change
 * when it is replaced.
 */

export type AssistantMatch = {
  useCase: UseCase;
  score: number;
  /** Why this was proposed — shown to the user, never a bare score. */
  reason: string;
};

const STOP_WORDS = new Set([
  "der","die","das","und","oder","ist","sind","ein","eine","einen","einem","einer","für","fuer",
  "wir","ich","uns","unser","unsere","haben","hat","wie","was","wo","mit","von","vom","zu","zum",
  "zur","im","in","am","an","auf","bei","aus","dem","den","des","nicht","auch","noch","sehr",
  "brauchen","braucht","möchte","moechte","möchten","moechten","will","wollen","soll","sollen",
  "es","sich","nach","über","ueber","um","als","aber","dass","kann","können","koennen",
]);

function normalise(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

/** Crude German stem: strip common inflectional endings so "Parken" ≈ "Parkraum". */
function stem(token: string): string {
  return token.replace(/(ungen|ung|en|er|es|em|e|s)$/u, "");
}

export function matchUseCases(query: string, useCases: UseCase[], limit = 3): AssistantMatch[] {
  const queryTokens = normalise(query).map(stem).filter(Boolean);
  if (queryTokens.length === 0) return [];

  const matches: AssistantMatch[] = [];

  for (const useCase of useCases) {
    const haystack = [
      useCase.title,
      useCase.summary,
      useCase.description,
      ...useCase.categories,
    ].join(" ");
    const haystackTokens = new Set(normalise(haystack).map(stem));

    const hits = queryTokens.filter((token) =>
      [...haystackTokens].some((candidate) => candidate.startsWith(token) || token.startsWith(candidate)),
    );

    if (hits.length === 0) continue;

    const matchedCategories = useCase.categories.filter((category) =>
      queryTokens.some((token) => stem(category.toLowerCase()).startsWith(token)),
    );

    const reason = matchedCategories.length
      ? `Passt zu „${matchedCategories.join("“, „")}“ — und deckt ${useCase.includedArtifacts.length} Bausteine ab, die Sie sonst selbst modellieren müssten.`
      : `Deckt „${[...new Set(hits)].join("“, „")}“ ab — inklusive Datenstruktur und Pipeline.`;

    matches.push({ useCase, score: new Set(hits).size, reason });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
