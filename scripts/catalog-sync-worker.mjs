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
import { verdiqShopIdentity } from "./shop-identity.mjs";

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
    shortDescription
    companyAddress
    warehouseAddresses
    logoMediaId
    isApproved
    vendorGLN
    billingEmail
    ordersEmail
    allowForeigns
    disabled
    drive
    easyParking
    payByCard
    pickup
    openFrom
    openTill
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
const CREATE_COMPANY_REVIEW_MUTATION = `
mutation AddCompanyReview($input: CreateCompanyReviewInput!) {
  createCompanyReview(input: $input) {
    id
    targetTenantId
    rating
    text
    reviewerName
    source
    externalRef
    createdAt
  }
}
`;
const CREATE_PRODUCT_REVIEW_MUTATION = `
mutation AddProductReview($input: CreateProductReviewInput!) {
  createProductReview(input: $input) {
    id
    targetProductId
    rating
    text
    reviewerName
    source
    externalRef
    createdAt
  }
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
    shortDescription
    companyAddress
    warehouseAddresses
    logoMediaId
    allowForeigns
    disabled
    drive
    easyParking
    payByCard
    pickup
    openFrom
    openTill
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
    businessName
    shortDescription
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
    shortDescription
    companyAddress
    warehouseAddresses
    logoMediaId
    allowForeigns
    disabled
    drive
    easyParking
    payByCard
    pickup
    openFrom
    openTill
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

function uniqueStrings(values) {
    return Array.from(
        new Set(
            safeArray(values)
                .map((item) => String(item || "").trim())
                .filter(Boolean)
        )
    );
}

function coerceBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "ja"].includes(normalized)) return true;
        if (["false", "0", "no", "nee"].includes(normalized)) return false;
    }
    return fallback;
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
}

function toFiniteNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}


function isValidLatitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function hasValidCoordinatesValues(lat, lng) {
    return isValidLatitude(lat) && isValidLongitude(lng) && Math.abs(lat) > 0 && Math.abs(lng) > 0;
}

function normalizeCountry(value) {
    const raw = firstNonEmptyString(value);
    if (!raw) return "";
    const normalized = raw.toLowerCase();
    if (normalized === "nl" || normalized.includes("nederland") || normalized.includes("netherlands")) {
        return "Nederland";
    }
    return raw;
}

const DUTCH_PROVINCES = [
    "Drenthe",
    "Flevoland",
    "Friesland",
    "Gelderland",
    "Groningen",
    "Limburg",
    "Noord-Brabant",
    "Noord-Holland",
    "Overijssel",
    "Utrecht",
    "Zeeland",
    "Zuid-Holland",
];

const DUTCH_PROVINCES_BY_KEY = DUTCH_PROVINCES.reduce((acc, province) => {
    acc[province.toLowerCase()] = province;
    return acc;
}, {});

function normalizeProvince(value) {
    const raw = firstNonEmptyString(value);
    if (!raw) return "";
    const normalized = raw.toLowerCase().replace(/\s+/g, "-");
    const direct = DUTCH_PROVINCES_BY_KEY[normalized];
    if (direct) return direct;
    const bySpace = DUTCH_PROVINCES.find((province) => province.toLowerCase().replace(/-/g, " ") === normalized.replace(/-/g, " "));
    return bySpace || raw;
}

function detectProvinceFromAddressText(value) {
    const text = String(value || "").toLowerCase();
    if (!text.trim()) return "";
    const found = DUTCH_PROVINCES.find((province) => {
        const variants = [province.toLowerCase(), province.toLowerCase().replace(/-/g, " ")];
        return variants.some((variant) => text.includes(variant));
    });
    return found || "";
}

function detectCountryFromAddressText(value) {
    const text = String(value || "").toLowerCase();
    if (!text.trim()) return "";
    if (text.includes("nederland") || text.includes(" netherlands") || text.endsWith(" nl")) {
        return "Nederland";
    }
    return "";
}

function parseWarehouseAddresses(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    const raw = value.trim();
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // fallback hieronder met regex
    }
    return [];
}

function extractLatLngFromText(value) {
    const text = String(value || "");
    if (!text.trim()) return { lat: null, lng: null };

    const labeled = text.match(/["']?lat["']?\s*[:=]\s*(-?\d+(?:[.,]\d+)?)\D+["']?(?:lng|lon|longitude)["']?\s*[:=]\s*(-?\d+(?:[.,]\d+)?)/i);
    if (labeled) {
        return {
            lat: toFiniteNumber(labeled[1]),
            lng: toFiniteNumber(labeled[2]),
        };
    }

    const generic = text.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)/);
    if (generic) {
        return {
            lat: toFiniteNumber(generic[1]),
            lng: toFiniteNumber(generic[2]),
        };
    }

    return { lat: null, lng: null };
}

function extractCoordinates(source, seed) {
    const location = source?.location && typeof source.location === "object" ? source.location : {};
    const companyAddress = source?.companyAddress && typeof source.companyAddress === "object" ? source.companyAddress : {};
    const warehouseAddresses = parseWarehouseAddresses(source?.warehouseAddresses);
    const firstWarehouse = warehouseAddresses.find((item) => item && typeof item === "object") || {};
    const coordinates = Array.isArray(source?.coordinates) ? source.coordinates : [];
    const companyAddressTextCoordinates = extractLatLngFromText(source?.companyAddress);
    const warehouseTextCoordinates = extractLatLngFromText(source?.warehouseAddresses);

    const latCandidate = firstDefined(
        source?.lat,
        source?.latitude,
        location?.lat,
        location?.latitude,
        companyAddress?.lat,
        companyAddress?.latitude,
        firstWarehouse?.lat,
        firstWarehouse?.latitude,
        companyAddressTextCoordinates.lat,
        warehouseTextCoordinates.lat,
        coordinates.length >= 2 ? coordinates[1] : undefined
    );

    const lngCandidate = firstDefined(
        source?.lng,
        source?.longitude,
        source?.lon,
        location?.lng,
        location?.longitude,
        location?.lon,
        companyAddress?.lng,
        companyAddress?.longitude,
        companyAddress?.lon,
        firstWarehouse?.lng,
        firstWarehouse?.longitude,
        firstWarehouse?.lon,
        companyAddressTextCoordinates.lng,
        warehouseTextCoordinates.lng,
        coordinates.length >= 2 ? coordinates[0] : undefined
    );

    const lat = toFiniteNumber(latCandidate);
    const lng = toFiniteNumber(lngCandidate);

    const resolvedLat = lat ?? toFiniteNumber(seed?.lat);
    const resolvedLng = lng ?? toFiniteNumber(seed?.lng);

    if (!hasValidCoordinatesValues(resolvedLat, resolvedLng)) {
        return {
            lat: 0,
            lng: 0,
            hasCoordinates: false,
        };
    }

    return {
        lat: resolvedLat,
        lng: resolvedLng,
        hasCoordinates: true,
    };
}

function itemClosed(item) {
    return Boolean(item?.closed) || !firstNonEmptyString(item?.open);
}

function parseOpeningSchedule(value) {
    let raw = value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("{")) {
            try {
                raw = JSON.parse(trimmed);
            } catch {
                raw = value;
            }
        }
    }

    if (!raw || typeof raw !== "object") {
        return null;
    }

    const days = Array.isArray(raw.days) ? raw.days : [];
    if (!days.length) {
        return null;
    }

    return raw;
}

function normalizeDayName(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function pickTodayOpeningFromSchedule(schedule) {
    if (!schedule || !Array.isArray(schedule.days)) {
        return { openFrom: "", openTill: "" };
    }

    const today = normalizeDayName(
        new Intl.DateTimeFormat("nl-NL", { weekday: "long", timeZone: "Europe/Amsterdam" }).format(new Date())
    );

    const todayEntry = schedule.days.find((item) => normalizeDayName(item?.day) === today);
    const preferred = todayEntry && !itemClosed(todayEntry)
        ? todayEntry
        : schedule.days.find((item) => !itemClosed(item)) || todayEntry;

    return {
        openFrom: firstNonEmptyString(preferred?.open),
        openTill: firstNonEmptyString(preferred?.close),
    };
}

function resolveOpeningHours(openFromRaw, openTillRaw, seed) {
    const schedule = parseOpeningSchedule(openFromRaw);
    const scheduleToday = pickTodayOpeningFromSchedule(schedule);

    const openFrom = firstNonEmptyString(
        typeof openFromRaw === "string" && !openFromRaw.trim().startsWith("{") ? openFromRaw : "",
        scheduleToday.openFrom,
        seed?.openFrom
    );

    const openTill = firstNonEmptyString(
        openTillRaw,
        scheduleToday.openTill,
        seed?.openTill
    );

    return {
        openFrom,
        openTill,
        openingHours: schedule || undefined,
    };
}

function collectShopImageIds(source, seed) {
    const sourceImages = source?.images && typeof source.images === "object" ? source.images : {};
    const seedImages = seed?.images && typeof seed.images === "object" ? seed.images : {};

    const gallery = uniqueStrings([
        ...safeArray(source?.gallery),
        ...safeArray(source?.galleryMediaIds),
        ...safeArray(source?.mediaIds),
        ...safeArray(sourceImages?.gallery),
        ...safeArray(seed?.gallery),
    ]);

    const logo = firstNonEmptyString(
        source?.logoMediaId,
        source?.logo,
        source?.logoUrl,
        sourceImages?.logo,
        seed?.logo,
        seedImages?.logo
    );
    const overview = firstNonEmptyString(
        source?.overviewImageId,
        source?.heroImageId,
        source?.coverImageId,
        source?.imageId,
        sourceImages?.overview,
        sourceImages?.hero,
        sourceImages?.cover,
        seedImages?.overview
    );
    const close = firstNonEmptyString(
        source?.closeImageId,
        source?.detailImageId,
        sourceImages?.close,
        seedImages?.close
    );
    const mood = firstNonEmptyString(
        source?.moodImageId,
        source?.promoImageId,
        sourceImages?.mood,
        seedImages?.mood
    );

    const mergedGallery = uniqueStrings([logo, overview, close, mood, ...gallery]);

    return {
        logo,
        images: {
            logo,
            overview,
            close,
            mood,
        },
        gallery: mergedGallery,
    };
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
    if (normalized.includes("sativa")) return 75;
    if (normalized.includes("indica")) return 25;
    if (normalized.includes("hybrid")) return 50;

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
    const image = firstNonEmptyString(source?.logoMediaId);

    return {
        sourceId,
        data: {
            id: toNumericId(sourceId, fallbackNumericId),
            logoMediaId: image || undefined,
            title,
            thumbnailUrl: image,
            description: firstNonEmptyString(source?.description, source?.companyAddress),
            shortDescription: firstNonEmptyString(source?.shortDescription, source?.description, source?.companyAddress).slice(0, 180),
            shortcode: toSlug(title || sourceId),
            images: {
                logo: image,
                overview: "",
                close: firstNonEmptyString(source?.closeImageUrl),
                mood: firstNonEmptyString(source?.moodImageUrl),
            },
            isApproved: Boolean(source?.isApproved),
            sourceStatus: "active",
        },
    };
}

function toShopDocument(source, fallbackName, fallbackNumericId, seed) {
    const name = firstNonEmptyString(source?.businessName, source?.name, source?.title, source?.displayName, fallbackName);
    const sourceId = firstNonEmptyString(source?.id, source?.retailerId, name);
    const coordinates = extractCoordinates(source, seed);
    const lat = coordinates.lat;
    const lng = coordinates.lng;
    const shortcode = seed?.shortcode || toSlug(name || sourceId || String(fallbackNumericId));

    const pickupRaw = firstDefined(source?.pickup, source?.hasPickup, source?.pickupOnly, source?.takeAway);
    const driveRaw = firstDefined(source?.drive, source?.driveThrough, source?.hasDrive, source?.driveThru);
    const cardRaw = firstDefined(source?.payByCard, source?.cardPayment, source?.pin, source?.acceptsCard);
    const parkingRaw = firstDefined(source?.easyParking, source?.parking, source?.hasParking);
    const foreignsRaw = firstDefined(source?.allowForeigns, source?.allowsForeigns, source?.foreignersAllowed);
    const disabledRaw = firstDefined(source?.disabled, source?.accessible, source?.wheelchairAccessible);
    const openFromRaw = firstDefined(source?.openFrom, source?.openingFrom, source?.opensAt);
    const openTillRaw = firstDefined(source?.openTill, source?.openingTill, source?.closesAt);
    const openingHours = resolveOpeningHours(openFromRaw, openTillRaw, seed);
    const media = collectShopImageIds(source, seed);
    const province = normalizeProvince(
        firstNonEmptyString(
            source?.province,
            source?.state,
            source?.region,
            seed?.province,
            detectProvinceFromAddressText(source?.companyAddress)
        )
    );
    const country = normalizeCountry(
        firstNonEmptyString(
            source?.country,
            source?.countryCode,
            seed?.country,
            detectCountryFromAddressText(source?.companyAddress)
        )
    );

    return {
        sourceId,
        data: {
            ...verdiqShopIdentity(source),
            id: seed?.id || toNumericId(sourceId || shortcode, fallbackNumericId),
            name: name || shortcode,
            lat,
            lng,
            rating: Number.isFinite(Number(source?.rating)) ? Number(source.rating) : (seed?.rating || 0),
            logo: media.logo,
            gallery: media.gallery,
            images: media.images,
            promo: Boolean(source?.promo ?? seed?.promo ?? false),
            pickup: coerceBoolean(pickupRaw, Boolean(seed?.pickup ?? false)),
            drive: coerceBoolean(driveRaw, Boolean(seed?.drive ?? false)),
            payByCard: coerceBoolean(cardRaw, Boolean(seed?.payByCard ?? false)),
            easyParking: coerceBoolean(parkingRaw, Boolean(seed?.easyParking ?? false)),
            allowForeigns: coerceBoolean(foreignsRaw, Boolean(seed?.allowForeigns ?? false)),
            disabled: coerceBoolean(disabledRaw, Boolean(seed?.disabled ?? false)),
            openFrom: openingHours.openFrom,
            openTill: openingHours.openTill,
            distance: 0,
            shortcode,
            description: firstNonEmptyString(source?.shortDescription, source?.description, seed?.description, source?.companyAddress),
            companyAddress: firstNonEmptyString(source?.companyAddress),
            province,
            country,
            openingHours: openingHours.openingHours,
            products: [],
            growers: [],
            source: "graphql",
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            isApproved: Boolean(source?.isApproved),
            sourceStatus: "active",
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

async function fetchShopsWithScore(candidate, shopSeedByName) {
    try {
        const data = await executeGraphQl(candidate.query);
        const items = safeArray(candidate.pick(data))
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

        const withCoordinates = items.filter((entry) => Number(entry.data.lat) !== 0 || Number(entry.data.lng) !== 0).length;

        return { items, withCoordinates, error: "" };
    } catch (error) {
        return {
            items: [],
            withCoordinates: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function fetchShops(shopSeedByName) {
    let bestItems = [];
    let bestScore = -1;
    const reasons = [];

    for (const candidate of SHOP_QUERY_CANDIDATES) {
        const result = await fetchShopsWithScore(candidate, shopSeedByName);
        if (result.error) {
            reasons.push(candidate.name + ": " + result.error);
            continue;
        }

        const score = result.withCoordinates * 100000 + result.items.length;
        if (score > bestScore) {
            bestScore = score;
            bestItems = result.items;
        }
    }

    if (!bestItems.length && reasons.length) {
        console.warn("[catalog-sync-worker] Geen winkel-query beschikbaar; fallback op exclusiveRetailers. " + reasons[0]);
    }

    return bestItems;
}


function hasShopCoordinates(entry) {
    const lat = Number(entry?.data?.lat ?? 0);
    const lng = Number(entry?.data?.lng ?? 0);
    return hasValidCoordinatesValues(lat, lng);
}

function mergeShopEntries(...collections) {
    const merged = new Map();

    collections.flat().forEach((entry) => {
        if (!entry?.data?.shortcode) return;
        const key = entry.data.shortcode;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, entry);
            return;
        }

        const existingHasCoords = hasShopCoordinates(existing);
        const incomingHasCoords = hasShopCoordinates(entry);
        const coordsSource = incomingHasCoords && !existingHasCoords ? entry : existing;

        merged.set(key, {
            sourceId: firstNonEmptyString(existing.sourceId, entry.sourceId),
            data: {
                ...existing.data,
                ...entry.data,
                id: existing.data.id || entry.data.id,
                name: firstNonEmptyString(existing.data.name, entry.data.name),
                lat: coordsSource.data.lat,
                lng: coordsSource.data.lng,
                rating: Math.max(Number(existing.data.rating || 0), Number(entry.data.rating || 0)),
                logo: firstNonEmptyString(existing.data.logo, entry.data.logo),
                description: firstNonEmptyString(existing.data.description, entry.data.description),
                companyAddress: firstNonEmptyString(existing.data.companyAddress, entry.data.companyAddress),
                openingHours: existing.data.openingHours || entry.data.openingHours,
                openFrom: firstNonEmptyString(existing.data.openFrom, entry.data.openFrom),
                openTill: firstNonEmptyString(existing.data.openTill, entry.data.openTill),
                promo: Boolean(existing.data.promo || entry.data.promo),
                pickup: Boolean(existing.data.pickup || entry.data.pickup),
                drive: Boolean(existing.data.drive || entry.data.drive),
                payByCard: Boolean(existing.data.payByCard || entry.data.payByCard),
                easyParking: Boolean(existing.data.easyParking || entry.data.easyParking),
                allowForeigns: Boolean(existing.data.allowForeigns || entry.data.allowForeigns),
                disabled: Boolean(existing.data.disabled || entry.data.disabled),
                isApproved: Boolean(existing.data.isApproved || entry.data.isApproved),
                province: normalizeProvince(firstNonEmptyString(existing.data.province, entry.data.province)),
                country: normalizeCountry(firstNonEmptyString(existing.data.country, entry.data.country)),
                products: Array.from(new Set([...(existing.data.products || []), ...(entry.data.products || [])])),
                growers: Array.from(new Set([...(existing.data.growers || []), ...(entry.data.growers || [])])),
                syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
        });
    });

    return Array.from(merged.values());
}


let geocodeNextRequestAt = 0;
const geocodeRateLimitMs = Math.max(250, Number.parseInt(process.env.GEOCODE_RATE_LIMIT_MS || "1100", 10) || 1100);

function delay(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedGeocodeFetch(url) {
    const now = Date.now();
    const waitMs = Math.max(0, geocodeNextRequestAt - now);
    if (waitMs > 0) {
        await delay(waitMs);
    }

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "User-Agent": "weedinfo-catalog-sync/1.0 (contact: support@weedinfo.nl)",
        },
    });

    geocodeNextRequestAt = Date.now() + geocodeRateLimitMs;
    return response;
}

async function fetchGeoDetailsByCoordinates(lat, lng) {
    if (!hasValidCoordinatesValues(lat, lng)) return null;
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${encodeURIComponent(
        String(lat)
    )}&lon=${encodeURIComponent(String(lng))}`;
    const response = await rateLimitedGeocodeFetch(url);
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`reverse geocode failed (${response.status}): ${body.slice(0, 180)}`);
    }
    return response.json();
}

