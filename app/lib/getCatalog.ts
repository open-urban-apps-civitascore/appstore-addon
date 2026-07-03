import { getRepoListAddons } from '@/lib/server/repo-list';
import type { Addon } from '@/types/catalog';

/** Add-ons from the repo-list (remote index, cached; empty when unconfigured/unreachable). */
export async function getCatalog(): Promise<{ addons: Addon[] }> {
  return { addons: await getRepoListAddons() };
}
