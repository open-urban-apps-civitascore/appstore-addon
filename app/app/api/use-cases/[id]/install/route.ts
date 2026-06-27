import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import {
  getDataSetForUseCase,
  getDataSetUrlForUseCase,
  ModelForgeError,
} from "@/lib/server/model-forge";
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
    const modelForgeDataSet = await getDataSetForUseCase(useCase);
    const importTrace = {
      importedAt: new Date().toISOString(),
      modelForgeRequest: {
        method: "GET" as const,
        url: getDataSetUrlForUseCase(useCase),
        datasetId: useCase.modelForge.datasetId,
      },
      modelForgeResponse: modelForgeDataSet,
      localDraft: {
        createdDataset: {
          name: modelForgeDataSet.title,
          description:
            modelForgeDataSet.description ?? useCase.draftTemplate.dataset.description,
          openDataAccess: useCase.draftTemplate.dataset.openDataAccess,
          status: "DRAFT" as const,
        },
        createdDataStructures:
          modelForgeDataSet.dataStructureRefs.length > 0
            ? modelForgeDataSet.dataStructureRefs.map((entry) => {
                const parts = entry.split(":");
                return {
                  name: parts.at(-2) ?? entry,
                  version: parts.at(-1) ?? "1.0.0",
                };
              })
            : useCase.draftTemplate.dataStructures.map((entry) => ({
                name: entry.name,
                version: entry.version,
              })),
      },
    };
    const installation = await installUseCaseById(id, modelForgeDataSet, importTrace);

    return NextResponse.json({
      message: "Draft dataset imported from Model Forge",
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