async function fetchGeoDetailsByAddress(addressLine, fallbackQuery = "") {
    const query = firstNonEmptyString(addressLine, fallbackQuery);
    if (!query) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=nl&q=${encodeURIComponent(
        query
    )}`;
    const response = await rateLimitedGeocodeFetch(url);
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`address geocode failed (${response.status}): ${body.slice(0, 180)}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload) || !payload.length) return null;
    return payload[0];
}

function parseGeoResponse(raw) {
    if (!raw || typeof raw !== "object") {
        return { province: "", country: "", lat: null, lng: null };
    }
    const address = raw.address && typeof raw.address === "object" ? raw.address : {};
    const province = normalizeProvince(firstNonEmptyString(address.state, address.province, address.county, address.region));
    const country = normalizeCountry(firstNonEmptyString(address.country, address.country_code));
    const lat = toFiniteNumber(raw.lat);
    const lng = toFiniteNumber(raw.lon);
    const validCoordinates = hasValidCoordinatesValues(lat, lng);
    return {
        province,
        country,
        lat: validCoordinates ? lat : null,
        lng: validCoordinates ? lng : null,
    };
}

async function buildExistingShopsMap(firestore) {
    const snapshot = await firestore.collection("Shops").get();
    const map = new Map();
    snapshot.forEach((doc) => {
        map.set(doc.id, doc.data() || {});
    });
    return map;
}

