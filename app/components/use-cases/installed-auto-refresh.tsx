"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While any install is still PROVISIONING, re-fetch the installed list on an
 * interval so the PROVISIONING → AVAILABLE/READY transition appears without a
 * manual reload. `router.refresh()` re-runs the server component (which refreshes
 * each record's status from the backend). Polling stops as soon as nothing is
 * pending (`active` goes false) — no work while everything is settled.
 */
export function InstalledAutoRefresh({
  active,
  intervalMs = 1500,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  return null;
}
