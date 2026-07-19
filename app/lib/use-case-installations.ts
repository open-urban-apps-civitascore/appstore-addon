import { getInstallStore } from "@/lib/server/install-store";
import { getMockInstallStore } from "@/lib/server/mock/deps";
import { isMockMode } from "@/lib/server/mock/mode";
import {
  defaultInstallDeps,
  refreshInstalledUseCaseStatus,
  uninstallUseCase,
  type InstallDeps,
} from "@/lib/server/portal-backend/install";
import type { InstalledUseCase } from "@/types/use-cases";

/**
 * App-facing view over installed use cases. Since every install now goes through
 * the portal-backend and is recorded in the local install store, this module reads
 * that store and refreshes each record's lifecycle status from the backend
 * (best-effort) for display. The write side (install / uninstall) lives in the
 * portal-backend install orchestrator.
 */

/**
 * The installed use cases, newest first. Read from the local install store; each
 * record's status is refreshed from `GET /datasets/{id}` when the backend is
 * reachable, otherwise the last-known stored status is shown (so the list stays
 * usable even when the portal-backend is down or unconfigured).
 */
export async function listInstalledUseCases(): Promise<InstalledUseCase[]> {
  // Mock mode reads the mock store — the SAME store the mock install deps write
  // to (a list read from the real store would miss every mock install).
  const store = isMockMode() ? getMockInstallStore() : getInstallStore();
  const records = await store.list();

  // Build the backend deps once; if the portal-backend is unconfigured, skip the
  // live refresh and serve stored records rather than failing the whole list.
  let deps: InstallDeps | undefined;
  try {
    deps = defaultInstallDeps();
  } catch {
    deps = undefined;
  }

  const refreshed = deps
    ? await Promise.all(
        records.map(async (record) => {
          const updated = await refreshInstalledUseCaseStatus(record, deps).catch(() => record);
          // Self-heal: persist a settled status (+ the completed trace) once, so the
          // record stops being stuck at PROVISIONING and later reads need no re-heal.
          if (updated !== record) await store.save(updated).catch(() => undefined);
          return updated;
        }),
      )
    : records;

  return refreshed.sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

/**
 * Uninstall a use case: unrelease (tear down infrastructure) + delete on the
 * portal-backend, then drop the local record. Returns false when nothing is
 * installed for this use case.
 */
export async function removeInstalledUseCaseById(useCaseId: string): Promise<boolean> {
  return uninstallUseCase(useCaseId);
}
