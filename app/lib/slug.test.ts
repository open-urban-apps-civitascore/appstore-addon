import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { publisherSlug } from "@/lib/slug";

describe("publisherSlug", () => {
  test("lowercases and hyphenates a publisher name", () => {
    assert.equal(publisherSlug("Kommune Mittelerde"), "kommune-mittelerde");
    assert.equal(publisherSlug("Stadt Musterstadt"), "stadt-musterstadt");
  });

  test("strips diacritics and collapses punctuation/whitespace", () => {
    assert.equal(publisherSlug("Bündheim  &  Co."), "bundheim-co");
    assert.equal(publisherSlug("  Über-Stadt  "), "uber-stadt");
  });

  test("is stable — slugifying a slug returns it unchanged", () => {
    const slug = publisherSlug("Kommune Mittelerde");
    assert.equal(publisherSlug(slug), slug);
  });
});
