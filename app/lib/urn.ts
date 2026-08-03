/**
 * Minimal parser for CivitasCore (CORE) URNs.
 *
 * Canonical shape:
 * `urn:core:<scope>:<owner>:<type>:<group>:<name>[:<disambiguator>][:<version>]`
 *
 * Two flavours occur side by side, and telling them apart is the whole job here:
 *
 *   authored (a bundle writes it)  urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.2.0
 *   minted   (the registry mints)  urn:core:platform:civitas:element:common:TrafficCounterReading:ywsrd6ryb9:1.0.0
 *
 * The minted form inserts a 10-character base36 *disambiguator* between the name
 * and the version — server-derived, never hand-constructed. Counting back from
 * the end therefore reads the disambiguator as the name, which surfaces as
 * `ywsrd6ryb9` where a title belongs. So the name is read by POSITION (a CORE URN
 * has a fixed prefix) and only the tail is interpreted.
 *
 * The version segment is optional: a *logical* URN omits it, and the `latest`
 * token may stand in for it.
 */

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?$/;
const DEFAULT_VERSION = "1.0.0";
/** Fixed index of the `name` segment in a canonical CORE URN. */
const NAME_INDEX = 6;

export interface ParsedUrn {
  raw: string;
  type: string | null;
  group: string | null;
  name: string;
  /** Resolved version label; the `latest` token or `DEFAULT_VERSION` when none is present. */
  version: string;
  isLatest: boolean;
  /** Whether the URN carried an explicit version segment (`latest` counts). */
  isVersioned: boolean;
  /** The registry's uniqueness token, present only on minted URNs. */
  disambiguator: string | null;
}

export function parseUrn(urn: string): ParsedUrn {
  const parts = urn.split(":");
  const last = parts.at(-1) ?? urn;

  const isLatest = last === "latest";
  const isVersioned = isLatest || VERSION_PATTERN.test(last);

  // A canonical URN has the fixed `urn:core:<scope>:<owner>:<type>:<group>:` head,
  // so the name is at a known index. Anything shorter (a bare name, a foreign id)
  // falls back to reading from the end.
  const isCanonical = parts.length > NAME_INDEX && parts[0] === "urn" && parts[1] === "core";

  let name: string;
  let disambiguator: string | null = null;
  if (isCanonical) {
    name = parts[NAME_INDEX];
    // Whatever sits between the name and the version — at most one segment.
    disambiguator = parts.slice(NAME_INDEX + 1, isVersioned ? parts.length - 1 : parts.length)[0] ?? null;
  } else {
    name = parts[isVersioned ? parts.length - 2 : parts.length - 1] ?? urn;
  }

  return {
    raw: urn,
    type: isCanonical ? (parts[4] ?? null) : null,
    group: isCanonical ? (parts[5] ?? null) : null,
    name,
    version: isVersioned ? last : DEFAULT_VERSION,
    isLatest,
    isVersioned,
    disambiguator,
  };
}
