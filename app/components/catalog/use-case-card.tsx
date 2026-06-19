import {
  Building2,
  CheckCircle2,
  Database,
  type LucideIcon,
  Monitor,
  ShieldCheck,
  Table2,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  type Capability,
  INSTALLABILITY_LABELS,
  type Installability,
  type Maturity,
  MATURITY_LABELS,
  type UseCase,
} from "@/lib/catalog/types";

const CAPABILITY_META: Record<Capability, { icon: LucideIcon; label: string }> = {
  datasets: { icon: Table2, label: "Datensätze" },
  datasources: { icon: Database, label: "Datenquellen" },
  pipelines: { icon: Workflow, label: "Pipelines" },
  validation: { icon: ShieldCheck, label: "Validierung" },
  dashboard: { icon: Monitor, label: "Dashboard" },
};

const MATURITY_DOT: Record<Maturity, string> = {
  verified: "bg-success",
  operational: "bg-primary",
  prototype: "bg-muted-foreground",
};

const INSTALLABILITY_PILL: Record<Installability, string> = {
  direct: "bg-success/20 text-foreground",
  adaptation: "bg-warn/20 text-foreground",
  experimental: "bg-experimental/20 text-foreground",
};

interface UseCaseCardProps {
  useCase: UseCase;
}

export const UseCaseCard = ({ useCase }: UseCaseCardProps) => {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-card p-5 transition-shadow hover:shadow-sm",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {CATEGORY_LABELS[useCase.category]}
        </span>
        <MaturityBadge maturity={useCase.maturity} />
      </header>

      <h3 className="text-base font-semibold leading-tight text-foreground">{useCase.title}</h3>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {useCase.description}
      </p>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5" />
        <span>{useCase.publisher}</span>
      </div>

      <footer className="mt-auto flex items-center justify-between pt-3">
        <ul className="flex items-center gap-2 text-muted-foreground">
          {useCase.capabilities.map((capability) => {
            const { icon: Icon, label } = CAPABILITY_META[capability];
            return (
              <li key={capability} title={label}>
                <Icon className="size-4" aria-label={label} />
              </li>
            );
          })}
        </ul>
        <Badge
          variant="outline"
          className={cn("border-transparent", INSTALLABILITY_PILL[useCase.installability])}
        >
          {INSTALLABILITY_LABELS[useCase.installability]}
        </Badge>
      </footer>
    </article>
  );
};

const MaturityBadge = ({ maturity }: { maturity: Maturity }) => {
  if (maturity === "verified") {
    return (
      <Badge variant="outline" className="border-transparent bg-success/15">
        <CheckCircle2 className="size-3 text-success" />
        {MATURITY_LABELS[maturity]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 bg-muted">
      <span className={cn("size-1.5 rounded-full", MATURITY_DOT[maturity])} />
      {MATURITY_LABELS[maturity]}
    </Badge>
  );
};