async function enrichShopsGeography(shopDocs, existingShopsByShortcode) {
    const geocodeCache = new Map();
    let geocodeChecks = 0;
    let geocodeUpdates = 0;
    const entries = Array.from(shopDocs.entries());
    const total = entries.length;

    console.log(`[catalog-sync-worker] shop geo-sync gestart: ${total} winkels`);

    for (let index = 0; index < entries.length; index += 1) {
        const [shortcode, shop] = entries[index];
        const shopName = firstNonEmptyString(shop?.name, shortcode, "onbekende-winkel");
        const existing = existingShopsByShortcode.get(shortcode) || {};
        const mergedProvince = normalizeProvince(firstNonEmptyString(shop.province, existing.province));
        const mergedCountry = normalizeCountry(firstNonEmptyString(shop.country, existing.country));

        shop.province = mergedProvince;
        shop.country = mergedCountry;

        if (mergedProvince && mergedCountry) {
            continue;
        }

        geocodeChecks += 1;

        const baseLat = toFiniteNumber(firstDefined(shop.lat, existing.lat));
        const baseLng = toFiniteNumber(firstDefined(shop.lng, existing.lng));
        const queryAddress = firstNonEmptyString(shop.companyAddress, existing.companyAddress);
        const fallbackQuery = firstNonEmptyString(shop.name, existing.name, shortcode);
        const cacheKey = hasValidCoordinatesValues(baseLat, baseLng)
            ? `reverse:${baseLat.toFixed(6)},${baseLng.toFixed(6)}`
            : `search:${normalizeText(queryAddress || fallbackQuery)}`;

        let geo = geocodeCache.get(cacheKey);
        if (!geo) {
            try {
                console.log(
                    `[catalog-sync-worker] shop ${index + 1}/${total}: ${shopName} - locatie update gestart`
                );
                let payload = null;
                if (hasValidCoordinatesValues(baseLat, baseLng)) {
                    payload = await fetchGeoDetailsByCoordinates(baseLat, baseLng);
                } else if (queryAddress || fallbackQuery) {
                    payload = await fetchGeoDetailsByAddress(queryAddress, fallbackQuery);
                }
                geo = parseGeoResponse(payload);
            } catch (error) {
                geo = { province: "", country: "", lat: null, lng: null };
                const message = error instanceof Error ? error.message : String(error);
                console.log(
                    `[catalog-sync-worker] shop ${index + 1}/${total}: ${shopName} - locatie update mislukt (${message})`
                );
            }
            geocodeCache.set(cacheKey, geo);
        }

        const finalProvince = normalizeProvince(firstNonEmptyString(shop.province, existing.province, geo.province));
        const finalCountry = normalizeCountry(
            firstNonEmptyString(shop.country, existing.country, geo.country, detectCountryFromAddressText(queryAddress))
        );

        if (finalProvince || finalCountry) {
            geocodeUpdates += 1;
        }

        shop.province = finalProvince;
        shop.country = finalCountry;

        if (!hasValidCoordinatesValues(shop.lat, shop.lng) && hasValidCoordinatesValues(geo.lat, geo.lng)) {
            shop.lat = geo.lat;
            shop.lng = geo.lng;
        }

        const updatedCoordinates = hasValidCoordinatesValues(shop.lat, shop.lng);
        const updatedProvince = Boolean(shop.province);
        const updatedCountry = Boolean(shop.country);
        if (updatedProvince || updatedCountry || updatedCoordinates) {
            console.log(
                `[catalog-sync-worker] shop ${index + 1}/${total}: ${shopName} - locatie resultaat: province=${updatedProvince ? "ja" : "nee"}, country=${updatedCountry ? "ja" : "nee"}, coords=${updatedCoordinates ? "ja" : "nee"}`
            );
        }
    }

    console.log(
        `[catalog-sync-worker] shop geo-sync klaar: checks=${geocodeChecks}, updates=${geocodeUpdates}, totaal=${total}`
    );
    return { geocodeChecks, geocodeUpdates };
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
    const thcMin = Math.max(0, thc - 5);
    const thcMax = Math.max(thcMin, thc + 5);
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

    const legacyShortcode = toSlug(`${source.name}-${source.id}`);
    const growerSlug = toSlug(resolvedGrower.title || source.tenantId || "teler");
    const productSlug = toSlug(source.name || `product-${numericId}`);
    const shortcode = toSlug(`${productSlug}-${growerSlug}`);
    const legacyGrowerFirst = toSlug(`${growerSlug}-${productSlug}`);
    const legacyShortcodes = Array.from(
        new Set([legacyShortcode, legacyGrowerFirst].filter((item) => item && item !== shortcode))
    );

    return {
        id: numericId,
        sourceStatus: "active",
        shortcode,
        legacyShortcodes,
        categoryId: source.categoryId || undefined,
        subCategoryId: source.subCategoryId || undefined,
        leafletId: source.leafletId || undefined,
        promoImageId: source.promoImageId || undefined,
        mainImageId: source.mainImageId || undefined,
        promoVideoId: source.promoVideoId || undefined,
        title: source.name,
        brand: { ...resolvedGrower, sourceId: source.tenantId },
        grower: resolvedGrower.id,
        growerSourceId: source.tenantId,
        type,
        thumbnailUrl: source.mainImageId || "",
        shortDescription: String(source.description || "").slice(0, 180),
        description: source.description || "",
        thcMin,
        thcMax,
        cbdMin: cbd,
        cbdMax: cbd,
        rating: 0,
        images: {
            main: source.mainImageId || "",
            close: "",
            mood: "",
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
            batch.set(op.ref, stripUndefinedDeep(op.data), { merge: true });
        });
        await batch.commit();
    }
}

