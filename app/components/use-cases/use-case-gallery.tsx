"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseCase } from "@/types/use-cases";

/**
 * Full-width 16:9 media carousel under the hero — the majority pattern across
 * app marketplaces (research note 2026-08-07). Renders nothing when the
 * commune delivered no screenshots — the hero then carries a decorative
 * illustration banner instead, so no empty "screenshot slot" ever occupies
 * prime space.
 *
 * The screenshots address Alex (and, forwarded, the Amtsleitung): the result
 * in operation, the result inside the portal, the domain detail view. Framing
 * is applied uniformly by the UI; uploads should be raw 16:9 UI screenshots
 * without browser chrome.
 */
export function UseCaseGallery({ useCase }: { useCase: UseCase }) {
  const images = useCase.images;
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const current = images[Math.min(index, images.length - 1)];
  const altFor = (position: number, caption?: string) =>
    caption ?? `${useCase.title} — Screenshot ${position + 1}`;

  return (
    <section aria-label="Screenshots" className="flex flex-col gap-3">
      <figure className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-xl border bg-background">
          {/* Catalog screenshots come from arbitrary hosts; the mock skips the
              image optimizer instead of maintaining remotePatterns. */}
          <Image
            key={current.url}
            src={current.url}
            alt={altFor(index, current.caption)}
            width={1600}
            height={900}
            unoptimized
            className="aspect-video w-full object-cover object-top"
          />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Vorheriges Bild"
                onClick={() => setIndex((index - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Nächstes Bild"
                onClick={() => setIndex((index + 1) % images.length)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <ChevronRight className="size-5" />
              </button>
              {/* Dots show how many images exist and where we are. */}
              <div
                role="group"
                aria-label="Bildauswahl"
                className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/85 px-2.5 py-1.5 shadow-sm"
              >
                {images.map((image, position) => (
                  <button
                    key={image.url}
                    type="button"
                    aria-label={`Bild ${position + 1} von ${images.length} anzeigen`}
                    aria-current={position === index}
                    onClick={() => setIndex(position)}
                    className={cn(
                      "size-2.5 rounded-full transition-colors",
                      position === index
                        ? "bg-primary"
                        : "bg-muted-foreground/35 hover:bg-muted-foreground/60",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {current.caption ? (
          <figcaption aria-live="polite" className="text-xs text-muted-foreground">
            {current.caption}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}
