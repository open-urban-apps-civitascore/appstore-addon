import Link from "next/link";

import { UseCaseIllustration } from "@/components/use-cases/use-case-illustration";
import { MaturityStatus } from "@/components/use-cases/use-case-status";
import { type UseCase } from "@/types/use-cases";

export function UseCaseCard({ useCase }: { useCase: UseCase }) {
  const category = useCase.categories[0];

  return (
    <Link
      href={`/marketplace/use-cases/${useCase.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow group-hover:shadow-md">
        <div className="relative">
          <UseCaseIllustration categories={useCase.categories} />
          {category ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-background px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:text-emerald-400">
              {category}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-semibold leading-tight text-foreground">{useCase.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {useCase.summary}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
            <MaturityStatus maturity={useCase.maturity} />
            <span className="truncate text-sm text-muted-foreground">{useCase.publisher}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