function isPlainObject(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function stripUndefinedDeep(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => stripUndefinedDeep(item))
            .filter((item) => item !== undefined);
    }

    if (isPlainObject(value)) {
        const output = {};
        Object.entries(value).forEach(([key, item]) => {
            const next = stripUndefinedDeep(item);
            if (next !== undefined) {
                output[key] = next;
            }
        });
        return output;
    }

    return value === undefined ? undefined : value;
}

async function getCollectionCount(firestore, collectionName) {
    try {
        const aggregateSnapshot = await firestore.collection(collectionName).count().get();
        const aggregateData = aggregateSnapshot.data();
        if (typeof aggregateData?.count === "number") {
            return aggregateData.count;
        }
    } catch {
        // fallback hieronder
    }

    const snapshot = await firestore.collection(collectionName).get();
    return snapshot.size;
}

function normalizeReviewRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(1, Math.min(5, Math.round(numeric)));
}

function deriveReviewTarget(data, lookups) {
    const asText = (value) => (typeof value === "string" ? value.trim() : "");

    const directProductId = asText(data?.targetProductId || data?.productSourceId || data?.productId);
    if (directProductId) {
        return { type: "product", targetId: directProductId };
    }

    const productShortcode = asText(data?.productShortcode);
    if (productShortcode) {
        const mapped = lookups.productSourceIdByShortcode.get(productShortcode) || lookups.productSourceIdByShortcode.get(productShortcode.toLowerCase());
        if (mapped) {
            return { type: "product", targetId: mapped };
        }
    }

    const directTenantId = asText(data?.targetTenantId || data?.tenantId || data?.shopTenantId || data?.growerTenantId);
    if (directTenantId) {
        return { type: "company", targetId: directTenantId };
    }

    const shopShortcode = asText(data?.shopShortcode || data?.targetShopShortcode);
    if (shopShortcode) {
        const mapped = lookups.tenantIdByShopShortcode.get(shopShortcode) || lookups.tenantIdByShopShortcode.get(shopShortcode.toLowerCase());
        if (mapped) {
            return { type: "company", targetId: mapped };
        }
    }

    const growerShortcode = asText(data?.growerShortcode || data?.targetGrowerShortcode || data?.brandShortcode);
    if (growerShortcode) {
        const mapped = lookups.tenantIdByGrowerShortcode.get(growerShortcode) || lookups.tenantIdByGrowerShortcode.get(growerShortcode.toLowerCase());
        if (mapped) {
            return { type: "company", targetId: mapped };
        }
    }

    const entityType = asText(data?.targetType || data?.entityType || data?.reviewType).toLowerCase();
    const entityId = asText(data?.targetId || data?.entityId);
    if (entityType && entityId) {
        if (entityType.includes("product")) {
            return { type: "product", targetId: entityId };
        }
        if (entityType.includes("shop") || entityType.includes("grower") || entityType.includes("company") || entityType.includes("tenant") || entityType.includes("brand")) {
            return { type: "company", targetId: entityId };
        }
    }

    return null;
}

