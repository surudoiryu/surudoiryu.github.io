/**
 * GraphQL -> Firestore catalog sync worker
 *
 * Run:
 *   npm run sync:catalog
 *
 * Required env:
 *   GRAPHQL_ENDPOINT (or REACT_APP_GRAPHQL_ENDPOINT)
 *   GRAPHQL_AUTH_TOKEN (optional)
 *   GRAPHQL_API_KEY (optional)
 *
 * Firebase Admin auth:
 *   - Preferred: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   - Or env trio:
 *       FIREBASE_PROJECT_ID
 *       FIREBASE_CLIENT_EMAIL
 *       FIREBASE_PRIVATE_KEY
 */

import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const TENANTS_QUERY = `
query TenantsForCatalogSync {
  tenants {
    id
    businessName
    type
    companyAddress
    logoMediaId
    isApproved
    vendorGLN
    billingEmail
    ordersEmail
    createdAt
    updatedAt
  }
}
`;
const SYSTEM_DATA_QUERY = `
query SystemData {
  terpenes { id name description }
  flavors { id name description }
  effects { id name description positive }
  categories { id name description vat { id name rate note } }
  subCategories { id name description categoryId }
}
`;

const GROWER_QUERY_CANDIDATES = [
    {
        name: "tenants:businessName-type",
        query: `
query TenantsForFrontend {
  tenants {
    id
    businessName
    type
    companyAddress
    logoMediaId
  }
}
`,
        pick: (data) => data?.tenants,
    },
    {
        name: "tenants:id-title",
        query: `
query GrowersTenantsTitle {
  tenants {
    id
    title
    description
  }
}
`,
        pick: (data) => data?.tenants,
    },
    {
        name: "growers:id-name",
        query: `
query GrowersByName {
  growers {
    id
    name
    description
  }
}
`,
        pick: (data) => data?.growers,
    },
    {
        name: "brands:id-name",
        query: `
query BrandsByName {
  brands {
    id
    name
    description
  }
}
`,
        pick: (data) => data?.brands,
    },
];

const SHOP_QUERY_CANDIDATES = [
    {
        name: "tenants:businessName-type",
        query: `
query TenantsForShops {
  tenants {
    id
    businessName
    type
    companyAddress
    logoMediaId
  }
}
`,
        pick: (data) => data?.tenants,
    },
    {
        name: "shops:id-name",
        query: `
query ShopsByName {
  shops {
    id
    name
    latitude
    longitude
    rating
    description
  }
}
`,
        pick: (data) => data?.shops,
    },
    {
        name: "retailers:id-name",
        query: `
query RetailersByName {
  retailers {
    id
    name
    latitude
    longitude
    rating
    description
  }
}
`,
        pick: (data) => data?.retailers,
    },
    {
        name: "stores:id-name",
        query: `
query StoresByName {
  stores {
    id
    name
    latitude
    longitude
    rating
    description
  }
}
`,
        pick: (data) => data?.stores,
    },
];

