import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import { BundleError } from "@/lib/server/bundle";
import { isMockMode } from "@/lib/server/mock/mode";
import { PortalBackendError } from "@/lib/server/portal-backend/errors";
import { installUseCase } from "@/lib/server/portal-backend/install";
import { removeInstalledUseCaseById } from "@/lib/use-case-installations";

export const runtime = "nodejs";

/**
 * Session guard. Mock mode runs WITHOUT Keycloak (fully offline), so it skips the
 * check — installs then only touch the in-memory mock backend + the mock store,
 * never real infrastructure. Outside mock mode the guard is unchanged.
 */
async function unauthorized(): Promise<NextResponse | null> {
  if (isMockMode()) return null;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Map an install/uninstall error onto an HTTP response. */
function errorResponse(error: unknown): NextResponse {
  if (error instanceof PortalBackendError || error instanceof BundleError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The use case installation failed." },
    { status: 500 },
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await unauthorized();
  if (denied) return denied;

  const { id } = await params;
  const useCase = await getUseCaseById(id);
  if (!useCase) {
    return NextResponse.json({ error: "Use case not found" }, { status: 404 });
  }

  try {
    const { record, created } = await installUseCase(useCase);
    return NextResponse.json({
      message: created
        ? "Use case provisioned via the CivitasCore portal-backend"
        : "Existing portal-backend install reused",
      installation: record,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await unauthorized();
  if (denied) return denied;

  const { id } = await params;

  try {
    const removed = await removeInstalledUseCaseById(id);
    if (!removed) {
      return NextResponse.json({ error: "Installed use case not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Installed use case removed" });
  } catch (error) {
    return errorResponse(error);
  }
}
