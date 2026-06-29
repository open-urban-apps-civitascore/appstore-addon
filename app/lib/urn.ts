/**
 * Minimal parser for CORE URNs as used by Model Forge.
 *
 * Canonical shape: `urn:core:<scope>:<owner>:<type>:<group>:<name>[:<version>]`
 * e.g. `urn:core:platform:civitas:datastructure:demo:TreeRecord:1.0.0`
 *
 * The version segment is optional: a *logical* URN omits it, and the `latest`
 * token may stand in for it. We detect the version by inspecting the last
 * segment rather than by position, so a logical URN is not mistaken for a
 * versioned one (the previous `split(":").at(-2)` approach got this wrong).
 */

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?$/;
const DEFAULT_VERSION = "1.0.0";

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
}

export function parseUrn(urn: string): ParsedUrn {
  const parts = urn.split(":");
  const last = parts.at(-1) ?? urn;

  const isLatest = last === "latest";
  const isVersioned = isLatest || VERSION_PATTERN.test(last);

  const nameIndex = isVersioned ? parts.length - 2 : parts.length - 1;
  const name = parts[nameIndex] ?? urn;

  // Type and group sit at fixed positions in a canonical CORE URN; absent in
  // anything shorter (e.g. a bare name), in which case we report null.
  const minLength = isVersioned ? 8 : 7;
  const type = parts.length >= minLength ? parts[4] ?? null : null;
  const group = parts.length >= minLength ? parts[5] ?? null : null;

  return {
    raw: urn,
    type,
    group,
    name,
    version: isVersioned ? last : DEFAULT_VERSION,
    isLatest,
    isVersioned,
  };
}
