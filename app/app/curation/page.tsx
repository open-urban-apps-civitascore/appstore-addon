import Link from "next/link";
import { ArrowRight, CircleAlert, Check, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MarketplacePageShell } from "@/components/marketplace/page-shell";
import { CurationOnly } from "@/components/curation/curation-only";
import { evaluateSubmission, listSubmissions } from "@/lib/curation";
import { getMockRole } from "@/lib/mock-role";

/**
 * The curator's queue: submissions waiting to be reviewed before they appear in
 * the catalog. Curation belongs to Civitas Connect e. V. — a commune view has
 * no business here, so the route checks the role, not just the navigation.
 *
 * PLACEHOLDER SOURCE: submissions are constants and have to come from the
 * catalog repository's open merge requests instead.
 */
export default async function CurationPage() {
  const role = await getMockRole();
  if (role !== "curator") {
    return <CurationOnly />;
  }

  const submissions = listSubmissions().map((submission) => ({
    submission,
    evaluation: evaluateSubmission(submission),
  }));

  return (
    <MarketplacePageShell breadcrumb="Kuratierung" tenantName="Stadt Musterstadt">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          {/* <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entwurf — noch nicht funktionsfähig
          </p> */}
          <h1 className="mt-1 text-3xl font-bold text-foreground">Einreichungen</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Kommunen und Entwickler reichen Anwendungsfälle ein; vor der Aufnahme prüft eine Person
            sie gegen eine kurze Checkliste. Was eine Maschine prüfen kann, ist schon geprüft — der
            Rest ist die eigentliche Kuratierungsarbeit.
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            Keine offenen Einreichungen.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {submissions.map(({ submission, evaluation }) => (
              <li key={submission.id}>
                <Link
                  href={`/curation/${submission.id}`}
                  className="flex flex-col gap-2 rounded-md border bg-card p-5 transition-colors hover:border-primary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Inbox className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-base font-semibold text-foreground">
                      {submission.title}
                    </span>
                    {evaluation.blockers.length > 0 ? (
                      <Badge variant="outline" className="gap-1 text-[11px] text-destructive">
                        <CircleAlert className="size-3" />
                        {evaluation.blockers.length} blockierend
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Check className="size-3" />
                        Prüfungen bestanden
                      </Badge>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-primary">
                      Prüfen <ArrowRight className="size-3" />
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{submission.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    Eingereicht von{" "}
                    <span className="font-medium text-foreground">{submission.submittedBy}</span> ·{" "}
                    {submission.artifactCount} Artefakte ·{" "}
                    <span className="font-mono">{submission.gitIdentifier}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MarketplacePageShell>
  );
}
