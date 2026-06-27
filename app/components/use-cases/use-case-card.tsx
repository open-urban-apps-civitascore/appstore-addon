import Link from "next/link";
import { Building2, Boxes, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  USE_CASE_INSTALLABILITY_LABELS,
  USE_CASE_MATURITY_LABELS,
  type UseCase,
} from "@/types/use-cases";

export function UseCaseCard({ useCase }: { useCase: UseCase }) {
  return (
    <Link
      href={`/marketplace/use-cases/${useCase.id}`}
      className="flex rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <article className="flex flex-grow flex-col gap-4 rounded-md border bg-card p-5 transition-shadow hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold leading-tight text-foreground">{useCase.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{useCase.summary}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="size-4" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{USE_CASE_MATURITY_LABELS[useCase.maturity]}</Badge>
          <Badge variant="secondary">
            {USE_CASE_INSTALLABILITY_LABELS[useCase.installability]}
          </Badge>
          {useCase.categories.map((category) => (
            <Badge key={category} variant="outline" className="font-normal">
              {category}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border bg-background p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Boxes className="size-4" />
            <span>{useCase.includedArtifacts.length} Artefakte</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-4" />
            <span>{useCase.publisher}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
