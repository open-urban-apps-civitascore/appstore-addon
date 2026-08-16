"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseCaseImage } from "@/types/use-cases";

/**
 * Screenshot band under the hero: the image takes two thirds, the remaining
 * third explains what is on it (Ewa, 2026-08-07) — the caption list doubles as
 * navigation, so a reader who only skims still learns what the listing looks
 * like in operation. Renders nothing without screenshots; the hero then
 * carries a decorative illustration banner instead. Shared by use-case and
 * add-on detail pages (both submit the same screenshot shape).
 *
 * Framing is applied uniformly by the UI; uploads should be raw 16:9 UI
 * screenshots without browser chrome (per app-store submission practice).
 */
export function UseCaseGallery({ images, title }: { images: UseCaseImage[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const safeIndex = Math.min(index, images.length - 1);
  const current = images[safeIndex];

  return (
    <section aria-label="Screenshots" className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <figure className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-xl border bg-background">
          {/* Catalog screenshots come from arbitrary hosts; the mock skips the
              image optimizer instead of maintaining remotePatterns. */}
          <Image
            key={current.url}
            src={current.url}
            alt={current.caption ?? `${title} — Screenshot ${safeIndex + 1}`}
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
                onClick={() => setIndex((safeIndex - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Nächstes Bild"
                onClick={() => setIndex((safeIndex + 1) % images.length)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <ChevronRight className="size-5" />
              </button>
              <div
                aria-hidden
                className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/85 px-2.5 py-1.5 shadow-sm"
              >
                {images.map((image, position) => (
                  <span
                    key={image.url}
                    className={cn(
                      "size-2 rounded-full",
                      position === safeIndex ? "bg-primary" : "bg-muted-foreground/35",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </figure>

      {/* Explains THIS screenshot — the points come per image from the
          publisher's submission form, not from generic listing copy. */}
      <div aria-live="polite" className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Was Sie hier sehen</p>
        {current.caption ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">{current.caption}</p>
        ) : null}

        {current.highlights.length > 0 ? (
          <ul className="mt-3 flex list-none flex-col gap-2.5">
            {current.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                <span className="min-w-0">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Für dieses Bild wurde noch keine Beschreibung eingereicht.
          </p>
        )}

        {images.length > 1 ? (
          <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
            Bild {safeIndex + 1} von {images.length}
          </p>
        ) : null}
      </div>
    </section>
  );
}
