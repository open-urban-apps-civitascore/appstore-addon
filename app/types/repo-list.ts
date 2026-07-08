import { z } from "zod";

import { addonCatalogSchema } from "./addons";
import { useCaseCatalogSchema } from "./use-cases";

/**
 * The repo-list index: one git-hosted `index.json` with two sections and one
 * shared version/updatedAt. Composed from the per-entry schemas so the index,
 * the fetcher and the generated JSON Schema can never drift apart.
 *
 * This is the single source of truth the JSON Schema is generated from
 * (scripts/generate-schema.ts → the catalog repo's index.schema.json).
 */
export const repoListIndexSchema = z.object({
  // Optional pointer to index.schema.json so editors validate index.json inline
  // as it is authored. Ignored at runtime; present only for author DX.
  $schema: z.string().optional(),
  version: z.string(),
  updatedAt: z.string().datetime(),
  addons: addonCatalogSchema.shape.addons,
  useCases: useCaseCatalogSchema.shape.useCases,
});

export type RepoListIndex = z.infer<typeof repoListIndexSchema>;
