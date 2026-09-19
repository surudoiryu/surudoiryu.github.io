export const INDEX_BLOCK_REASONS = Object.freeze({
    THIN_CONTENT: "thin_content",
    CANONICAL_CONFLICT: "canonical_conflict",
    MISSING_GROWER: "missing_grower_relation",
    MISSING_IDENTITY: "missing_immutable_identity",
    LEGAL_REVIEW: "legal_review",
    UNPUBLISHED_SOURCE: "unpublished_source",
});

export function publicationReadiness({ publicRenderable = true, sourcePublished = true, hasImmutableIdentity = true, canonicalConflict = false, hasGrower = true, legalStatus = "public", informationScore = 0, minimumInformationScore = 3 }) {
    const reasons = [];
    if (!sourcePublished) reasons.push(INDEX_BLOCK_REASONS.UNPUBLISHED_SOURCE);
    if (!hasImmutableIdentity) reasons.push(INDEX_BLOCK_REASONS.MISSING_IDENTITY);
    if (canonicalConflict) reasons.push(INDEX_BLOCK_REASONS.CANONICAL_CONFLICT);
    if (!hasGrower) reasons.push(INDEX_BLOCK_REASONS.MISSING_GROWER);
    if (legalStatus !== "public") reasons.push(INDEX_BLOCK_REASONS.LEGAL_REVIEW);
    if (informationScore < minimumInformationScore) reasons.push(INDEX_BLOCK_REASONS.THIN_CONTENT);
    return {
        publicationStatus: publicRenderable ? "published" : "unpublished",
        indexStatus: publicRenderable && reasons.length === 0 ? "index,follow" : "noindex,follow",
        indexBlockReasons: [...new Set(reasons)],
    };
}

