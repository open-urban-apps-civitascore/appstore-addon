import { BadgeCheck, ExternalLink, MapPin, Scale, Wrench } from "lucide-react";

import type { TrustMetadata } from "@/types/use-cases";

/**
 * The two facts that actually decide a listing for a municipality: who
 * maintains it, and who already runs it in production.
 *
 * Written for the people who sign off (Amtsleitung, data protection, IT
 * security) rather than for the browsing user — this is the section that gets
 * forwarded as a single link.
 *
 * Rendered from optional catalog metadata. Nothing authors or curates that
 * metadata yet, so today it only appears for entries enriched by hand.
 */
export function TrustPanel({ trust }: { trust: TrustMetadata | undefined }) {
  if (!trust) return null;

  const hasReferences = trust.productionReferences.length > 0;

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Vertrauen</h2>
      </div>

      <dl className="mt-4 flex flex-col gap-4">
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

        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Produktiv im Einsatz</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {hasReferences ? (
                <ul className="flex flex-col gap-1">
                  {trust.productionReferences.map((reference) => (
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
    </section>
  );
}
