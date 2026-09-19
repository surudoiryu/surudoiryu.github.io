import { ProductType } from "../types/product";
import { ProductReview } from "../types/user";
import { getAllProductShortcodes } from "./productSlug";

type ReviewStats = {
    sum: number;
    count: number;
};

export type ProductReviewStat = {
    count: number;
    rating: number;
};

export function buildProductAliasMap(products: ProductType[]): Map<string, string> {
    const aliasToCanonical = new Map<string, string>();

    products.forEach((product) => {
        const canonical = product.shortcode;
        if (!canonical) return;
        const aliases = getAllProductShortcodes(product);
        aliases.forEach((code) => {
            if (code) aliasToCanonical.set(code, canonical);
        });
        aliasToCanonical.set(canonical, canonical);
    });

    return aliasToCanonical;
}

export function aggregateProductReviewStats(
    reviews: ProductReview[],
    products: ProductType[]
): Record<string, ProductReviewStat> {
    const aliasMap = buildProductAliasMap(products);
    const grouped: Record<string, ReviewStats> = {};

    reviews.forEach((review) => {
        const rawCode = review.productShortcode || "";
        if (!rawCode) return;
        const code = aliasMap.get(rawCode) || rawCode;
        if (!grouped[code]) {
            grouped[code] = { sum: 0, count: 0 };
        }
        grouped[code].sum += Number(review.rating || 0);
        grouped[code].count += 1;
    });

    const normalized: Record<string, ProductReviewStat> = {};
    Object.entries(grouped).forEach(([code, value]) => {
        normalized[code] = {
            count: value.count,
            rating: value.count ? Math.min(5, Math.max(0, Math.ceil(value.sum / value.count))) : 0,
        };
    });
    return normalized;
}
