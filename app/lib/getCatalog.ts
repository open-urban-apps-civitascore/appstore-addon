import { getRepoListAddons } from '@/lib/server/repo-list';
import type { Addon } from '@/types/catalog';

/** Add-ons from the repo-list (remote index, cached; bundled seed offline). */
export async function getCatalog(): Promise<{ addons: Addon[] }> {
  return { addons: await getRepoListAddons() };
}
