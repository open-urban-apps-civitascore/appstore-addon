import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseUrn } from "@/lib/urn";

describe("parseUrn — authored vs registry-minted CORE URNs", () => {
  test("authored URN (no disambiguator): name and version read correctly", () => {
    const parsed = parseUrn("urn:core:platform:civitas:datastructure:mobility:TrafficCounterReading:1.2.0");
    assert.equal(parsed.name, "TrafficCounterReading");
    assert.equal(parsed.version, "1.2.0");
    assert.equal(parsed.type, "datastructure");
    assert.equal(parsed.group, "mobility");
    assert.equal(parsed.disambiguator, null);
  });

  test("minted URN: the disambiguator does NOT shift the name, and the version is the registry's", () => {
    // What the !694 backend returns as `modelUrn` — reading the version here is
    // how an install learns which version Model Forge actually assigned.
    const parsed = parseUrn(
      "urn:core:tenant:civitas:datastructure:demo:GeoSensorSource:0000000001:2.1.0",
    );
    assert.equal(parsed.name, "GeoSensorSource", "not the disambiguator");
    assert.equal(parsed.version, "2.1.0");
    assert.equal(parsed.disambiguator, "0000000001");
  });

  test("logical URN (no version) still resolves a name and the default version", () => {
    const parsed = parseUrn("urn:core:platform:civitas:datastructure:common:GeoPoint");
    assert.equal(parsed.name, "GeoPoint");
    assert.equal(parsed.isVersioned, false);
    assert.equal(parsed.version, "1.0.0");
  });

  test("the `latest` token counts as a version", () => {
    const parsed = parseUrn("urn:core:platform:civitas:datastructure:common:GeoPoint:latest");
    assert.equal(parsed.name, "GeoPoint");
    assert.ok(parsed.isLatest);
  });
});
