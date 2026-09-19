const clean = (value) => String(value || "").trim();
export const slugify = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const unique = (values) => [...new Set(values.filter(Boolean))];

export function stableIdDiscriminator(id, length = 8) {
    const normalized = slugify(id).replaceAll("-", "");
    return normalized.slice(-length) || "entity";
}

function semanticParts(product) {
    return unique([
        slugify(product.categoryName),
        slugify(product.subCategoryName),
        slugify(product.productForm),
        ...(product.variations || []).map((item) => slugify(item.name)),
    ]);
}

export function productBasePath(product) {
    return `/cannabis/${slugify(product.name)}-${slugify(product.growerName)}`;
}

function semanticCandidates(product) {
    const productSlug = slugify(product.name), growerSlug = slugify(product.growerName), parts = semanticParts(product), candidates = [];
    for (let size = 1; size <= parts.length; size += 1) candidates.push(`/cannabis/${productSlug}-${parts.slice(0, size).join("-")}-${growerSlug}`);
    return unique(candidates);
}

export function planProductRoutes(products, existingHistory = new Map()) {
    const active = products.filter((item) => item.sourceStatus === "active");
    const baseGroups = new Map();
    for (const product of active) { const base = productBasePath(product); baseGroups.set(base, [...(baseGroups.get(base) || []), product]); }
    const plans = new Map(), claimed = new Map(), conflicts = [];
    const claim = (path, productId) => { const owner = claimed.get(path); if (owner && owner !== productId) return false; claimed.set(path, productId); return true; };

    // Published history owns its canonical before newly generated candidates.
    for (const product of active) {
        const previous = existingHistory.get(product.id);
        if (!previous) continue;
        if (!claim(previous.canonicalPath, product.id)) conflicts.push({ canonical: previous.canonicalPath, ids: [claimed.get(previous.canonicalPath), product.id], reason: "historical_canonical_collision" });
        else plans.set(product.id, { id: product.id, canonicalPath: previous.canonicalPath, basis: "preserved_history", legacyPaths: unique(previous.legacyPaths || []) });
    }

    for (const [base, group] of baseGroups) {
        const needsDisambiguation = group.length > 1;
        const candidatesById = new Map(group.map((item) => [item.id, semanticCandidates(item)]));
        for (const product of [...group].sort((a, b) => a.id.localeCompare(b.id))) {
            if (plans.has(product.id)) continue;
            const candidates = needsDisambiguation ? candidatesById.get(product.id) : [base];
            // A semantic suffix is valid only when it genuinely distinguishes this
            // entity from every other immutable entity in the same base-route group.
            const distinguishingCandidates = needsDisambiguation
                ? candidates.filter((candidate, index) => group.filter((other) => candidatesById.get(other.id)?.[index] === candidate).length === 1)
                : candidates;
            let canonicalPath = distinguishingCandidates.find((candidate) => claim(candidate, product.id));
            let basis = canonicalPath ? "semantic" : "immutable_id";
            if (!canonicalPath) {
                canonicalPath = `/cannabis/${slugify(product.name)}-${slugify(product.growerName)}-${stableIdDiscriminator(product.id)}`;
                if (!claim(canonicalPath, product.id)) conflicts.push({ canonical: canonicalPath, ids: [claimed.get(canonicalPath), product.id], reason: "id_discriminator_collision" });
            }
            plans.set(product.id, { id: product.id, canonicalPath, basis: needsDisambiguation ? basis : "base", legacyPaths: [] });
        }
    }
    const redirects = [];
    for (const product of active) {
        const previous = existingHistory.get(product.id), plan = plans.get(product.id);
        if (previous?.canonicalPath && previous.canonicalPath !== plan.canonicalPath) redirects.push({ from: previous.canonicalPath, to: plan.canonicalPath, entityId: product.id, status: 301 });
        for (const legacy of plan.legacyPaths) if (legacy !== plan.canonicalPath) redirects.push({ from: legacy, to: plan.canonicalPath, entityId: product.id, status: 301 });
    }
    const redirectByFrom = new Map(redirects.map((item) => [item.from, item]));
    const loops = redirects.filter((item) => item.from === item.to);
    const chains = redirects.filter((item) => redirectByFrom.has(item.to));
    const canonicalGroups = new Map(); for (const plan of plans.values()) canonicalGroups.set(plan.canonicalPath, [...(canonicalGroups.get(plan.canonicalPath) || []), plan.id]);
    const globalCollisions = [...canonicalGroups].filter(([, ids]) => new Set(ids).size > 1).map(([canonical, ids]) => ({ canonical, ids }));
    return { plans, baseGroups, redirects, loops, chains, conflicts: [...conflicts, ...globalCollisions], canMaterialize: conflicts.length === 0 && globalCollisions.length === 0 && loops.length === 0 && chains.length === 0 };
}
