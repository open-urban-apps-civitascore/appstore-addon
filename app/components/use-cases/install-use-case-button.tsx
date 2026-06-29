"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function InstallUseCaseButton({ useCaseId }: { useCaseId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInstall() {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/use-cases/${useCaseId}/install`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Die Installation konnte nicht gestartet werden.");
      }

      router.push("/installed");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Die Installation konnte nicht gestartet werden.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleInstall} disabled={isPending}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {isPending ? "Wird angelegt…" : "In Model Forge anlegen"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
