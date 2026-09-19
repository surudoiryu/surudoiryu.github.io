import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createCatalogHandler } from "./catalog-app.mjs";
import { buildGrowerEntity, buildPageEntity, buildProductEntity, buildShopEntity, encodeRoute, entityRoutes } from "./entity-model.mjs";

const grower = buildGrowerEntity("g-1", { title: "Noord Teler", shortcode: "noord-teler", description: "Feitelijke informatie over Noord Teler." }, [], {});
const publicShop = buildShopEntity("s-1", { name: "Shop Centrum", shortcode: "shop-centrum", province: "Utrecht", description: "Coffeeshop in Utrecht." }, [], [], {});
const hiddenShop = buildShopEntity("s-hidden", { name: "Geheime Shop", shortcode: "geheime-shop", province: "Utrecht" }, [], [], {});
const product = buildProductEntity("p-1", { title: "Zonlicht", shortcode: "zonlicht-noord-teler", legacyShortcodes: ["zonlicht-oud"], description: "Productinformatie rechtstreeks uit VerdiQ.", brand: { title: "Noord Teler", shortcode: "noord-teler" }, type: "Hybrid" }, { editorial: { seoDescription: "Redactionele SEO-beschrijving." }, seoOverride: { title: "Zonlicht officiële productinformatie | Wietinfo" } }, { growerSourceId: "g-1", shopPublicIds: [publicShop.publicId] });
grower.productPublicIds = [product.publicId]; publicShop.productPublicIds = [product.publicId]; publicShop.growerPublicIds = [grower.publicId];
const page = buildPageEntity("verantwoord-gebruik", { title: "Verantwoord gebruik", description: "Redactionele uitleg.", path: "/info/verantwoord-gebruik", bodyHtml: "<p>Lees deze informatie zorgvuldig.</p>" });
const overviews = new Map([
    ["grower", buildPageEntity("overview-grower", { title: "Telers", description: "Alle telers.", path: "/telers" })],
    ["product", buildPageEntity("overview-product", { title: "Producten", description: "Alle producten.", path: "/cannabis" })],
    ["shop", buildPageEntity("overview-shop", { title: "Coffeeshops", description: "Alle coffeeshops.", path: "/cannabis-winkel" })],
    ["page", buildPageEntity("overview-page", { title: "Informatie", description: "Alle informatie.", path: "/info" })],
]);
const entities = { growers: new Map([["g-1", grower]]), products: new Map([["p-1", product]]), shops: new Map([["s-1", publicShop], ["s-hidden", hiddenShop]]), pages: new Map([["verantwoord-gebruik", page]]) };
const routes = new Map();
for (const entity of [grower, product, publicShop, hiddenShop, page]) entityRoutes(entity).forEach((route) => routes.set(route.id, route.data));
const repository = {
    async getRoute(id) { return routes.get(id) || null; }, async getEntity(type, id) { return entities[type].get(String(id).split(":").at(-1)) || null; },
    async getEntities(type, ids) { return Promise.all(ids.map((id) => this.getEntity(type, id))); },
    async listPublished(type) { return [...entities[type].values()].filter((item) => item.publicationStatus === "published"); }, async getOverview(type) { return overviews.get(type); },
};
async function request(path, options) {
    const server = http.createServer(createCatalogHandler(repository)); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`, options); } finally { setTimeout(() => server.close(), 0); }
}

test("all entity types SSR primary content, metadata, canonical, JSON-LD and anchors", async () => {
    for (const [entity, marker] of [[grower, "Organization"], [product, "Product"], [publicShop, "LocalBusiness"], [page, "Article"]]) {
        const response = await request(entity.effective.canonicalPath); const html = await response.text();
        assert.equal(response.status, 200); assert.match(html, new RegExp(`<h1>${entity.effective.title}</h1>`));
        assert.match(html, new RegExp(`<title>${entity.effective.seoTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
        assert.match(html, new RegExp(`rel="canonical" href="https://weedinfo.nl${entity.effective.canonicalPath}`));
        assert.match(html, /<meta name="robots" content="index,follow">/); assert.match(html, /application\/ld\+json/); assert.match(html, new RegExp(`"@type":"${marker}"`));
        assert.match(html, /<a href="\//);
    }
});

test("entity metadata is unique and follows override-editorial-source fallback", () => {
    assert.notEqual(product.effective.seoTitle, grower.effective.seoTitle); assert.notEqual(product.effective.seoDescription, grower.effective.seoDescription);
    assert.equal(product.effective.seoTitle, "Zonlicht officiële productinformatie | Wietinfo"); assert.equal(product.provenance.seoTitle.owner, "wietinfo-seo-override");
    assert.equal(product.effective.seoDescription, "Redactionele SEO-beschrijving."); assert.equal(product.provenance.seoDescription.owner, "derived");
});

test("grower-product links are real bidirectional anchors", async () => {
    const growerHtml = await (await request(grower.effective.canonicalPath)).text(); const productHtml = await (await request(product.effective.canonicalPath)).text();
    assert.match(growerHtml, /<a href="\/cannabis\/zonlicht-noord-teler">Zonlicht<\/a>/); assert.match(productHtml, /<a href="\/telers\/noord-teler">Noord Teler<\/a>/);
});

test("unknown entity is a real noindex 404", async () => {
    const response = await request("/cannabis/bestaat-niet"); const html = await response.text(); assert.equal(response.status, 404); assert.match(html, /noindex,nofollow/);
});

test("legacy slug is 301 and QR follows changed slug without depending on it", async () => {
    const legacy = await request("/cannabis/zonlicht-oud", { redirect: "manual" }); assert.equal(legacy.status, 301); assert.equal(legacy.headers.get("location"), product.effective.canonicalPath);
    const renamed = buildProductEntity("p-1", { ...product.source, shortcode: "zonlicht-nieuwe-naam", legacyShortcodes: [] }, product, { growerSourceId: "g-1" });
    const changedRoutes = entityRoutes(renamed, product.effective.canonicalPath); const qr = changedRoutes.find((item) => item.data.qr);
    assert.equal(renamed.qrPath, "/q/p/p-1"); assert.equal(qr.data.destination, "/cannabis/zonlicht-nieuwe-naam");
    assert.ok(changedRoutes.some((item) => item.data.permanent && item.data.destination === "/cannabis/zonlicht-nieuwe-naam"));
});

test("hidden or pending availability cannot leak", async () => {
    const html = await (await request(product.effective.canonicalPath)).text(); assert.match(html, /Shop Centrum/); assert.doesNotMatch(html, /Geheime Shop|geheime-shop|s-hidden/);
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1] || ""; assert.doesNotMatch(jsonLd, /Geheime Shop|s-hidden/);
});

test("SEO overrides survive a new source materialization", () => {
    const override = { editorial: product.editorial, seoOverride: product.seoOverride };
    const resynced = buildProductEntity("p-1", { title: "Nieuwe VerdiQ-naam", shortcode: "nieuwe-verdiq-naam", description: "Nieuwe bronbeschrijving", brand: { title: "Noord Teler" } }, override, { growerSourceId: "g-1" });
    assert.equal(resynced.effective.seoTitle, product.effective.seoTitle); assert.equal(resynced.effective.seoDescription, product.effective.seoDescription);
});

test("catalog overviews render published entity anchors", async () => {
    for (const path of ["/telers", "/cannabis", "/cannabis-winkel", "/info"]) { const response = await request(path); const html = await response.text(); assert.equal(response.status, 200); assert.match(html, /<ul[^>]*><li[^>]*><a href="\//); }
});
