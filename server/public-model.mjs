import { publicMediaUrl } from "./public-media-url.mjs";

export const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "https://weedinfo.nl";

export function encodeRoute(pathname) {
    return encodeURIComponent(pathname);
}

export function publicId(type, sourceId) {
    return `verdiq:${type}:${sourceId}`;
}

export function effectiveValue(sourceValue, override, key) {
    return Object.prototype.hasOwnProperty.call(override || {}, key)
        ? override[key]
        : sourceValue;
}

export function buildProductReadModel(sourceId, product, override = {}) {
    const id = publicId("product", sourceId);
    const canonicalPath = `/cannabis/${product.shortcode}`;
    const editorial = override.editorial || {};
    const seoOverride = override.seoOverride || {};
    const description = effectiveValue(product.description || product.shortDescription || "", editorial, "description");
    const title = effectiveValue(product.title, editorial, "title");
    const growerName = product.brand?.title || "Onbekende teler";
    const generatedSeoTitle = `${title} van ${growerName} | Wietinfo`;
    const generatedSeoDescription = String(description || `${title} van ${growerName}: productinformatie, kenmerken en reviews.`).slice(0, 160);

    return {
        schemaVersion: 1,
        entityType: "product",
        publicId: id,
        sourceSystem: "verdiq",
        sourceId: String(sourceId),
        growerPublicId: product.brand?.sourceId
            ? publicId("grower", product.brand.sourceId)
            : product.growerPublicId || null,
        canonicalPath,
        legacyPaths: (product.legacyShortcodes || []).map((slug) => `/cannabis/${slug}`),
        qrPath: `/q/p/${encodeURIComponent(sourceId)}`,
        publicationStatus: "published",
        source: {
            title: product.title,
            description: product.description || "",
            shortDescription: product.shortDescription || "",
            growerName,
            growerSlug: product.brand?.shortcode || "",
            type: product.type || "",
            thcMin: product.thcMin ?? null,
            thcMax: product.thcMax ?? null,
            cbdMin: product.cbdMin ?? null,
            cbdMax: product.cbdMax ?? null,
            mediaId: String(product.mainImageId ?? product.images?.main ?? ""),
            image: publicMediaUrl(product.mainImageId ?? product.images?.main),
        },
        editorial,
        seoOverride,
        effective: {
            title,
            description,
            growerName,
            growerSlug: product.brand?.shortcode || "",
            type: product.type || "",
            mediaId: String(product.mainImageId ?? product.images?.main ?? ""),
            image: publicMediaUrl(product.mainImageId ?? product.images?.main),
            seoTitle: effectiveValue(generatedSeoTitle, seoOverride, "title"),
            seoDescription: effectiveValue(generatedSeoDescription, seoOverride, "description"),
            canonicalPath: effectiveValue(canonicalPath, seoOverride, "canonicalPath"),
            indexable: effectiveValue(true, seoOverride, "indexable"),
        },
        provenance: {
            title: { owner: Object.prototype.hasOwnProperty.call(editorial, "title") ? "wietinfo-editorial" : "verdiq", sourceField: "product.name" },
            description: { owner: Object.prototype.hasOwnProperty.call(editorial, "description") ? "wietinfo-editorial" : "verdiq", sourceField: "product.description" },
            seoTitle: { owner: Object.prototype.hasOwnProperty.call(seoOverride, "title") ? "wietinfo-seo-override" : "derived" },
            seoDescription: { owner: Object.prototype.hasOwnProperty.call(seoOverride, "description") ? "wietinfo-seo-override" : "derived" },
        },
    };
}

export function buildGrowerReadModel(sourceId, grower, productIds = [], override = {}) {
    const id = publicId("grower", sourceId);
    const canonicalPath = `/telers/${grower.shortcode}`;
    const editorial = override.editorial || {};
    const seoOverride = override.seoOverride || {};
    const title = effectiveValue(grower.title, editorial, "title");
    const description = effectiveValue(grower.description || grower.shortDescription || "", editorial, "description");
    const generatedSeoTitle = `${title}: producten en informatie | Wietinfo`;
    const generatedSeoDescription = String(description || `Bekijk ${title}, de producten van deze teler en consumentenreviews op Wietinfo.`).slice(0, 160);

    return {
        schemaVersion: 1,
        entityType: "grower",
        publicId: id,
        sourceSystem: "verdiq",
        sourceId: String(sourceId),
        canonicalPath,
        legacyPaths: [],
        publicationStatus: "published",
        productPublicIds: productIds,
        source: {
            title: grower.title,
            description: grower.description || "",
            shortDescription: grower.shortDescription || "",
            mediaId: String(grower.logoMediaId ?? grower.images?.logo ?? ""),
            image: publicMediaUrl(grower.logoMediaId ?? grower.images?.logo),
            isApproved: Boolean(grower.isApproved),
        },
        editorial,
        seoOverride,
        effective: {
            title,
            description,
            mediaId: String(grower.logoMediaId ?? grower.images?.logo ?? ""),
            image: publicMediaUrl(grower.logoMediaId ?? grower.images?.logo),
            seoTitle: effectiveValue(generatedSeoTitle, seoOverride, "title"),
            seoDescription: effectiveValue(generatedSeoDescription, seoOverride, "description"),
            canonicalPath: effectiveValue(canonicalPath, seoOverride, "canonicalPath"),
            indexable: effectiveValue(true, seoOverride, "indexable"),
        },
        provenance: {
            title: { owner: Object.prototype.hasOwnProperty.call(editorial, "title") ? "wietinfo-editorial" : "verdiq", sourceField: "tenant.businessName" },
            description: { owner: Object.prototype.hasOwnProperty.call(editorial, "description") ? "wietinfo-editorial" : "verdiq", sourceField: "tenant.shortDescription" },
            seoTitle: { owner: Object.prototype.hasOwnProperty.call(seoOverride, "title") ? "wietinfo-seo-override" : "derived" },
            seoDescription: { owner: Object.prototype.hasOwnProperty.call(seoOverride, "description") ? "wietinfo-seo-override" : "derived" },
        },
    };
}
