/** Source-authoritative Public materializer with generation-based activation. */
import admin from "firebase-admin";
import fs from "node:fs";
import { buildGrowerEntity, buildProductEntity, entityRoutes, publicId } from "../server/entity-model.mjs";
import { publicationReadiness } from "../server/publication-readiness.mjs";
import { planProductRoutes } from "../server/product-route-planner.mjs";
import { buildSearchIndex, buildSitemaps } from "../server/discovery.mjs";

process.on("uncaughtException", (error) => { console.error(JSON.stringify({ event: "generation_activation_failure", message: error?.message || "unknown_error" })); process.exit(1); });
process.on("unhandledRejection", (error) => { console.error(JSON.stringify({ event: "generation_activation_failure", message: error?.message || "unknown_error" })); process.exit(1); });

for (const file of [".env.worker", ".env"]) if (fs.existsSync(file)) for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) { const match = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ""); }
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}) });
const db = admin.firestore();
const dryRun = process.argv.includes("--dry-run");
const apply = process.argv.includes("--apply");
if (!dryRun && !apply) throw new Error("Choose exactly one mode: --dry-run or --apply");
const generationId = `public-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const normalized = (value) => String(value || "").trim().toLocaleLowerCase("nl");
const unique = (values) => new Set(values).size === values.length;
async function snapshotMap(collection) { const snapshot = await db.collection(collection).get(); return new Map(snapshot.docs.map((doc) => [doc.id, doc.data()])); }
async function commit(operations) { for (let offset = 0; offset < operations.length; offset += 400) { const batch = db.batch(); for (const { ref, data } of operations.slice(offset, offset + 400)) batch.set(ref, data); await batch.commit(); } }
const overrideFor = (overrides, type, id) => overrides.get(encodeURIComponent(publicId(type, id))) || {};

async function buildPlan() {
    const [sourceProducts, sourceGrowers, sourceShops, categories, subCategories, overrides, existingProducts] = await Promise.all([
        snapshotMap("Producten"), snapshotMap("Brands"), snapshotMap("Shops"), snapshotMap("Categories"), snapshotMap("SubCategories"), snapshotMap("EditorialEntityOverrides"), snapshotMap("PublicProducts"),
    ]);
    const activeGrowers = new Map([...sourceGrowers].filter(([, value]) => value.sourceStatus === "active"));
    const activeProducts = new Map([...sourceProducts].filter(([, value]) => value.sourceStatus === "active"));
    const activeShops = new Map([...sourceShops].filter(([, value]) => value.sourceStatus === "active"));
    const growerByName = new Map([...activeGrowers].map(([id, value]) => [normalized(value.title), { id, value }]));
    const relationFor = (product) => { const byName = growerByName.get(normalized(product.brand?.title)); const id = String(product.brand?.sourceId || product.tenantId || product.growerSourceId || byName?.id || ""); return { id, grower: activeGrowers.get(id), byName }; };
    const orphaned = [...activeProducts].filter(([, product]) => { const relation = relationFor(product); return !relation.id || !relation.grower; }).map(([id]) => id);
    const tenantIds = [...activeShops.values()].map((shop) => String(shop.verdiqTenantId || "")).filter(Boolean);
    const routeInput = [...activeProducts].map(([id, product]) => { const relation = relationFor(product); return { id, name: product.title || product.name, sourceStatus: "active", growerName: relation.grower?.title || product.brand?.title, categoryName: categories.get(String(product.categoryId))?.name, subCategoryName: subCategories.get(String(product.subCategoryId))?.name, productForm: categories.get(String(product.categoryId))?.name, variations: product.variants || product.variations || [] }; });
    const history = new Map([...existingProducts].filter(([, product]) => product.sourceStatus === "active" && product.effective?.canonicalPath).map(([id, product]) => [id, { canonicalPath: product.effective.canonicalPath, legacyPaths: product.legacyPaths || [] }]));
    const routes = planProductRoutes(routeInput, history);
    const preflight = { growers: activeGrowers.size, products: activeProducts.size, shops: activeShops.size, orphanedProducts: orphaned.length, duplicateImmutableProductIds: unique([...activeProducts.keys()]) ? 0 : 1, duplicateImmutableGrowerIds: unique([...activeGrowers.keys()]) ? 0 : 1, duplicateShopTenantIds: tenantIds.length - new Set(tenantIds).size, shopsMissingTenantId: activeShops.size - tenantIds.length, canonicalConflicts: routes.conflicts.length, redirectLoops: routes.loops.length, redirectChains: routes.chains.length, uniqueProductCanonicals: new Set([...routes.plans.values()].map((item) => item.canonicalPath)).size, uniqueProductQrIdentities: new Set([...activeProducts.keys()].map((id) => `/q/p/${id}`)).size };
    const expected = { growers: 9, products: 458, shops: 547, orphanedProducts: 0, duplicateImmutableProductIds: 0, duplicateImmutableGrowerIds: 0, duplicateShopTenantIds: 0, shopsMissingTenantId: 0, canonicalConflicts: 0, redirectLoops: 0, redirectChains: 0, uniqueProductCanonicals: 458, uniqueProductQrIdentities: 458 };
    const deviations = Object.entries(expected).filter(([key, value]) => preflight[key] !== value).map(([key, value]) => ({ key, expected: value, actual: preflight[key] }));
    if (deviations.length || !routes.canMaterialize) throw new Error(`Pre-write gate failed: ${JSON.stringify({ deviations, preflight })}`);
    const productModels = new Map(); const productsByGrower = new Map();
    for (const [sourceId, product] of activeProducts) {
        const relation = relationFor(product); const override = overrideFor(overrides, "product", sourceId);
        const enrichedProduct = { ...product, categoryName: categories.get(String(product.categoryId))?.name || "", subCategoryName: subCategories.get(String(product.subCategoryId))?.name || "", productForm: categories.get(String(product.categoryId))?.name || "" };
        const model = buildProductEntity(sourceId, enrichedProduct, override, { growerSourceId: relation.id, growerName: relation.grower.title, growerSlug: relation.grower.shortcode, shopPublicIds: [] });
        const route = routes.plans.get(sourceId); model.canonicalPath = route.canonicalPath; model.effective.canonicalPath = route.canonicalPath; model.legacyPaths = route.legacyPaths; model.routeBasis = route.basis;
        const facts = [model.effective.description, model.growerPublicId, product.categoryId, product.subCategoryId, product.type, product.variants?.length, product.terpenes?.length, product.tastes?.length, product.thumbnailUrl].filter(Boolean).length;
        Object.assign(model, { generationId, sourceStatus: "active", ...publicationReadiness({ publicRenderable: override.publicationStatus !== "unpublished", hasGrower: true, legalStatus: override.legalStatus || "public", informationScore: facts, minimumInformationScore: 4 }) }); model.effective.indexable = model.indexStatus === "index,follow";
        productModels.set(sourceId, model); productsByGrower.set(relation.id, [...(productsByGrower.get(relation.id) || []), model.publicId]);
    }
    for (const model of productModels.values()) model.relatedProductPublicIds = [...productModels.values()].filter((candidate) => candidate.sourceId !== model.sourceId && candidate.growerSourceId === model.growerSourceId && candidate.effective.productForm && candidate.effective.productForm === model.effective.productForm).sort((a, b) => a.publicId.localeCompare(b.publicId)).slice(0, 6).map((candidate) => candidate.publicId);
    const growerModels = new Map();
    for (const [sourceId, grower] of activeGrowers) { const override = overrideFor(overrides, "grower", sourceId); const model = buildGrowerEntity(sourceId, grower, productsByGrower.get(sourceId) || [], override); Object.assign(model, { generationId, sourceStatus: "active", publicationStatus: "published", indexStatus: "index,follow", indexBlockReasons: [] }); model.effective.indexable = true; growerModels.set(sourceId, model); }
    const routeDocs = new Map();
    for (const [id, model] of productModels) for (const route of entityRoutes(model, existingProducts.get(id)?.effective?.canonicalPath)) { if (routeDocs.has(route.id)) throw new Error(`Duplicate encoded route ${route.id}`); routeDocs.set(route.id, { ...route.data, generationId }); }
    for (const [legacyPath, members] of routes.baseGroups) if (members.length > 1) {
        const entities = members.map((member) => productModels.get(member.id)).filter(Boolean);
        const routeId = encodeURIComponent(legacyPath); if (routeDocs.has(routeId)) throw new Error(`Ambiguous legacy route collides with canonical: ${legacyPath}`);
        routeDocs.set(routeId, { kind: "ambiguity", entityType: "product", sourceIds: entities.map((entity) => entity.sourceId), title: entities[0]?.effective.title || "Productvarianten", growerName: entities[0]?.effective.growerName || "", generationId });
    }
    for (const model of growerModels.values()) for (const route of entityRoutes(model, null)) { if (routeDocs.has(route.id)) throw new Error(`Duplicate encoded route ${route.id}`); routeDocs.set(route.id, { ...route.data, generationId }); }
    const decodedRoutes = new Map([...routeDocs].map(([id, data]) => [decodeURIComponent(id), data]));
    const searchIndex = buildSearchIndex({ generationId, products: [...productModels.values()], growers: [...growerModels.values()], routes: decodedRoutes });
    const sitemapStarted = performance.now(); const sitemaps = buildSitemaps({ products: [...productModels.values()], growers: [...growerModels.values()], routes: decodedRoutes }); const sitemapBuildMs = performance.now() - sitemapStarted;
    if (searchIndex.documents.length !== productModels.size + growerModels.size) throw new Error("Search artifact is incomplete");
    return { preflight, routes, productModels, growerModels, routeDocs, searchIndex, sitemaps, sitemapBuildMs };
}

async function validateWritten(generationRef, plan) {
    const [products, growers, routes] = await Promise.all([generationRef.collection("Products").get(), generationRef.collection("Growers").get(), generationRef.collection("Routes").get()]);
    const productData = products.docs.map((doc) => ({ id: doc.id, ...doc.data() })); const growerIds = new Set(growers.docs.map((doc) => doc.id)); const routeData = new Map(routes.docs.map((doc) => [doc.id, doc.data()]));
    const failures = [];
    if (products.size !== 458) failures.push(`products=${products.size}`); if (growers.size !== 9) failures.push(`growers=${growers.size}`);
    if (!productData.every((product) => product.sourceId === product.id && product.sourceStatus === "active")) failures.push("invalid_product_identity_or_source_status");
    if (!productData.every((product) => growerIds.has(product.growerSourceId))) failures.push("orphaned_product");
    if (!unique(productData.map((product) => product.effective.canonicalPath))) failures.push("duplicate_canonical");
    if (productData.some((product) => (product.shopPublicIds || []).length)) failures.push("availability_leak");
    for (const product of productData) { const canonical = routeData.get(encodeURIComponent(product.effective.canonicalPath)); const qr = routeData.get(encodeURIComponent(product.qrPath)); if (canonical?.sourceId !== product.id || canonical?.kind !== "entity" || qr?.destination !== product.effective.canonicalPath || !qr?.qr) failures.push(`route_roundtrip:${product.id}`); }
    if (plan.routes.loops.length || plan.routes.chains.length) failures.push("redirect_loop_or_chain");
    if (failures.length) throw new Error(`Written generation validation failed: ${JSON.stringify(failures)}`);
    return { PublicGrowers: growers.size, PublicProducts: products.size, PublicShops: 0, Routes: routes.size, staleEntities: 0, orphanedProducts: 0, availabilityRelations: 0, failures: [] };
}

const plan = await buildPlan();
const summary = { mode: dryRun ? "dry-run" : "apply", generationId, preflight: plan.preflight, plannedWrites: { growers: plan.growerModels.size, products: plan.productModels.size, shops: 0, routes: plan.routeDocs.size, artifacts: 2, generationMetadata: 1, activePointer: 1 }, artifacts: { searchEntities: plan.searchIndex.documents.length, searchBuildMs: plan.searchIndex.buildMs, sitemapBuildMs: plan.sitemapBuildMs, sitemapProducts: plan.sitemaps.maps.products.length, sitemapGrowers: plan.sitemaps.maps.growers.length, sitemapPages: plan.sitemaps.maps.pages.length }, routeSummary: { redirects: plan.routes.redirects.length, loops: plan.routes.loops.length, chains: plan.routes.chains.length } };
if (dryRun) { console.log(JSON.stringify({ ...summary, writesPerformed: 0 }, null, 2)); process.exit(0); }
const generationRef = db.collection("PublicGenerations").doc(generationId); const operations = [];
operations.push({ ref: generationRef, data: { generationId, status: "building", createdAt: admin.firestore.FieldValue.serverTimestamp(), expected: summary.plannedWrites } });
for (const [id, data] of plan.productModels) operations.push({ ref: generationRef.collection("Products").doc(id), data: { ...data, syncedAt: admin.firestore.FieldValue.serverTimestamp() } });
for (const [id, data] of plan.growerModels) operations.push({ ref: generationRef.collection("Growers").doc(id), data: { ...data, syncedAt: admin.firestore.FieldValue.serverTimestamp() } });
for (const [id, data] of plan.routeDocs) operations.push({ ref: generationRef.collection("Routes").doc(id), data });
operations.push({ ref: generationRef.collection("Artifacts").doc("search"), data: { generationId, documents: plan.searchIndex.documents, buildMs: plan.searchIndex.buildMs } });
operations.push({ ref: generationRef.collection("Artifacts").doc("sitemaps"), data: { generationId, counts: Object.fromEntries(Object.entries(plan.sitemaps.maps).map(([key, rows]) => [key, rows.length])), index: plan.sitemaps.index, products: plan.sitemaps.xml.products, growers: plan.sitemaps.xml.growers, pages: plan.sitemaps.xml.pages } });
await commit(operations); const postWrite = await validateWritten(generationRef, plan);
const configRef = db.collection("PublicConfig").doc("catalog"); const previous = (await configRef.get()).data()?.activeGenerationId || null;
await db.runTransaction(async (transaction) => { transaction.update(generationRef, { status: "active", validatedAt: admin.firestore.FieldValue.serverTimestamp(), activatedAt: admin.firestore.FieldValue.serverTimestamp(), previousGenerationId: previous }); transaction.set(configRef, { activeGenerationId: generationId, previousGenerationId: previous, activatedAt: admin.firestore.FieldValue.serverTimestamp() }); });
console.log(JSON.stringify({ ...summary, previousGenerationId: previous, postWrite, writesPerformed: operations.length + 2, activated: true }, null, 2));
