import type React from "react";
const MEDIA_ID = /^c[a-z0-9]{24}$/;
export const MEDIA_PLACEHOLDER = "/android-chrome-192x192.png";

/** Only an immutable VerdiQ MediaAsset ID may become a public media URL. */
export function publicVerdiqMediaUrl(mediaId?: string | null): string | null {
    const id = String(mediaId ?? "").trim();
    return MEDIA_ID.test(id) ? `https://media.verdiq.nl/${id}` : null;
}

export function growerLogoUrl(grower?: { logoMediaId?: string | null; images?: { logo?: string | null } } | null): string | null {
    // Pre-migration Brands documents stored Tenant.logoMediaId in images.logo.
    return publicVerdiqMediaUrl(grower?.logoMediaId ?? grower?.images?.logo);
}

export function productMainImageUrl(product?: { mainImageId?: string | null; images?: { main?: string | null } } | null): string | null {
    // Pre-migration Producten documents stored Product.mainImageId in images.main.
    return publicVerdiqMediaUrl(product?.mainImageId ?? product?.images?.main);
}

export function publicMediaSource(mediaId?: string | null): string {
    return publicVerdiqMediaUrl(mediaId) ?? MEDIA_PLACEHOLDER;
}

export function mediaFallback() {
    return (event: React.SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        image.onerror = null;
        image.src = MEDIA_PLACEHOLDER;
    };
}
