import { ProductType } from "../types/product";

function toSlug(value: string): string {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.filter((item) => Boolean(item && item.trim()))));
}

export function getPreferredProductShortcode(product: Partial<ProductType> | null | undefined): string {
    const titleSlug = toSlug(product?.title || "");
    const growerSlug = toSlug(product?.brand?.title || "");

    if (titleSlug && growerSlug) {
        return `${titleSlug}-${growerSlug}`;
    }

    return product?.shortcode || "";
}

export function getAllProductShortcodes(product: Partial<ProductType> | null | undefined): string[] {
    const preferred = getPreferredProductShortcode(product);
    const stored = product?.shortcode || "";
    const legacyShortcodes = product?.legacyShortcodes;
    const legacy = Array.isArray(legacyShortcodes) ? legacyShortcodes : [];

    return unique([preferred, stored, ...legacy]);
}

export function getProductPath(product: Partial<ProductType> | null | undefined): string {
    const code = getPreferredProductShortcode(product) || product?.shortcode || "";
    return `/cannabis/${code}`;
}
