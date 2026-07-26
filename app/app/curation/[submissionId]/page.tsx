import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { CurationReview } from "@/components/curation/curation-review";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { evaluateSubmission, getSubmission } from "@/lib/curation";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function CurationReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const submission = getSubmission(submissionId);

  if (!submission) {
    notFound();
  }

  const evaluation = evaluateSubmission(submission);

  return (
    <MarketplacePageShell
      breadcrumb={`Kuratierung / ${submission.title}`}
      tenantName="Stadt Musterstadt"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/curation"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Zurück zu den Einreichungen
        </Link>

        <section className="rounded-md border bg-card p-5">
          <h1 className="text-2xl font-bold text-foreground">{submission.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{submission.summary}</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Eingereicht von</dt>
              <dd className="text-sm font-medium text-foreground">{submission.submittedBy}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Eingereicht am</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatTimestamp(submission.submittedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lizenz</dt>
              <dd className="font-mono text-sm text-foreground">
                {submission.license ?? "— keine angegeben —"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Referenz</dt>
              <dd className="font-mono text-sm text-foreground">{submission.gitIdentifier}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Repository</dt>
              <dd className="text-sm">
                <a
                  href={submission.repository}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all font-mono text-primary underline-offset-2 hover:underline"
                >
                  {submission.repository}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </dd>
            </div>
          </dl>

          {submission.note ? (
            <p className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Anmerkung der einreichenden Stelle: </span>
              {submission.note}
            </p>
          ) : null}
        </section>

        <CurationReview evaluation={evaluation} />
      </div>
    </MarketplacePageShell>
  );
}
