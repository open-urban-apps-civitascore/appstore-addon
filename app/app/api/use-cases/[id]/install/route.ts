import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import {
  getDataSetUrlForUseCase,
  ModelForgeError,
  provisionUseCaseInModelForge,
} from "@/lib/server/model-forge";
import {
  deriveCreatedDataset,
  deriveCreatedDataStructures,
  installUseCaseById,
  removeInstalledUseCaseById,
} from "@/lib/use-case-installations";

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
    const importTrace = {
      importedAt: new Date().toISOString(),
      modelForgeRequest: {
        method: created ? ("POST" as const) : ("GET" as const),
        url: getDataSetUrlForUseCase(useCase),
        datasetId: dataSet.id,
      },
      modelForgeResponse: dataSet,
      localDraft: {
        createdDataset: deriveCreatedDataset(useCase, dataSet),
        createdDataStructures: deriveCreatedDataStructures(useCase, dataSet),
      },
    };
    const installation = await installUseCaseById(
      id,
      dataSet,
      importTrace,
      created ? "model-forge-created" : "model-forge-dataset-import",
    );

    return NextResponse.json({
      message: created
        ? "Use case provisioned in Model Forge and stored as a local draft"
        : "Existing Model Forge dataset imported as a local draft",
      installation,
      trace: importTrace,
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
