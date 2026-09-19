import assert from "node:assert/strict";
import test from "node:test";
import { publicationReadiness } from "./publication-readiness.mjs";

test("renderable entity can remain noindex with explicit reasons", () => {
    assert.deepEqual(publicationReadiness({ canonicalConflict: true, informationScore: 1 }), {
        publicationStatus: "published", indexStatus: "noindex,follow", indexBlockReasons: ["canonical_conflict", "thin_content"],
    });
});

test("information-rich entity is indexable without requiring long prose", () => {
    assert.equal(publicationReadiness({ informationScore: 5 }).indexStatus, "index,follow");
});

test("missing immutable identity always blocks indexing", () => {
    assert.ok(publicationReadiness({ hasImmutableIdentity: false, informationScore: 5 }).indexBlockReasons.includes("missing_immutable_identity"));
});

