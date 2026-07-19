import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import { BundleError } from "@/lib/server/bundle";
import { isMockMode } from "@/lib/server/mock/mode";
import { PortalBackendError } from "@/lib/server/portal-backend/errors";
import { activateInstalledUseCase } from "@/lib/server/portal-backend/install";
import { activationOptionsSchema } from "@/types/install-options";

export const runtime = "nodejs";

/**
 * Post-install activation (D10, second half): completes a DRAFT install (the
 * data source is chosen now) or releases a READY one. Same auth posture as the
 * install route — mock mode runs offline without Keycloak, so it skips the
 * session check; nothing real is reachable there.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isMockMode()) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { id } = await params;
  const useCase = await getUseCaseById(id);
  if (!useCase) {
    return NextResponse.json({ error: "Use case not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = activationOptionsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Aktivierungsoptionen.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const record = await activateInstalledUseCase(useCase, undefined, parsed.data);
    if (record === null) {
      return NextResponse.json({ error: "Use case is not installed" }, { status: 404 });
    }
    return NextResponse.json({ installation: record });
  } catch (error) {
    if (error instanceof PortalBackendError || error instanceof BundleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Die Aktivierung ist fehlgeschlagen." },
      { status: 500 },
    );
  }
}
