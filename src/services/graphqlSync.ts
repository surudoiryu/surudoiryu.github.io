import {
    collection,
    doc,
    serverTimestamp,
    setDoc,
    writeBatch,
} from "firebase/firestore";
import { executeGraphQl } from "../api/graphql.client";
import { graphQlEndpoint } from "../config";
import { shopSeedData } from "../data/shopSeed";
import { db } from "../firebaseConfig";
import { GrowerType } from "../types/grower";
import { ProductEffects, ProductTerpenes, ProductType, ProductVariants } from "../types/product";
import { ShopType } from "../types/shop";

type SyncedProductDocument = Omit<
    ProductType,
    "tastes" | "positiveEffects" | "negativeEffects" | "terpenes"
> & {
    tastes: Array<{ icon: string; name: string }>;
    positiveEffects: Array<{ icon: string; name: string }>;
    negativeEffects: Array<{ icon: string; name: string }>;
    terpenes: Array<{ name: string; mgPerKg: number }>;
    source: "graphql";
    syncedAt: ReturnType<typeof serverTimestamp>;
};

type GraphQlSku = {
    id: string;
    code: string;
    ean?: string | null;
};

type GraphQlVariationTerpene = {
    name: string;
    mgPerKg?: number | null;
};

type GraphQlVariation = {
    id: string;
    name: string;
    weight?: number | null;
    packSize?: number | null;
    mgPerUnit?: number | null;
    terpenes?: GraphQlVariationTerpene[] | null;
    skus?: GraphQlSku[] | null;
};

type GraphQlCannabisInfo = {
    thc?: number | null;
    cbd?: number | null;
    terpenes?: string | null;
    flavorProfile?: string | null;
    positiveEffects?: string | null;
    negativeEffects?: string | null;
    sativaIndicaRatio?: string | null;
};

type GraphQlProduct = {
    id: string;
    name: string;
    tenantId: string;
    categoryId?: string | null;
    subCategoryId?: string | null;
    description?: string | null;
    exclusiveRetailers?: string[] | null;
    mainImageId?: string | null;
    promoImageId?: string | null;
    leafletId?: string | null;
    promoVideoId?: string | null;
    cannabisInfo?: GraphQlCannabisInfo | null;
    variations?: GraphQlVariation[] | null;
};

type ProductsFilteredResponse = {
    productsFiltered: GraphQlProduct[];
};

type ProductsResponse = {
    products: GraphQlProduct[];
};

const PRODUCTS_FILTERED_QUERY = `
query ProductsFiltered($limit: Int, $offset: Int, $sortBy: String, $sortDir: String) {
  productsFiltered(limit: $limit, offset: $offset, sortBy: $sortBy, sortDir: $sortDir) {
    id
    name
    tenantId
    categoryId
    subCategoryId
    description
    exclusiveRetailers
    mainImageId
    promoImageId
    leafletId
    promoVideoId
    cannabisInfo {
      thc
      cbd
      terpenes
      flavorProfile
      positiveEffects
      negativeEffects
      sativaIndicaRatio
    }
    variations {
      id
      name
      weight
      packSize
      mgPerUnit
      terpenes {
        name
        mgPerKg
      }
      skus {
        id
        code
        ean
      }
    }
  }
}
`;

