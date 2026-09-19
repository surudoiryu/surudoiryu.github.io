import { SITE_ORIGIN, encodeRoute, publicId } from "./public-model.mjs";
import { publicMediaUrl } from "./public-media-url.mjs";

export { SITE_ORIGIN, encodeRoute, publicId };

const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const clean = (value) => String(value ?? "").trim();
const first = (...values) => values.map(clean).find(Boolean) || "";

function select(field, sourceValue, editorial, seoOverride, generatedValue, seo = false) {
    if (seo && has(seoOverride, field)) return { value: seoOverride[field], owner: "wietinfo-seo-override" };
    if (has(editorial, field)) return { value: editorial[field], owner: "wietinfo-editorial" };
    if (clean(sourceValue)) return { value: sourceValue, owner: "verdiq" };
    return { value: generatedValue, owner: "derived" };
}

function base({ type, sourceId, canonicalPath, legacyPaths, override, source, defaults }) {
    const editorial = override?.editorial || {};
    const seoOverride = override?.seoOverride || {};
    const title = select("title", source.title, editorial, seoOverride, defaults.title);
    const description = select("description", first(source.description, source.shortDescription), editorial, seoOverride, defaults.description);
    const seoTitle = select("title", "", {}, seoOverride, first(editorial.seoTitle, `${title.value} | Wietinfo`), true);
    const seoDescription = select("description", "", {}, seoOverride, first(editorial.seoDescription, description.value, defaults.description).slice(0, 160), true);
    const effectiveCanonical = has(seoOverride, "canonicalPath") ? seoOverride.canonicalPath : canonicalPath;
    const indexable = has(seoOverride, "indexable") ? Boolean(seoOverride.indexable) : true;
    return {
        schemaVersion: 2, entityType: type, publicId: publicId(type, sourceId), sourceSystem: "verdiq", sourceId: String(sourceId),
        canonicalPath, legacyPaths: [...new Set((legacyPaths || []).filter((path) => path && path !== effectiveCanonical))],
        publicationStatus: override?.publicationStatus || "published", source, editorial, seoOverride,
        effective: { ...source, title: title.value, description: description.value, seoTitle: seoTitle.value, seoDescription: seoDescription.value, canonicalPath: effectiveCanonical, indexable },
        provenance: {
            title: { owner: title.owner }, description: { owner: description.owner },
            seoTitle: { owner: seoTitle.owner }, seoDescription: { owner: seoDescription.owner },
        },
    };
}

export function buildProductEntity(sourceId, product, override = {}, relation = {}) {
    const growerName = first(product.brand?.title, relation.growerName, "Onbekende teler");
    const source = {
        title: clean(product.title), description: clean(product.description), shortDescription: clean(product.shortDescription),
        growerName, growerSlug: first(product.brand?.shortcode, relation.growerSlug), type: clean(product.type), productForm: clean(product.productForm || product.categoryName), categoryName: clean(product.categoryName), subCategoryName: clean(product.subCategoryName), variants: (product.variants || product.variations || []).map((item) => ({ name: clean(item.name) })).filter((item) => item.name), aliases: product.aliases || [],
        mediaId: clean(product.mainImageId ?? product.images?.main), image: publicMediaUrl(product.mainImageId ?? product.images?.main), thcMin: product.thcMin ?? null, thcMax: product.thcMax ?? null,
        cbdMin: product.cbdMin ?? null, cbdMax: product.cbdMax ?? null,
    };
    const canonicalPath = `/cannabis/${product.shortcode}`;
    return {
        ...base({ type: "product", sourceId, canonicalPath, legacyPaths: (product.legacyShortcodes || []).map((slug) => `/cannabis/${slug}`), override, source,
            defaults: { title: "Cannabisproduct", description: `${source.title || "Dit product"} van ${growerName}.` } }),
        growerSourceId: relation.growerSourceId || null, growerPublicId: relation.growerSourceId ? publicId("grower", relation.growerSourceId) : null,
        shopPublicIds: relation.shopPublicIds || [], qrPath: `/q/p/${encodeURIComponent(sourceId)}`,
    };
}

export function buildGrowerEntity(sourceId, grower, productPublicIds = [], override = {}) {
    const source = { title: clean(grower.title), description: clean(grower.description), shortDescription: clean(grower.shortDescription), mediaId: clean(grower.logoMediaId ?? grower.images?.logo), image: publicMediaUrl(grower.logoMediaId ?? grower.images?.logo), isApproved: Boolean(grower.isApproved) };
    return { ...base({ type: "grower", sourceId, canonicalPath: `/telers/${grower.shortcode}`, legacyPaths: (grower.legacyShortcodes || []).map((slug) => `/telers/${slug}`), override, source,
        defaults: { title: "Teler", description: source.title ? `Bekijk de producten en informatie van ${source.title}.` : "Bekijk telerinformatie." } }), productPublicIds };
}

export function buildShopEntity(sourceId, shop, productPublicIds = [], growerPublicIds = [], override = {}) {
    const province = clean(shop.province); const source = {
        title: clean(shop.name), description: clean(shop.description), shortDescription: "", image: first(shop.logo, shop.images?.logo), province,
        country: clean(shop.country), openingHours: shop.openingHours || null, address: shop.address || null,
    };
    const provinceSlug = clean(shop.provinceSlug || province).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const canonicalPath = provinceSlug ? `/cannabis-winkel/${provinceSlug}/${shop.shortcode}` : `/cannabis-winkel/${shop.shortcode}`;
    return { ...base({ type: "shop", sourceId, canonicalPath, legacyPaths: (shop.legacyShortcodes || []).map((slug) => `/cannabis-winkel/${slug}`), override, source,
        defaults: { title: "Coffeeshop", description: source.title ? `Bekijk informatie over ${source.title}${province ? ` in ${province}` : ""}.` : "Bekijk coffeeshopinformatie." } }),
        productPublicIds, growerPublicIds, qrPath: `/q/s/${encodeURIComponent(sourceId)}`,
    };
}

export function buildPageEntity(sourceId, page, override = {}) {
    const source = { title: clean(page.title), description: clean(page.description), shortDescription: "", bodyHtml: clean(page.bodyHtml), image: clean(page.image) };
    return base({ type: "page", sourceId, canonicalPath: page.path, legacyPaths: page.legacyPaths || [], override, source,
        defaults: { title: "Wietinfo", description: "Informatie van Wietinfo." } });
}

export function entityRoutes(entity, previousCanonical) {
    const routes = [{ id: encodeRoute(entity.effective.canonicalPath), data: { kind: "entity", entityType: entity.entityType, sourceId: entity.sourceId } }];
    const legacy = [...entity.legacyPaths, entity.canonicalPath !== entity.effective.canonicalPath ? entity.canonicalPath : "", previousCanonical && previousCanonical !== entity.effective.canonicalPath ? previousCanonical : ""];
    [...new Set(legacy.filter(Boolean))].forEach((path) => routes.push({ id: encodeRoute(path), data: { kind: "redirect", destination: entity.effective.canonicalPath, permanent: true } }));
    if (entity.qrPath) routes.push({ id: encodeRoute(entity.qrPath), data: { kind: "redirect", destination: entity.effective.canonicalPath, permanent: false, qr: true } });
    return routes;
}
