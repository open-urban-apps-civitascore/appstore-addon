/**
 * A URL-safe slug for a publisher/author name — the key a publisher page is
 * addressed by (`/marketplace/publishers/<slug>`). Normalises diacritics and
 * collapses any run of non-alphanumeric characters to a single hyphen, so
 * "Kommune Mittelerde" → "kommune-mittelerde" round-trips to a stable key.
 *
 * There is no reverse lookup: the display name is recovered by finding the first
 * catalog entry whose publisher slugifies to the same value (the slug is a key,
 * not an encoding).
 */
export function publisherSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // drop combining marks split out by NFKD (ü → u)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
