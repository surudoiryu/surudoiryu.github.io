import { graphQlApiKey, graphQlEndpoint } from "../config";

type SignViewUrlResponse = {
    signViewUrl: string | null;
};

const SIGNED_URL_QUERY = `
query Sign($mediaId: String!) {
  signViewUrl(mediaId: $mediaId)
}
`;

const cache = new Map<string, { url: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();
const TTL_MS = 4 * 60 * 1000;
const IMAGE_CACHE_NAME = "weedinfo-media-v1";
const SIGNED_URL_STORAGE_KEY = "weedinfo-signed-url-cache-v1";
const MAX_SIGNED_CACHE_ENTRIES = 300;

function isDirectUrl(value: string): boolean {
    return /^(https?:\/\/|data:|blob:)/i.test(value);
}

type SignedUrlEntry = {
    url: string;
    expiresAt: number;
    updatedAt: number;
};

type SignedUrlMap = Record<string, SignedUrlEntry>;

function mediaCacheRequest(mediaId: string): Request {
    return new Request(`/__media-cache/${encodeURIComponent(mediaId)}`);
}

function readSignedUrlStorage(): SignedUrlMap {
    try {
        const raw = localStorage.getItem(SIGNED_URL_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as SignedUrlMap;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeSignedUrlStorage(entries: SignedUrlMap): void {
    try {
        localStorage.setItem(SIGNED_URL_STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // ignore storage errors
    }
}

function getPersistedSignedUrl(mediaId: string): string {
    const entries = readSignedUrlStorage();
    const entry = entries[mediaId];
    if (!entry) return "";
    if (entry.expiresAt <= Date.now()) return "";
    return entry.url;
}

function setPersistedSignedUrl(mediaId: string, url: string): void {
    const entries = readSignedUrlStorage();
    entries[mediaId] = {
        url,
        expiresAt: Date.now() + TTL_MS,
        updatedAt: Date.now(),
    };

    const keys = Object.keys(entries);
    if (keys.length > MAX_SIGNED_CACHE_ENTRIES) {
        keys
            .sort((a, b) => (entries[a]?.updatedAt ?? 0) - (entries[b]?.updatedAt ?? 0))
            .slice(0, keys.length - MAX_SIGNED_CACHE_ENTRIES)
            .forEach((key) => delete entries[key]);
    }

    writeSignedUrlStorage(entries);
}

async function readImageFromCache(mediaId: string): Promise<string> {
    if (!("caches" in window)) {
        return "";
    }

    try {
        const imageCache = await caches.open(IMAGE_CACHE_NAME);
        const response = await imageCache.match(mediaCacheRequest(mediaId));
        if (!response) {
            return "";
        }

        const blob = await response.blob();
        if (!blob.size) {
            return "";
        }

        return URL.createObjectURL(blob);
    } catch {
        return "";
    }
}

async function writeImageToCache(mediaId: string, signedUrl: string): Promise<string> {
    if (!("caches" in window)) {
        return signedUrl;
    }

    try {
        const imageResponse = await fetch(signedUrl);
        if (!imageResponse.ok) {
            return "";
        }

        const blob = await imageResponse.blob();
        if (!blob.size) {
            return "";
        }

        const imageCache = await caches.open(IMAGE_CACHE_NAME);
        await imageCache.put(
            mediaCacheRequest(mediaId),
            new Response(blob, {
                headers: {
                    "Content-Type": imageResponse.headers.get("Content-Type") ?? "image/*",
                },
            })
        );

        return URL.createObjectURL(blob);
    } catch {
        return "";
    }
}

async function signWithApiKeyOnly(mediaId: string): Promise<string> {
    if (!graphQlEndpoint || !graphQlApiKey) {
        return "";
    }

    const response = await fetch(graphQlEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": graphQlApiKey,
        },
        body: JSON.stringify({
            query: SIGNED_URL_QUERY,
            variables: { mediaId },
        }),
    });

    if (!response.ok) {
        return "";
    }

    const payload = (await response.json()) as {
        data?: SignViewUrlResponse;
        errors?: Array<{ message?: string }>;
    };

    if (payload.errors?.length) {
        return "";
    }

    return String(payload.data?.signViewUrl ?? "").trim();
}

export async function resolveMediaUrl(input?: string | null): Promise<string> {
    const value = String(input ?? "").trim();
    if (!value) {
        return "";
    }

    if (isDirectUrl(value)) {
        return value;
    }

    const cachedImageUrl = await readImageFromCache(value);
    if (cachedImageUrl) {
        return cachedImageUrl;
    }

    if (!navigator.onLine) {
        return "";
    }

    const cached = cache.get(value);
    if (cached && cached.expiresAt > Date.now()) {
        const cachedBlobUrl = await writeImageToCache(value, cached.url);
        return cachedBlobUrl || cached.url;
    }

    const persistedSignedUrl = getPersistedSignedUrl(value);
    if (persistedSignedUrl) {
        cache.set(value, { url: persistedSignedUrl, expiresAt: Date.now() + TTL_MS });
        const cachedBlobUrl = await writeImageToCache(value, persistedSignedUrl);
        return cachedBlobUrl || persistedSignedUrl;
    }

    const existingPromise = inFlight.get(value);
    if (existingPromise) {
        return existingPromise;
    }

    const fetchPromise = signWithApiKeyOnly(value)
        .then(async (url) => {
            if (!url) {
                return "";
            }

            cache.set(value, {
                url,
                expiresAt: Date.now() + TTL_MS,
            });
            setPersistedSignedUrl(value, url);
            const cachedBlobUrl = await writeImageToCache(value, url);
            return cachedBlobUrl || url;
        })
        .catch(() => "")
        .finally(() => {
            inFlight.delete(value);
        });

    inFlight.set(value, fetchPromise);
    return fetchPromise;
}
