import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createCatalogHandler } from "./catalog-app.mjs";

const forms = ["Wiet", "Hasj", "Joints Wiet", "Joints Hasj", "Edibles", "Vapes"];
const products = Array.from({ length: 72 }, (_, index) => {
  const form = forms[index % forms.length];
  return {
    sourceId: `p-${String(index).padStart(3, "0")}`,
    publicId: `internal:product:p-${index}`,
    entityType: "product",
    publicationStatus: "published",
    sourceStatus: "active",
    effective: {
      title: `Product ${String(index).padStart(3, "0")}`,
      productForm: form,
      categoryName: form,
      growerName: "Teler",
      canonicalPath: `/cannabis/product-${index}`,
    },
  };
});
const repository = {
  generationId: "test",
  async snapshot() { return this; },
  async listPublished(type) { return type === "products" ? products : []; },
  async getArtifact(id) {
    return id === "sitemaps" ? { index: '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>' } : null;
  },
  async getRoute() { return null; },
  async getGenerationMetadata() { return { status: "active" }; },
};
async function request(path) {
  const server = http.createServer(createCatalogHandler(repository));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: "manual" });
    return { response, html: await response.text() };
  } finally {
    server.close();
  }
}

test("consumer HTML contains no internal platform terminology", async () => {
  for (const path of ["/", "/cannabis", "/cannabis/wiet", "/over-weedinfo", "/informatie/gezondheid-en-risicos"]) {
    const { html } = await request(path);
    assert.doesNotMatch(html, /VerdiQ|GraphQL|PublicGeneration|sourceId|immutable ID|provenance|publicationStatus|indexStatus|availability relation/i);
  }
});

test("four categories use real form mapping and self canonicals", async () => {
  const expected = { wiet: ["Wiet"], hasj: ["Hasj"], joints: ["Joints Wiet", "Joints Hasj"], edibles: ["Edibles"] };
  for (const [key, mappedForms] of Object.entries(expected)) {
    const { response, html } = await request(`/cannabis/${key}`);
    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`rel="canonical" href="https://weedinfo.nl/cannabis/${key}"`));
    assert.match(html, /BreadcrumbList/);
    const cardForms = [...html.matchAll(/<p class="meta">([^<]+)/g)].map((match) => match[1].split(" · ")[0]);
    assert.ok(cardForms.length > 0);
    assert.ok(cardForms.every((form) => mappedForms.includes(form)));
  }
});

test("catalog first batch is 24 and page two has no duplicates", async () => {
  const first = await request("/cannabis");
  const second = await request("/cannabis?pagina=2");
  const ids = (html) => [...html.matchAll(/data-product-key="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids(first.html).length, 24);
  assert.equal(ids(second.html).length, 24);
  assert.equal(new Set([...ids(first.html), ...ids(second.html)]).size, 48);
  assert.match(first.html, /data-load-more/);
  assert.match(first.html, /IntersectionObserver/);
  assert.match(second.html, /noindex,follow/);
});

test("arbitrary filters are noindex and links work without JavaScript", async () => {
  const { response, html } = await request("/cannabis?grower=x");
  assert.equal(response.headers.get("x-robots-tag"), "noindex,follow");
  assert.match(html, /<a href="\/cannabis\/product-/);
});

test("pages sitemap includes categories and legal routes render", async () => {
  const sitemap = await request("/sitemap-pages.xml");
  assert.match(sitemap.html, /\/cannabis\/wiet/);
  assert.match(sitemap.html, /\/cannabis\/edibles/);
  for (const path of ["/over-weedinfo", "/informatie/gezondheid-en-risicos", "/privacy", "/cookies", "/gebruiksvoorwaarden", "/disclaimer"]) {
    const result = await request(path);
    assert.equal(result.response.status, 200);
    assert.match(result.html, /<h1>/);
  }
});

test("shops, prices, offers and availability are absent from consumer catalog", async () => {
  const { html } = await request("/cannabis");
  assert.doesNotMatch(html, /coffeeshop|cannabis-winkel|prijs|offers|availability/i);
});

test("product suggestions are loaded only for a typed query", async () => {
  const empty = await request("/api/search/suggest");
  assert.deepEqual(JSON.parse(empty.html).suggestions, []);
});
