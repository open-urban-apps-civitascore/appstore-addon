import { BadgeCheck, Check, ExternalLink, MapPin, Scale, UserRound, Wrench } from "lucide-react";

import { TierBadge } from "@/components/use-cases/use-case-status";
import {
  CURATION_TIER_CRITERIA,
  CURATION_TIER_HINTS,
  type CurationTier,
} from "@/types/curation-tier";
import type { TrustMetadata } from "@/types/use-cases";

/**
 * The facts that actually decide a listing for a municipality: the curation
 * tier (the one graded badge, with its criteria disclosed), who maintains it,
 * and who already runs it in production.
 *
 * Written for the people who sign off (Amtsleitung, data protection, IT
 * security) rather than for the browsing user — this is the section that gets
 * forwarded as a single link.
 *
 * The tier always renders; the remaining rows come from optional catalog
 * metadata that nothing authors or curates yet (hand-enriched entries only).
 */
/**
 * Add-on trust carries no production references — add-ons are generic platform
 * components, so "which commune runs it" is a use-case concept. The panel
 * renders that block only for listing types that have the field at all.
 */
type PanelTrust = Omit<TrustMetadata, "productionReferences"> &
  Partial<Pick<TrustMetadata, "productionReferences">>;

export function TrustPanel({
  tier,
  trust,
}: {
  tier: CurationTier;
  trust: PanelTrust | undefined;
}) {
  const references = trust?.productionReferences;
  const hasReferences = (references?.length ?? 0) > 0;

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Vertrauen</h2>
      </div>

      <div className="mt-4">
        <TierBadge tier={tier} />
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground underline-offset-2 hover:underline">
            Was bedeutet dieses Siegel?
          </summary>
          <div className="mt-2 rounded-md bg-muted/50 p-3">
            <p className="text-muted-foreground">{CURATION_TIER_HINTS[tier]}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {CURATION_TIER_CRITERIA[tier].map((criterion) => (
                <li key={criterion} className="flex items-start gap-1.5 text-foreground">
                  <Check aria-hidden className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  {criterion}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Vergeben von der Kuratierung der Community — und bei Verstößen entziehbar.
            </p>
          </div>
        </details>
      </div>

      {!trust ? (
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
          Für diesen Eintrag liegen noch keine weiteren Vertrauensangaben vor.
        </p>
      ) : (
      <dl className="mt-4 flex flex-col gap-4 border-t pt-4">
        {trust.maintainer ? (
          <div className="flex items-start gap-2.5">
            <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Gepflegt von</dt>
              <dd className="text-sm font-medium text-foreground">
                {trust.maintainer.contactUrl ? (
                  <a
                    href={trust.maintainer.contactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  >
                    {trust.maintainer.name}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  trust.maintainer.name
                )}
              </dd>
            </div>
          </div>
        ) : null}

        {trust.contactPerson ? (
          <div className="flex items-start gap-2.5">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Ansprechperson</dt>
              <dd className="text-sm text-foreground">
                <span className="font-medium">{trust.contactPerson.name}</span>
                {trust.contactPerson.role ? (
                  <span className="block text-xs text-muted-foreground">
                    {trust.contactPerson.role}
                  </span>
                ) : null}
                {trust.contactPerson.email ? (
                  <a
                    href={`mailto:${trust.contactPerson.email}`}
                    className="block text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {trust.contactPerson.email}
                  </a>
                ) : null}
                {trust.contactPerson.phone ? (
                  <span className="block text-xs text-muted-foreground">
                    {trust.contactPerson.phone}
                  </span>
                ) : null}
              </dd>
            </div>
          </div>
        ) : null}

        {references ? (
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Produktiv im Einsatz</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {hasReferences ? (
                <ul className="flex flex-col gap-1">
                  {references.map((reference) => (
                    <li key={reference.municipality} className="font-medium">
                      {reference.url ? (
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                        >
                          {reference.municipality}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        reference.municipality
                      )}
                      {reference.since ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          seit {reference.since}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">
                  Noch keine gemeldete Produktivnutzung.
                </span>
              )}
            </dd>
          </div>
        </div>
        ) : null}

        {trust.curatedBy ? (
          <div className="flex items-start gap-2.5">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Geprüft von</dt>
              <dd className="text-sm font-medium text-foreground">
                {trust.curatedBy}
                {trust.curatedAt ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({trust.curatedAt})
                  </span>
                ) : null}
              </dd>
            </div>
          </div>
        ) : null}

        {trust.license ? (
          <div className="flex items-start gap-2.5">
            <Scale className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Lizenz</dt>
              <dd className="font-mono text-sm text-foreground">{trust.license}</dd>
            </div>
          </div>
        ) : null}
      </dl>
      )}
    </section>
  );
}
