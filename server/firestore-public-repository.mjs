const collectionByType = { growers: "Growers", products: "Products", shops: "Shops", pages: "Pages" };
const docId = (value) => String(value || "").split(":").at(-1);

function scoped(root, generationId, caches, metrics) {
    const cached = async (cache, key, loader, metric) => { if (cache.has(key)) { metrics.cacheHits += 1; return cache.get(key); } const started = performance.now(); const pending = loader().then((value) => { metrics[metric] = (metrics[metric] || 0) + performance.now() - started; metrics.firestoreReads += 1; return value; }).catch((error) => { cache.delete(key); throw error; }); cache.set(key, pending); return pending; };
    return {
        generationId,
        async snapshot() { return this; },
        async getRoute(id) { return cached(caches.routes, `${generationId}:${id}`, async () => (await root.collection("Routes").doc(id).get()).data() || null, "routeLookupMs"); },
        async getGrower(id) { return this.getEntity("growers", id); },
        async getProduct(id) { return this.getEntity("products", id); },
        async getProducts(ids) { return Promise.all(ids.map((id) => this.getProduct(id))); },
        async getEntity(type, id) { const name = collectionByType[type]; const key = `${generationId}:${type}:${docId(id)}`; return name ? cached(caches.entities, key, async () => (await root.collection(name).doc(docId(id)).get()).data() || null, "entityLookupMs") : null; },
        async getEntities(type, ids) { return Promise.all(ids.map((id) => this.getEntity(type, id))); },
        async listPublished(type) { const name = collectionByType[type]; if (!name) return []; return cached(caches.lists, `${generationId}:${type}:published`, async () => { const snapshot = await root.collection(name).where("publicationStatus", "==", "published").get(); return snapshot.docs.map((doc) => doc.data()).sort((a, b) => a.effective.title.localeCompare(b.effective.title, "nl")); }, "listLookupMs"); },
        async getOverview() { return null; },
        async getArtifact(id) { return cached(caches.artifacts, `${generationId}:${id}`, async () => (await root.collection("Artifacts").doc(id).get()).data() || null, "artifactLookupMs"); },
        async getGenerationMetadata() { return cached(caches.entities, `${generationId}:metadata`, async () => (await root.get()).data() || null, "entityLookupMs"); },
        diagnostics() { return { generationId, ...metrics }; },
    };
}
export function createFirestorePublicRepository(db) {
    const caches = { routes: new Map(), entities: new Map(), lists: new Map(), artifacts: new Map() }; const metrics = { pointerLookupMs: 0, routeLookupMs: 0, entityLookupMs: 0, listLookupMs: 0, artifactLookupMs: 0, firestoreReads: 0, cacheHits: 0 }; let pointer = { id: null, expires: 0 }; const pointerTtlMs = Number(process.env.PUBLIC_GENERATION_POINTER_TTL_MS || 1000);
    return {
        async snapshot(options = {}) { const now = Date.now(); if (options.fresh || !pointer.id || pointer.expires <= now) { const started = performance.now(); const config = await db.collection("PublicConfig").doc("catalog").get(); metrics.pointerLookupMs += performance.now() - started; metrics.firestoreReads += 1; pointer = { id: config.data()?.activeGenerationId || null, expires: now + pointerTtlMs }; } const id = pointer.id; if (!id) return null; return scoped(db.collection("PublicGenerations").doc(id), id, caches, metrics); },
        async getRoute(id) { const repo = await this.snapshot(); return repo?.getRoute(id) || null; }, async getGrower(id) { const repo = await this.snapshot(); return repo?.getGrower(id) || null; }, async getProduct(id) { const repo = await this.snapshot(); return repo?.getProduct(id) || null; }, async getProducts(ids) { const repo = await this.snapshot(); return repo?.getProducts(ids) || []; }, async getEntity(type, id) { const repo = await this.snapshot(); return repo?.getEntity(type, id) || null; }, async getEntities(type, ids) { const repo = await this.snapshot(); return repo?.getEntities(type, ids) || []; }, async listPublished(type) { const repo = await this.snapshot(); return repo?.listPublished(type) || []; }, async getOverview(type) { const repo = await this.snapshot(); return repo?.getOverview(type) || null; }, async getArtifact(id) { const repo = await this.snapshot(); return repo?.getArtifact(id) || null; },
        diagnostics() { return { activeGenerationId: pointer.id, pointerTtlMs, cacheSizes: Object.fromEntries(Object.entries(caches).map(([key, value]) => [key, value.size])), ...metrics }; },
    };
}
