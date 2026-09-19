import { ShopType } from "../types/shop";

export function slugifySegment(value: string): string {
    return String(value || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function getShopProvinceSlug(shop: Pick<ShopType, "province">): string {
    return slugifySegment(shop?.province || "");
}

export function buildShopPath(shop: Pick<ShopType, "shortcode" | "province">): string {
    const shopCode = slugifySegment(shop?.shortcode || "");
    const province = getShopProvinceSlug(shop as Pick<ShopType, "province">);

    if (!shopCode) {
        return "/cannabis-winkel";
    }

    if (province) {
        return `/cannabis-winkel/${province}/${shopCode}`;
    }

    return `/cannabis-winkel/${shopCode}`;
}

export function buildProvincePath(province: string): string {
    const provinceSlug = slugifySegment(province);
    return provinceSlug ? `/cannabis-winkel/${provinceSlug}` : "/cannabis-winkel";
}