async function syncPendingReviewsToGraphQl(firestore, lookups) {
    const snapshot = await firestore.collection("reviews").get();
    const summary = {
        total: snapshot.size,
        pending: 0,
        pushed: 0,
        failed: 0,
        skipped: 0,
    };

    for (const item of snapshot.docs) {
        const data = item.data() || {};
        const syncMeta = data.graphqlSync || {};
        if (syncMeta.sentAt || syncMeta.status === "sent") {
            continue;
        }

        summary.pending += 1;

        const rating = normalizeReviewRating(data.rating);
        const text = firstNonEmptyString(data.review, data.text);
        const reviewerName = firstNonEmptyString(data.reviewerName, data.userName, data.displayName, "Anoniem");
        const externalRef = firstNonEmptyString(data.externalRef, "firestore-review-" + item.id);
        const target = deriveReviewTarget(data, lookups);

        if (!rating || !text || !target?.targetId) {
            summary.skipped += 1;
            await firestore.collection("reviews").doc(item.id).set(
                {
                    graphqlSync: {
                        status: "skipped",
                        reason: !target?.targetId ? "missing_target" : "missing_payload",
                        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                        externalRef,
                    },
                },
                { merge: true }
            );
            continue;
        }

        try {
            if (target.type === "product") {
                const payload = await executeGraphQl(CREATE_PRODUCT_REVIEW_MUTATION, {
                    input: {
                        targetProductId: target.targetId,
                        rating,
                        text,
                        reviewerName,
                        source: "frontend",
                        externalRef,
                    },
                });

                await firestore.collection("reviews").doc(item.id).set(
                    {
                        graphqlSync: {
                            status: "sent",
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                            externalRef,
                            targetType: "product",
                            targetId: target.targetId,
                            graphqlReviewId: firstNonEmptyString(payload?.createProductReview?.id),
                        },
                    },
                    { merge: true }
                );
            } else {
                const payload = await executeGraphQl(CREATE_COMPANY_REVIEW_MUTATION, {
                    input: {
                        targetTenantId: target.targetId,
                        rating,
                        text,
                        reviewerName,
                        source: "frontend",
                        externalRef,
                    },
                });

                await firestore.collection("reviews").doc(item.id).set(
                    {
                        graphqlSync: {
                            status: "sent",
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                            externalRef,
                            targetType: "company",
                            targetId: target.targetId,
                            graphqlReviewId: firstNonEmptyString(payload?.createCompanyReview?.id),
                        },
                    },
                    { merge: true }
                );
            }

            summary.pushed += 1;
        } catch (error) {
            summary.failed += 1;
            const message = error instanceof Error ? error.message : String(error);
            await firestore.collection("reviews").doc(item.id).set(
                {
                    graphqlSync: {
                        status: "error",
                        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastError: message,
                        externalRef,
                        targetType: target.type,
                        targetId: target.targetId,
                    },
                },
                { merge: true }
            );
        }
    }

    return summary;
}

