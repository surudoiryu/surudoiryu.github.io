import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createRequestHandler } from "./app.mjs";
import { buildGrowerReadModel, buildProductReadModel, encodeRoute } from "./public-model.mjs";

const grower = buildGrowerReadModel("grower-42", { title: "Voorbeeld Teler", shortcode: "voorbeeld-teler", description: "Dit is server-side zichtbare informatie over de teler.", images: {} }, ["verdiq:product:product-7"], { seoOverride: { title: "Handmatige SEO-titel | Wietinfo" } });
const product = { ...buildProductReadModel("product-7", { title: "Groene Horizon", shortcode: "groene-horizon-voorbeeld-teler", legacyShortcodes: ["oude-groene-horizon"], description: "Primaire productcontent die al in de HTML-response staat.", brand: { title: "Voorbeeld Teler", shortcode: "voorbeeld-teler", sourceId: "grower-42" }, type: "Hybrid", images: {} }), growerSourceId: "grower-42" };
const routes = new Map([
    [encodeRoute(grower.effective.canonicalPath), { kind: "entity", entityType: "grower", sourceId: "grower-42" }],
    [encodeRoute(product.effective.canonicalPath), { kind: "entity", entityType: "product", sourceId: "product-7" }],
    [encodeRoute("/cannabis/oude-groene-horizon"), { kind: "redirect", destination: product.effective.canonicalPath, permanent: true }],
    [encodeRoute(product.qrPath), { kind: "redirect", destination: product.effective.canonicalPath, permanent: false }],
]);
const repository = {
    async getRoute(id) { return routes.get(id) || null; }, async getGrower(id) { return id === "grower-42" ? grower : null; },
    async getProduct(id) { return id === "product-7" ? product : null; }, async getProducts() { return [product]; },
};

async function withServer(callback) {
    const server = http.createServer(createRequestHandler(repository));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try { await callback(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise((resolve) => server.close(resolve)); }
}

test("SSR product includes content, metadata, JSON-LD, canonical and PWA", async () => {
    await withServer(async (origin) => {
        const response = await fetch(`${origin}${product.effective.canonicalPath}`); const html = await response.text();
        assert.equal(response.status, 200); assert.match(html, /<h1>Groene Horizon<\/h1>/);
        assert.match(html, /Primaire productcontent die al in de HTML-response staat/);
        assert.match(html, /<link rel="canonical" href="https:\/\/weedinfo.nl\/cannabis\/groene-horizon-voorbeeld-teler">/);
        assert.match(html, /type="application\/ld\+json"/); assert.match(html, /"@type":"Product"/);
        assert.match(html, /navigator\.serviceWorker\.register\("\/service-worker\.js"\)/);
    });
});

test("SSR grower honors SEO override and links its product", async () => {
    await withServer(async (origin) => {
        const html = await (await fetch(`${origin}${grower.effective.canonicalPath}`)).text();
        assert.match(html, /<title>Handmatige SEO-titel \| Wietinfo<\/title>/); assert.match(html, /<h1>Voorbeeld Teler<\/h1>/);
        assert.match(html, /href="\/cannabis\/groene-horizon-voorbeeld-teler"/); assert.equal(grower.provenance.seoTitle.owner, "wietinfo-seo-override");
    });
});

test("legacy and QR routes redirect before rendering", async () => {
    await withServer(async (origin) => {
        const legacy = await fetch(`${origin}/cannabis/oude-groene-horizon`, { redirect: "manual" });
        const qr = await fetch(`${origin}${product.qrPath}`, { redirect: "manual" });
        assert.equal(legacy.status, 301); assert.equal(legacy.headers.get("location"), product.effective.canonicalPath);
        assert.equal(qr.status, 302); assert.equal(qr.headers.get("location"), product.effective.canonicalPath);
    });
});

