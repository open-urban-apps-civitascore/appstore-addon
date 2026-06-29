import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import { ModelForgeError, provisionUseCaseInModelForge } from "@/lib/server/model-forge";
import { installUseCaseById, removeInstalledUseCaseById } from "@/lib/use-case-installations";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const useCase = getUseCaseById(id);
  if (!useCase) {
    return NextResponse.json({ error: "Use case not found" }, { status: 404 });
  }

  try {
    const { dataSet, created } = await provisionUseCaseInModelForge(useCase);
    const installation = installUseCaseById(
      id,
      dataSet,
      created ? "model-forge-created" : "model-forge-dataset-import",
    );

    return NextResponse.json({
      message: created
        ? "Use case provisioned in Model Forge"
        : "Existing Model Forge dataset linked",
      installation,
    });
  } catch (error) {
    if (error instanceof ModelForgeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The use case installation failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await removeInstalledUseCaseById(id);

  if (!deleted) {
    return NextResponse.json({ error: "Installed draft not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Installed draft removed" });
}
