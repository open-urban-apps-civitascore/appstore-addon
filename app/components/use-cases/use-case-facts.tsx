import { type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { INSTALLABILITY_TONE, StatusLabel } from "@/components/use-cases/use-case-status";
import { type MarketplaceTexts } from "@/lib/marketplace-text";
import { USE_CASE_INSTALLABILITY_LABELS, type UseCase } from "@/types/use-cases";

/**
 * Key facts of a use case as an aligned key/value list: installability (with a
 * status dot), Core compatibility, artifact count, and the pinned source repo.
 * Chrome-less on purpose so it can sit inside the hero panel or a sidebar card.
 */
export function UseCaseFacts({ useCase, text }: { useCase: UseCase; text: MarketplaceTexts }) {
  const t = text.useCases;

  return (
    <dl>
      <Row label={t.installabilityLabel}>
        <StatusLabel tone={INSTALLABILITY_TONE[useCase.installability]}>
          {USE_CASE_INSTALLABILITY_LABELS[useCase.installability]}
        </StatusLabel>
      </Row>
      <Row label={t.compatibilityLabel}>
        <span className="font-mono text-xs">
          {useCase.compatibility.map((version) => `Core ${version}`).join(" · ")}
        </span>
      </Row>
      <Row label={t.artifactsLabel}>{useCase.includedArtifacts.length}</Row>
      <Row label={t.sourceLabel}>
        <Link
          href={useCase.source.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          {useCase.source.gitIdentifier}
          <ExternalLink className="size-3" />
        </Link>
      </Row>
    </dl>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
