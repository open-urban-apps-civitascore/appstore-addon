import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUseCaseById } from "@/lib/getUseCases";
import { installUseCaseById } from "@/lib/use-case-installations";

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

  const installation = await installUseCaseById(id);

  return NextResponse.json({
    message: "Draft dataset created",
    installation,
    futureModelForgeImportEndpoint: useCase.modelForge.resolvedDatasetEndpoint,
  });
}