const shopSeedData = [
    { name: "John & Co. Hellevoetsluis", shortcode: "john-en-co-hellevoetsluis", lat: 51.83917, lng: 4.17, rating: 4.8 },
    { name: "Barbershop", shortcode: "barbershop", lat: 51.82278, lng: 4.13025, rating: 4.0 },
    { name: "Quasi", shortcode: "quasi", lat: 51.92155, lng: 4.24691, rating: 4.3 },
    { name: "Horizon", shortcode: "horizon", lat: 52.15388, lng: 5.538677, rating: 4.2 },
    { name: "Take a Break BV", shortcode: "take-a-break-bv", lat: 52.17823, lng: 5.41412, rating: 4.6 },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseEnvFile(content) {
    const result = {};
    const lines = content.split(/\r?\n/g);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separatorIndex = line.indexOf("=");
        if (separatorIndex < 1) continue;

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

function loadEnvFile(relativePath) {
    const fullPath = path.resolve(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, "utf8");
    const envValues = parseEnvFile(content);

    Object.entries(envValues).forEach(([key, value]) => {
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
}

loadEnvFile(".env.worker");
loadEnvFile(".env");

const resolvedEndpoint = (
    process.env.GRAPHQL_ENDPOINT ||
    process.env.REACT_APP_GRAPHQL_ENDPOINT ||
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
    ""
).trim();

const endpoint = resolvedEndpoint || "http://localhost:4000/graphql";
if (!resolvedEndpoint) {
    console.warn("[catalog-sync-worker] Geen GRAPHQL_ENDPOINT gevonden; fallback naar http://localhost:4000/graphql");
}

const authToken = (
    process.env.GRAPHQL_AUTH_TOKEN ||
    process.env.REACT_APP_GRAPHQL_AUTH_TOKEN ||
    ""
).trim();

const apiKey = (
    process.env.GRAPHQL_API_KEY ||
    process.env.REACT_APP_GRAPHQL_API_KEY ||
    ""
).trim();

function normalizeText(value) {
    return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function toSlug(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toNumericId(value, fallback) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) {
        return fallback;
    }
    return Number.parseInt(digits.slice(-8), 10);
}

function splitCsv(value) {
    if (!value) {
        return [];
    }
    return String(value)
        .split(/[;,|]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function firstNonEmptyString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
}

function tenantTypeOf(value) {
    return firstNonEmptyString(value).toLowerCase();
}

function isGrowerTenant(value) {
    const type = tenantTypeOf(value);
    return type === "teler" || type === "grower" || type === "kweker";
}

function isShopTenant(value) {
    const type = tenantTypeOf(value);
    return type === "winkel" || type === "shop" || type === "store" || type === "retailer";
}

function inferType(ratio) {
    const normalized = String(ratio || "").toLowerCase();
    if (normalized.includes("sativa")) return "Sativa";
    if (normalized.includes("indica")) return "Indica";
    return "Hybrid";
}

function inferEnergic(ratio) {
    const normalized = String(ratio || "").toLowerCase();
    const match = normalized.match(/(\d+)\s*[:/-]\s*(\d+)/);
    if (!match) return 50;
    const left = Number.parseInt(match[1], 10);
    const right = Number.parseInt(match[2], 10);
    const total = left + right;
    if (!total) return 50;
    return Math.max(0, Math.min(100, Math.round((left / total) * 100)));
}

function buildHeaderVariants() {
    const base = { "Content-Type": "application/json" };
    const variants = [];

    if (authToken && apiKey) {
        variants.push({ ...base, Authorization: `Bearer ${authToken}`, "x-api-key": apiKey });
        variants.push({ ...base, Authorization: `Bearer ${authToken}` });
        variants.push({ ...base, "x-api-key": apiKey });
    } else if (authToken) {
        variants.push({ ...base, Authorization: `Bearer ${authToken}` });
    } else if (apiKey) {
        variants.push({ ...base, "x-api-key": apiKey });
    }

    variants.push(base);
    return variants;
}

async function executeGraphQlOnce(query, variables, headers) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const errorMessage = Array.isArray(payload?.errors)
            ? payload.errors.map((item) => item?.message).filter(Boolean).join(", ")
            : "";
        throw new Error(errorMessage || `GraphQL request mislukt (${response.status})`);
    }

    if (payload.errors?.length) {
        throw new Error(payload.errors.map((item) => item.message).join(", "));
    }
    return payload.data || {};
}

async function executeGraphQl(query, variables) {
    const variants = buildHeaderVariants();
    let lastError = null;

    for (const headers of variants) {
        try {
            return await executeGraphQlOnce(query, variables, headers);
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            const hasApiKey = Object.prototype.hasOwnProperty.call(headers, "x-api-key");
            if (hasApiKey && message.includes("invalid api key")) {
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error("GraphQL request mislukt.");
}

async function executeFirstSuccessfulArray(candidates) {
    const reasons = [];

    for (const candidate of candidates) {
        try {
            const data = await executeGraphQl(candidate.query);
            const picked = candidate.pick(data);
            if (Array.isArray(picked)) {
                return { items: picked, reasons };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            reasons.push(`${candidate.name}: ${message}`);
        }
    }

    return { items: [], reasons };
}
async function fetchTenants() {
    try {
        const data = await executeGraphQl(TENANTS_QUERY);
        return safeArray(data?.tenants);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[catalog-sync-worker] tenants query overgeslagen: ${message}`);
        return [];
    }
}
async function fetchSystemData() {
    try {
        const data = await executeGraphQl(SYSTEM_DATA_QUERY);
        return {
            terpenes: safeArray(data?.terpenes),
            flavors: safeArray(data?.flavors),
            effects: safeArray(data?.effects),
            categories: safeArray(data?.categories),
            subCategories: safeArray(data?.subCategories),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[catalog-sync-worker] systemdata query overgeslagen: ${message}`);
        return {
            terpenes: [],
            flavors: [],
            effects: [],
            categories: [],
            subCategories: [],
        };
    }
}

function buildSystemSyncOperations(firestore, systemData) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const operations = [];

    safeArray(systemData.terpenes).forEach((item, index) => {
        const name = firstNonEmptyString(item?.name, `Terpene-${index + 1}`);
        const docId = firstNonEmptyString(item?.id, toSlug(name), `terpene-${index + 1}`);
        operations.push({
            ref: firestore.collection("Terpenes").doc(docId),
            data: {
                id: toNumericId(item?.id, index + 1),
                sourceId: firstNonEmptyString(item?.id),
                name,
                description: firstNonEmptyString(item?.description),
                icon: "",
                color: "#6d4c41",
                effect: "",
                medical: "",
                energic: 50,
                relaxing: 50,
                source: "graphql",
                syncedAt: now,
            },
        });
    });

    safeArray(systemData.flavors).forEach((item, index) => {
        const name = firstNonEmptyString(item?.name, `Smaak-${index + 1}`);
        const docId = firstNonEmptyString(item?.id, toSlug(name), `taste-${index + 1}`);
        operations.push({
            ref: firestore.collection("Tastes").doc(docId),
            data: {
                id: toNumericId(item?.id, index + 1),
                sourceId: firstNonEmptyString(item?.id),
                name,
                description: firstNonEmptyString(item?.description),
                icon: "",
                source: "graphql",
                syncedAt: now,
            },
        });
    });

    safeArray(systemData.effects).forEach((item, index) => {
        const name = firstNonEmptyString(item?.name, `Effect-${index + 1}`);
        const docId = firstNonEmptyString(item?.id, toSlug(name), `effect-${index + 1}`);
        operations.push({
            ref: firestore.collection("Effects").doc(docId),
            data: {
                id: toNumericId(item?.id, index + 1),
                sourceId: firstNonEmptyString(item?.id),
                name,
                description: firstNonEmptyString(item?.description),
                positive: Boolean(item?.positive),
                icon: "",
                source: "graphql",
                syncedAt: now,
            },
        });
    });

    safeArray(systemData.categories).forEach((item, index) => {
        const name = firstNonEmptyString(item?.name, `Categorie-${index + 1}`);
        const docId = firstNonEmptyString(item?.id, toSlug(name), `category-${index + 1}`);
        const vat = item?.vat || {};
        operations.push({
            ref: firestore.collection("Categories").doc(docId),
            data: {
                id: firstNonEmptyString(item?.id, docId),
                name,
                description: firstNonEmptyString(item?.description),
                vat: {
                    id: firstNonEmptyString(vat?.id),
                    name: firstNonEmptyString(vat?.name),
                    rate: Number(vat?.rate || 0),
                    note: firstNonEmptyString(vat?.note),
                },
                source: "graphql",
                syncedAt: now,
            },
        });
    });

    safeArray(systemData.subCategories).forEach((item, index) => {
        const name = firstNonEmptyString(item?.name, `SubCategorie-${index + 1}`);
        const docId = firstNonEmptyString(item?.id, toSlug(name), `subcategory-${index + 1}`);
        operations.push({
            ref: firestore.collection("SubCategories").doc(docId),
            data: {
                id: firstNonEmptyString(item?.id, docId),
                name,
                description: firstNonEmptyString(item?.description),
                categoryId: firstNonEmptyString(item?.categoryId),
                source: "graphql",
                syncedAt: now,
            },
        });
    });

    return {
        operations,
        counts: {
            terpenes: safeArray(systemData.terpenes).length,
            tastes: safeArray(systemData.flavors).length,
            effects: safeArray(systemData.effects).length,
            categories: safeArray(systemData.categories).length,
            subCategories: safeArray(systemData.subCategories).length,
        },
    };
}

function toGrowerDocument(source, fallbackName, fallbackNumericId) {
    const sourceId = firstNonEmptyString(source?.id, source?.tenantId, fallbackName);
    const title = firstNonEmptyString(source?.businessName, source?.name, source?.title, source?.displayName, fallbackName, sourceId);
    const image = firstNonEmptyString(source?.logoMediaId, source?.thumbnailUrl, source?.logoUrl, source?.logoImageId, source?.imageUrl);

    return {
        sourceId,
        data: {
            id: toNumericId(sourceId, fallbackNumericId),
            title,
            thumbnailUrl: image,
            description: firstNonEmptyString(source?.description, source?.companyAddress),
            shortDescription: firstNonEmptyString(source?.shortDescription, source?.description, source?.companyAddress).slice(0, 180),
            shortcode: toSlug(title || sourceId),
            images: {
                logo: image,
                overview: firstNonEmptyString(source?.overviewImageUrl, image),
                close: firstNonEmptyString(source?.closeImageUrl),
                mood: firstNonEmptyString(source?.moodImageUrl),
            },
        },
    };
}

function toShopDocument(source, fallbackName, fallbackNumericId, seed) {
    const name = firstNonEmptyString(source?.businessName, source?.name, source?.title, source?.displayName, fallbackName);
    const sourceId = firstNonEmptyString(source?.id, source?.retailerId, name);
    const latRaw = source?.lat ?? source?.latitude;
    const lngRaw = source?.lng ?? source?.longitude;
    const lat = Number.isFinite(Number(latRaw)) ? Number(latRaw) : (seed?.lat ?? 0);
    const lng = Number.isFinite(Number(lngRaw)) ? Number(lngRaw) : (seed?.lng ?? 0);
    const shortcode = seed?.shortcode || toSlug(name || sourceId || String(fallbackNumericId));

    return {
        sourceId,
        data: {
            id: seed?.id || toNumericId(sourceId || shortcode, fallbackNumericId),
            name: name || shortcode,
            lat,
            lng,
            rating: Number.isFinite(Number(source?.rating)) ? Number(source.rating) : (seed?.rating || 0),
            logo: firstNonEmptyString(source?.logoMediaId, source?.logo, source?.logoUrl),
            promo: Boolean(source?.promo ?? seed?.promo ?? false),
            pickup: Boolean(source?.pickup ?? seed?.pickup ?? false),
            drive: Boolean(source?.drive ?? seed?.drive ?? false),
            payByCard: Boolean(source?.payByCard ?? seed?.payByCard ?? false),
            easyParking: Boolean(source?.easyParking ?? seed?.easyParking ?? false),
            allowForeigns: Boolean(source?.allowForeigns ?? seed?.allowForeigns ?? false),
            disabled: Boolean(source?.disabled ?? seed?.disabled ?? false),
            openFrom: firstNonEmptyString(source?.openFrom, seed?.openFrom),
            openTill: firstNonEmptyString(source?.openTill, seed?.openTill),
            distance: 0,
            shortcode,
            description: firstNonEmptyString(source?.description, source?.companyAddress, seed?.description),
            products: [],
            growers: [],
            source: "graphql",
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
    };
}

async function fetchGrowers() {
    const { items, reasons } = await executeFirstSuccessfulArray(GROWER_QUERY_CANDIDATES);
    if (!items.length && reasons.length) {
        console.warn(`[catalog-sync-worker] Geen teler-query beschikbaar; fallback op products. ${reasons[0]}`);
    }

    return safeArray(items)
        .filter((item) => {
            const type = item?.type;
            if (!type) return true;
            return isGrowerTenant(type);
        })
        .map((item, index) => {
            const fallbackName = firstNonEmptyString(item?.businessName, item?.name, item?.title, item?.displayName, `grower-${index + 1}`);
            return toGrowerDocument(item, fallbackName, index + 1);
        })
        .filter((item) => item.sourceId || item.data.title);
}

async function fetchShops(shopSeedByName) {
    const { items, reasons } = await executeFirstSuccessfulArray(SHOP_QUERY_CANDIDATES);
    if (!items.length && reasons.length) {
        console.warn(`[catalog-sync-worker] Geen winkel-query beschikbaar; fallback op exclusiveRetailers. ${reasons[0]}`);
    }

    return safeArray(items)
        .filter((item) => {
            const type = item?.type;
            if (!type) return true;
            return isShopTenant(type);
        })
        .map((item, index) => {
            const name = firstNonEmptyString(item?.businessName, item?.name, item?.title, item?.displayName);
            const seed = shopSeedByName.get(normalizeText(name));
            return toShopDocument(item, name, index + 1, seed);
        })
        .filter((item) => item.data.shortcode);
}

async function fetchAllProducts() {
    const limit = 200;
    const maxLoops = 10;
    const items = [];
    let offset = 0;

    try {
        for (let index = 0; index < maxLoops; index += 1) {
            const data = await executeGraphQl(PRODUCTS_FILTERED_QUERY, {
                limit,
                offset,
                sortBy: "updatedAt",
                sortDir: "desc",
            });
            const batch = data.productsFiltered || [];
            items.push(...batch);
            if (batch.length < limit) break;
            offset += limit;
        }
    } catch {
        const data = await executeGraphQl(PRODUCTS_QUERY);
        return data.products || [];
    }

    if (!items.length) {
        const data = await executeGraphQl(PRODUCTS_QUERY);
        return data.products || [];
    }

    return items;
}

function mapProduct(source, index, growersBySourceId, growersByName) {
    const numericId = toNumericId(source.id, index + 1);
    const thc = Number(source?.cannabisInfo?.thc || 0);
    const cbd = Math.max(0, Number(source?.cannabisInfo?.cbd || 0));
    const energetic = inferEnergic(source?.cannabisInfo?.sativaIndicaRatio);
    const relaxing = 100 - energetic;
    const type = inferType(source?.cannabisInfo?.sativaIndicaRatio);
    const dominantTerpeneName =
        source?.variations?.[0]?.terpenes?.[0]?.name ||
        splitCsv(source?.cannabisInfo?.terpenes)[0] ||
        "Onbekend";
    const dominantPositive = splitCsv(source?.cannabisInfo?.positiveEffects)[0] || "Positief";
    const dominantNegative = splitCsv(source?.cannabisInfo?.negativeEffects)[0] || "Negatief";

    const defaultGrower = {
        id: toNumericId(source.tenantId, numericId),
        title: source.tenantId,
        thumbnailUrl: "",
        description: "",
        shortDescription: "",
        shortcode: toSlug(source.tenantId),
        images: { logo: "", overview: "", close: "", mood: "" },
    };

    const resolvedGrower =
        growersBySourceId.get(source.tenantId) ||
        growersByName.get(normalizeText(source.tenantId)) ||
        defaultGrower;

    const variations = (source.variations || []).flatMap((variation) => {
        const skus = variation.skus || [];
        if (!skus.length) {
            return [{ id: toNumericId(variation.id, numericId), name: variation.name, ean: "" }];
        }
        return skus.map((sku) => ({
            id: toNumericId(sku.id, numericId),
            name: variation.name,
            ean: sku.ean || sku.code || "",
        }));
    });

    return {
        id: numericId,
        shortcode: toSlug(`${source.name}-${source.id}`),
        title: source.name,
        brand: resolvedGrower,
        grower: resolvedGrower.id,
        type,
        thumbnailUrl: source.mainImageId || "",
        shortDescription: String(source.description || "").slice(0, 180),
        description: source.description || "",
        thcMin: thc,
        thcMax: thc,
        cbdMin: cbd,
        cbdMax: cbd,
        rating: 0,
        images: {
            main: source.mainImageId || "",
            close: source.promoImageId || "",
            mood: source.promoVideoId || "",
        },
        dominantTerpene: {
            id: numericId,
            name: dominantTerpeneName,
            energic: energetic,
            relaxing,
            medical: "",
            effect: type,
            color: type === "Sativa" ? "#2e7d32" : type === "Indica" ? "#1565c0" : "#6d4c41",
        },
        dominantPositiveEffect: { id: numericId, name: dominantPositive },
        dominantNegativeEffect: { id: numericId, name: dominantNegative },
        variants: variations,
        tastes: splitCsv(source?.cannabisInfo?.flavorProfile).map((name) => ({ icon: "", name })),
        positiveEffects: splitCsv(source?.cannabisInfo?.positiveEffects).map((name) => ({ icon: "", name })),
        negativeEffects: splitCsv(source?.cannabisInfo?.negativeEffects).map((name) => ({ icon: "", name })),
        terpenes: (source.variations || [])
            .flatMap((variation) => variation.terpenes || [])
            .map((terpene) => ({ name: terpene.name, mgPerKg: Number(terpene.mgPerKg || 0) })),
        source: "graphql",
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}
function initFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.app();
    }

    const projectId = (
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        process.env.REACT_APP_FIREBASE_PROJECT_ID ||
        ""
    ).trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;
    const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

    if (projectId && clientEmail && privateKey) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }

    if (firestoreEmulatorHost && projectId) {
        return admin.initializeApp({ projectId });
    }

    if (!projectId) {
        throw new Error(
            [
                "Firebase project-id ontbreekt voor de worker.",
                "Zet FIREBASE_PROJECT_ID (of REACT_APP_FIREBASE_PROJECT_ID) in .env/.env.worker.",
            ].join(" ")
        );
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            [
                "Firebase Admin credentials ontbreken voor catalog-sync-worker.",
                "Gebruik een service account via GOOGLE_APPLICATION_CREDENTIALS=/pad/naar/service-account.json",
                "of zet FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env.worker.",
                "Alleen REACT_APP_FIREBASE_* is niet voldoende voor server-side writes.",
                "Voor lokaal testen kan ook FIRESTORE_EMULATOR_HOST met project-id gebruikt worden.",
            ].join(" ")
        );
    }

    return admin.initializeApp({
        projectId,
        credential: admin.credential.applicationDefault(),
    });
}

async function commitInChunks(firestore, operations, chunkSize = 450) {
    for (let index = 0; index < operations.length; index += chunkSize) {
        const chunk = operations.slice(index, index + chunkSize);
        const batch = firestore.batch();
        chunk.forEach((op) => {
            batch.set(op.ref, op.data, { merge: true });
        });
        await batch.commit();
    }
}

async function run() {
    initFirebaseAdmin();
    const firestore = admin.firestore();
    const products = await fetchAllProducts();
    const systemData = await fetchSystemData();

    const brandDocs = new Map();
    const shopDocs = new Map();
    const shopSeedByName = new Map(shopSeedData.map((item) => [normalizeText(item.name), item]));
    const productOps = [];

    const tenants = await fetchTenants();

    const tenantGrowers = safeArray(tenants)
        .filter((item) => isGrowerTenant(item?.type))
        .map((item, index) => {
            const fallbackName = firstNonEmptyString(item?.businessName, item?.name, item?.title, item?.displayName, `grower-${index + 1}`);
            return toGrowerDocument(item, fallbackName, index + 1);
        })
        .filter((item) => item.sourceId || item.data.title);

    const tenantShops = safeArray(tenants)
        .filter((item) => isShopTenant(item?.type))
        .map((item, index) => {
            const name = firstNonEmptyString(item?.businessName, item?.name, item?.title, item?.displayName);
            const seed = shopSeedByName.get(normalizeText(name));
            return toShopDocument(item, name, index + 1, seed);
        })
        .filter((item) => item.data.shortcode);

    const fetchedGrowers = tenantGrowers.length ? tenantGrowers : await fetchGrowers();
    const fetchedShops = tenantShops.length ? tenantShops : await fetchShops(shopSeedByName);

    const growersBySourceId = new Map();
    const growersByName = new Map();

    fetchedGrowers.forEach((entry) => {
        growersBySourceId.set(entry.sourceId, entry.data);
        growersByName.set(normalizeText(entry.data.title), entry.data);
        brandDocs.set(entry.sourceId, {
            ...entry.data,
            source: "graphql",
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    const shopsByName = new Map();
    fetchedShops.forEach((entry) => {
        shopDocs.set(entry.data.shortcode, entry.data);
        shopsByName.set(normalizeText(entry.data.name), entry.data.shortcode);
    });

    products.forEach((product, index) => {
        const mapped = mapProduct(product, index, growersBySourceId, growersByName);
        productOps.push({
            ref: firestore.collection("Producten").doc(product.id),
            data: mapped,
        });

        brandDocs.set(product.tenantId, {
            ...mapped.brand,
            source: "graphql",
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        (product.exclusiveRetailers || []).forEach((retailer) => {
            const normalizedRetailer = normalizeText(retailer);
            const seed = shopSeedByName.get(normalizedRetailer);
            const existingShortcode = shopsByName.get(normalizedRetailer);
            const shortcode = existingShortcode || seed?.shortcode || toSlug(retailer);
            const existing = shopDocs.get(shortcode) || {
                id: seed?.id || toNumericId(shortcode, mapped.id),
                name: retailer,
                lat: seed?.lat || 0,
                lng: seed?.lng || 0,
                rating: seed?.rating || 0,
                logo: "",
                promo: false,
                pickup: false,
                drive: false,
                payByCard: false,
                easyParking: false,
                allowForeigns: false,
                disabled: false,
                openFrom: "",
                openTill: "",
                distance: 0,
                shortcode,
                description: "",
                products: [],
                growers: [],
                source: "graphql",
                syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            existing.products = Array.from(new Set([...(existing.products || []), mapped.id]));
            existing.growers = Array.from(new Set([...(existing.growers || []), mapped.grower]));
            existing.syncedAt = admin.firestore.FieldValue.serverTimestamp();
            shopDocs.set(shortcode, existing);
            shopsByName.set(normalizedRetailer, shortcode);
        });
    });

    await commitInChunks(firestore, productOps);

    const metaOps = [];
    brandDocs.forEach((brand, tenantId) => {
        metaOps.push({ ref: firestore.collection("Brands").doc(tenantId), data: brand });
    });
    shopDocs.forEach((shop, shortcode) => {
        metaOps.push({ ref: firestore.collection("Shops").doc(shortcode), data: shop });
    });
    if (metaOps.length) {
        await commitInChunks(firestore, metaOps);
    }

    const systemSync = buildSystemSyncOperations(firestore, systemData);
    if (systemSync.operations.length) {
        await commitInChunks(firestore, systemSync.operations);
    }

    await firestore.collection("SyncStatus").doc("graphql").set(
        {
            source: "graphql",
            endpoint,
            status: "connected",
            syncedProducts: products.length,
            syncedShops: shopDocs.size,
            syncedGrowers: brandDocs.size,
            syncedTerpenes: systemSync.counts.terpenes,
            syncedTastes: systemSync.counts.tastes,
            syncedEffects: systemSync.counts.effects,
            syncedCategories: systemSync.counts.categories,
            syncedSubCategories: systemSync.counts.subCategories,
            lastSuccessfulSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            worker: "catalog-sync-worker",
        },
        { merge: true }
    );

    console.log(
        `[catalog-sync-worker] done - endpoint=${endpoint}, products=${products.length}, shops=${shopDocs.size}, growers=${brandDocs.size}, terpenes=${systemSync.counts.terpenes}, tastes=${systemSync.counts.tastes}, effects=${systemSync.counts.effects}, categories=${systemSync.counts.categories}, subCategories=${systemSync.counts.subCategories}`
    );
}

run().catch(async (error) => {
    console.error("[catalog-sync-worker] failed:", error);
    try {
        if (admin.apps.length) {
            await admin
                .firestore()
                .collection("SyncStatus")
                .doc("graphql")
                .set(
                    {
                        source: "graphql",
                        endpoint,
                        status: "error",
                        lastError: error instanceof Error ? error.message : String(error),
                        lastFailedSyncAt: admin.firestore.FieldValue.serverTimestamp(),
                        worker: "catalog-sync-worker",
                    },
                    { merge: true }
                );
        }
    } catch {
        // ignore status write errors
    }
    process.exit(1);
});

