async function run() {
    initFirebaseAdmin();
    const firestore = admin.firestore();
    const products = await fetchAllProducts();
    const systemData = await fetchSystemData();
    const existingShopsByShortcode = await buildExistingShopsMap(firestore);

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
    const fetchedShopsFromCandidates = await fetchShops(shopSeedByName);
    const fetchedShops = mergeShopEntries(tenantShops, fetchedShopsFromCandidates);

    const growersBySourceId = new Map();
    const growersByName = new Map();
    const productSourceIdByShortcode = new Map();
    const tenantIdByGrowerShortcode = new Map();
    const tenantIdByShopShortcode = new Map();

    fetchedGrowers.forEach((entry) => {
        growersBySourceId.set(entry.sourceId, entry.data);
        growersByName.set(normalizeText(entry.data.title), entry.data);
        if (entry?.data?.shortcode && entry?.sourceId) {
            tenantIdByGrowerShortcode.set(entry.data.shortcode, entry.sourceId);
            tenantIdByGrowerShortcode.set(entry.data.shortcode.toLowerCase(), entry.sourceId);
        }
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
        if (entry?.data?.shortcode && entry?.sourceId) {
            tenantIdByShopShortcode.set(entry.data.shortcode, entry.sourceId);
            tenantIdByShopShortcode.set(entry.data.shortcode.toLowerCase(), entry.sourceId);
        }
    });

    products.forEach((product, index) => {
        const mapped = mapProduct(product, index, growersBySourceId, growersByName);
        if (mapped.shortcode && product?.id) {
            productSourceIdByShortcode.set(mapped.shortcode, product.id);
            productSourceIdByShortcode.set(mapped.shortcode.toLowerCase(), product.id);
            (mapped.legacyShortcodes || []).forEach((legacyCode) => {
                if (!legacyCode) return;
                productSourceIdByShortcode.set(legacyCode, product.id);
                productSourceIdByShortcode.set(legacyCode.toLowerCase(), product.id);
            });
        }
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
                province: "",
                country: "",
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
    const shopGeoSummary = await enrichShopsGeography(shopDocs, existingShopsByShortcode);

    shopDocs.forEach((shop, shortcode) => {
        metaOps.push({ ref: firestore.collection("Shops").doc(shortcode), data: shop });
    });
    if (metaOps.length) {
        await commitInChunks(firestore, metaOps);
    }

    const markMissingSourceRecordsStale = async (collectionName, activeIds) => {
        const snapshot = await firestore.collection(collectionName).get();
        const operations = snapshot.docs
            .filter((item) => !activeIds.has(item.id) && item.data()?.sourceStatus !== "stale")
            .map((item) => ({ ref: item.ref, data: { sourceStatus: "stale", staleDetectedAt: admin.firestore.FieldValue.serverTimestamp() }, merge: true }));
        if (operations.length) await commitInChunks(firestore, operations);
        return operations.length;
    };
    const activeProductIds = new Set(products.map((item) => String(item.id)));
    const activeGrowerIds = new Set(brandDocs.keys());
    const activeShopDocumentIds = new Set([...shopDocs.entries()].filter(([, item]) => item.verdiqTenantId).map(([shortcode]) => shortcode));
    const [staleProducts, staleGrowers, staleShops] = await Promise.all([
        markMissingSourceRecordsStale("Producten", activeProductIds),
        markMissingSourceRecordsStale("Brands", activeGrowerIds),
        markMissingSourceRecordsStale("Shops", activeShopDocumentIds),
    ]);

    const systemSync = buildSystemSyncOperations(firestore, systemData);
    if (systemSync.operations.length) {
        await commitInChunks(firestore, systemSync.operations);
    }

    const reviewPush = await syncPendingReviewsToGraphQl(firestore, {
        productSourceIdByShortcode,
        tenantIdByShopShortcode,
        tenantIdByGrowerShortcode,
    });

    const [syncedUsers, syncedReviews] = await Promise.all([
        getCollectionCount(firestore, "Gebruikers"),
        getCollectionCount(firestore, "reviews"),
    ]);

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
            syncedUsers,
            syncedReviews,
            pushedReviews: reviewPush.pushed,
            pendingReviews: reviewPush.pending,
            failedReviewPushes: reviewPush.failed,
            skippedReviewPushes: reviewPush.skipped,
            geocodeChecks: shopGeoSummary.geocodeChecks,
            geocodeUpdates: shopGeoSummary.geocodeUpdates,
            staleProducts,
            staleGrowers,
            staleShops,
            lastSuccessfulSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            worker: "catalog-sync-worker",
        },
        { merge: true }
    );

    console.log(
        `[catalog-sync-worker] done - endpoint=${endpoint}, products=${products.length}, shops=${shopDocs.size}, growers=${brandDocs.size}, users=${syncedUsers}, reviews=${syncedReviews}, reviewsPushed=${reviewPush.pushed}, reviewsPending=${reviewPush.pending}, reviewPushFailed=${reviewPush.failed}, reviewPushSkipped=${reviewPush.skipped}, terpenes=${systemSync.counts.terpenes}, tastes=${systemSync.counts.tastes}, effects=${systemSync.counts.effects}, categories=${systemSync.counts.categories}, subCategories=${systemSync.counts.subCategories}, geocodeChecks=${shopGeoSummary.geocodeChecks}, geocodeUpdates=${shopGeoSummary.geocodeUpdates}`
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


























































