/**
 * The single switch for mock mode (`MARKETPLACE_MOCK=1`): the whole marketplace
 * UI runs offline on fixtures — catalog from `fixtures/catalog.ts`, bundles from
 * `fixtures/bundles.ts`, and the portal-backend replaced by an in-memory
 * simulation (`portal-backend.ts`). Server-side only; the UI signals the mode
 * with a badge (app-header) and a catalog-freshness hint.
 *
 * There are deliberately only THREE consumer seams (everything else follows):
 *   - repo-list `loadIndex()`            → fixture catalog
 *   - install `defaultInstallDeps()`     → mock client + bundle + store
 *   - use-case-installations store read  → mock install store
 */
export function isMockMode(): boolean {
  const value = process.env.MARKETPLACE_MOCK?.trim().toLowerCase();
  return value === "1" || value === "true";
}