const PRODUCTS_QUERY = `
query Products {
  products {
    id
    name
    tenantId
    categoryId
    subCategoryId
    description
    exclusiveRetailers
    mainImageId
    promoImageId
    leafletId
    promoVideoId
    cannabisInfo {
      thc
      cbd
      terpenes
      flavorProfile
      positiveEffects
      negativeEffects
      sativaIndicaRatio
    }
    variations {
      id
      name
      weight
      packSize
      mgPerUnit
      terpenes {
        name
        mgPerKg
      }
      skus {
        id
        code
        ean
      }
    }
  }
}
`;

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function splitCsv(value?: string | null): string[] {
    if (!value) {
        return [];
    }
    return value
        .split(/[;,|]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function toNumericId(value: string, fallback: number): number {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
        return fallback;
    }
    return Number.parseInt(digits.slice(-8), 10);
}

function inferType(ratio?: string | null): string {
    const normalized = (ratio ?? "").toLowerCase();
    if (normalized.includes("sativa")) {
        return "Sativa";
    }
    if (normalized.includes("indica")) {
        return "Indica";
    }

    const match = normalized.match(/(\d+)\s*[:/-]\s*(\d+)/);
    if (match) {
        const left = Number.parseInt(match[1], 10);
        const right = Number.parseInt(match[2], 10);
        if (left > right + 10) {
            return "Sativa";
        }
        if (right > left + 10) {
            return "Indica";
        }
    }

    return "Hybrid";
}

function inferEnergic(ratio?: string | null): number {
    const normalized = (ratio ?? "").toLowerCase();
    const match = normalized.match(/(\d+)\s*[:/-]\s*(\d+)/);
    if (!match) {
        return 50;
    }

    const left = Number.parseInt(match[1], 10);
    const right = Number.parseInt(match[2], 10);
    const total = left + right;
    if (total === 0) {
        return 50;
    }
    return Math.max(0, Math.min(100, Math.round((left / total) * 100)));
}

function mapProduct(
    source: GraphQlProduct,
    index: number
): SyncedProductDocument {
    const numericId = toNumericId(source.id, index + 1);
    const thc = source.cannabisInfo?.thc ?? 0;
    const cbd = source.cannabisInfo?.cbd ?? 0;
    const energetic = inferEnergic(source.cannabisInfo?.sativaIndicaRatio);
    const relaxing = 100 - energetic;
    const dominantTerpeneName =
        source.variations?.[0]?.terpenes?.[0]?.name ??
        splitCsv(source.cannabisInfo?.terpenes)[0] ??
        "Onbekend";
    const type = inferType(source.cannabisInfo?.sativaIndicaRatio);

    const dominantPositive = splitCsv(source.cannabisInfo?.positiveEffects)[0] ?? "Positief";
    const dominantNegative = splitCsv(source.cannabisInfo?.negativeEffects)[0] ?? "Negatief";

    const grower: GrowerType = {
        id: toNumericId(source.tenantId, numericId),
        title: source.tenantId,
        thumbnailUrl: "",
        description: "",
        shortDescription: "",
        shortcode: toSlug(source.tenantId),
        images: { logo: "", overview: "", close: "", mood: "" },
    };

    const dominantTerpene: ProductTerpenes = {
        id: numericId,
        name: dominantTerpeneName,
        energic: energetic,
        relaxing,
        medical: "",
        effect: type,
        color: type === "Sativa" ? "#2e7d32" : type === "Indica" ? "#1565c0" : "#6d4c41",
    };

    const dominantPositiveEffect: ProductEffects = {
        id: numericId,
        name: dominantPositive,
    };

    const dominantNegativeEffect: ProductEffects = {
        id: numericId,
        name: dominantNegative,
    };

    const variations: ProductVariants[] = (source.variations ?? []).flatMap((variation) => {
        const skus = variation.skus ?? [];
        if (!skus.length) {
            return [
                {
                    id: toNumericId(variation.id, numericId),
                    name: variation.name,
                    ean: "",
                },
            ];
        }

        return skus.map((sku) => ({
            id: toNumericId(sku.id, numericId),
            name: variation.name,
            ean: sku.ean ?? sku.code,
        }));
    });

    return {
        id: numericId,
        shortcode: toSlug(`${source.name}-${source.id}`),
        title: source.name,
        brand: grower,
        grower: grower.id,
        type,
        thumbnailUrl: source.mainImageId ?? "",
        shortDescription: (source.description ?? "").slice(0, 180),
        description: source.description ?? "",
        thcMin: thc,
        thcMax: thc,
        cbdMin: cbd,
        cbdMax: cbd,
        rating: 0,
        images: {
            main: source.mainImageId ?? "",
            close: source.promoImageId ?? "",
            mood: source.promoVideoId ?? "",
        },
        dominantTerpene,
        dominantPositiveEffect,
        dominantNegativeEffect,
        variants: variations,
        tastes: splitCsv(source.cannabisInfo?.flavorProfile).map((name) => ({ icon: "", name })),
        positiveEffects: splitCsv(source.cannabisInfo?.positiveEffects).map((name) => ({
            icon: "",
            name,
        })),
        negativeEffects: splitCsv(source.cannabisInfo?.negativeEffects).map((name) => ({
            icon: "",
            name,
        })),
        terpenes: (source.variations ?? [])
            .flatMap((variation) => variation.terpenes ?? [])
            .map((terpene) => ({
                name: terpene.name,
                mgPerKg: terpene.mgPerKg ?? 0,
            })),
        source: "graphql",
        syncedAt: serverTimestamp(),
    };
}

async function fetchProductsBatch(offset: number, limit: number): Promise<GraphQlProduct[]> {
    const response = await executeGraphQl<
        ProductsFilteredResponse,
        { limit: number; offset: number; sortBy: string; sortDir: string }
    >(PRODUCTS_FILTERED_QUERY, {
        limit,
        offset,
        sortBy: "updatedAt",
        sortDir: "desc",
    });
    return response.productsFiltered ?? [];
}

async function fetchProductsFallback(): Promise<GraphQlProduct[]> {
    const response = await executeGraphQl<ProductsResponse>(PRODUCTS_QUERY);
    return response.products ?? [];
}

async function fetchAllProducts(): Promise<GraphQlProduct[]> {
    const limit = 200;
    let offset = 0;
    const result: GraphQlProduct[] = [];
    const maxLoops = 5;

    try {
        for (let index = 0; index < maxLoops; index += 1) {
            const batch = await fetchProductsBatch(offset, limit);
            result.push(...batch);

            if (batch.length < limit) {
                break;
            }

            offset += limit;
        }
    } catch {
        return fetchProductsFallback();
    }

    if (result.length === 0) {
        return fetchProductsFallback();
    }

    return result;
}

export async function syncGraphQlToFirebase(): Promise<void> {
    if (!navigator.onLine) {
        return;
    }

    if (!graphQlEndpoint) {
        return;
    }

    let products: GraphQlProduct[] = [];
    try {
        products = await fetchAllProducts();
    } catch (error) {
        await setDoc(
            doc(db, "SyncStatus", "graphql"),
            {
                source: "graphql",
                endpoint: graphQlEndpoint,
                status: "error",
                lastError: error instanceof Error ? error.message : "Onbekende GraphQL fout",
                lastFailedSyncAt: serverTimestamp(),
            },
            { merge: true }
        );
        throw error;
    }
    const brandDocs = new Map<string, GrowerType>();
    const shopSeedByName = new Map(
        shopSeedData.map((shop) => [normalizeText(shop.name), shop])
    );
    const shopDocs = new Map<
        string,
        ShopType & { products: number[]; growers: number[]; source: "graphql"; syncedAt: ReturnType<typeof serverTimestamp> }
    >();

    products.forEach((item, index) => {
        const mappedProduct = mapProduct(item, index);
        const brand = mappedProduct.brand;
        brandDocs.set(item.tenantId, brand);

        const retailers = item.exclusiveRetailers ?? [];
        retailers.forEach((retailerName) => {
            const normalizedName = normalizeText(retailerName);
            const seed = shopSeedByName.get(normalizedName);
            const shortcode = seed?.shortcode ?? toSlug(retailerName);
            const existingShop = shopDocs.get(shortcode);

            const baseShop: ShopType = existingShop ?? {
                id: seed?.id ?? toNumericId(shortcode, mappedProduct.id),
                name: retailerName,
                lat: seed?.lat ?? 0,
                lng: seed?.lng ?? 0,
                rating: seed?.rating ?? 0,
                logo: seed?.logo ?? "",
                promo: seed?.promo ?? false,
                pickup: seed?.pickup ?? false,
                drive: seed?.drive ?? false,
                payByCard: seed?.payByCard ?? false,
                easyParking: seed?.easyParking ?? false,
                allowForeigns: seed?.allowForeigns ?? false,
                disabled: seed?.disabled ?? false,
                openFrom: seed?.openFrom ?? "",
                openTill: seed?.openTill ?? "",
                distance: 0,
                shortcode,
                description: seed?.description ?? "",
                growers: [],
                products: [],
            };

            const nextProducts = Array.from(
                new Set([...(baseShop.products ?? []), mappedProduct.id])
            );
            const nextGrowers = Array.from(
                new Set([...(baseShop.growers ?? []), mappedProduct.grower])
            );

            shopDocs.set(shortcode, {
                ...baseShop,
                products: nextProducts,
                growers: nextGrowers,
                source: "graphql",
                syncedAt: serverTimestamp(),
            });
        });
    });

    // 1) Kritiek pad: producten schrijven
    try {
        const productsBatch = writeBatch(db);
        products.forEach((item, index) => {
            const mappedProduct = mapProduct(item, index);
            const productRef = doc(db, "Producten", item.id);
            productsBatch.set(productRef, mappedProduct, { merge: true });
        });
        await productsBatch.commit();
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Onbekende Firestore fout bij Producten.";
        throw new Error(
            `GraphQL data opgehaald, maar schrijven naar Firestore Producten mislukt: ${message}`
        );
    }

    // 2) Niet-kritiek: brands en shops schrijven (best effort)
    try {
        const metaBatch = writeBatch(db);
        brandDocs.forEach((brand, tenantId) => {
            const brandRef = doc(collection(db, "Brands"), tenantId);
            metaBatch.set(
                brandRef,
                {
                    ...brand,
                    source: "graphql",
                    syncedAt: serverTimestamp(),
                },
                { merge: true }
            );
        });

        shopDocs.forEach((shop, shortcode) => {
            const shopRef = doc(collection(db, "Shops"), shortcode);
            metaBatch.set(shopRef, shop, { merge: true });
        });

        await metaBatch.commit();
    } catch (error) {
        console.warn("Brands/Shops sync overgeslagen door permissies of rules.", error);
    }

    // 3) Syncstatus schrijven (best effort)
    try {
        await setDoc(
            doc(db, "SyncStatus", "graphql"),
            {
                source: "graphql",
                endpoint: graphQlEndpoint,
                syncedProducts: products.length,
                syncedShops: shopDocs.size,
                syncedGrowers: brandDocs.size,
                lastSuccessfulSyncAt: serverTimestamp(),
                status: "connected",
            },
            { merge: true }
        );
    } catch (error) {
        console.warn("SyncStatus kon niet geschreven worden.", error);
    }
}
