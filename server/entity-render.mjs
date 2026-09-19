import { SITE_ORIGIN } from "./entity-model.mjs";

const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const json = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const absolute = (value) => new URL(value || "/android-chrome-512x512.png", SITE_ORIGIN).toString();

function layout(entity, content, graph) {
    const canonical = absolute(entity.effective.canonicalPath);
    return `<!doctype html>
<html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(entity.effective.seoTitle)}</title>
<meta name="description" content="${esc(entity.effective.seoDescription)}">
<meta name="robots" content="${entity.effective.indexable ? "index,follow" : "noindex,follow"}">
<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">
<meta property="og:title" content="${esc(entity.effective.seoTitle)}"><meta property="og:description" content="${esc(entity.effective.seoDescription)}">
<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff">
<script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": graph })}</script></head>
<body><header><a href="/">Wietinfo</a> <nav><a href="/cannabis">Cannabis</a> <a href="/telers">Telers</a> <a href="/info">Informatie</a> <a href="/zoeken">Zoeken</a></nav></header>
<main id="ssr-content">${content}</main><noscript>De primaire inhoud is zonder JavaScript beschikbaar.</noscript>
<script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(()=>{}))}</script></body></html>`;
}

const crumb = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absolute(item.path) })) });
const itemList = (id, entities) => ({ "@type": "ItemList", "@id": `${absolute(id)}#list`, itemListElement: entities.map((entity, index) => ({ "@type": "ListItem", position: index + 1, name: entity.effective.title, url: absolute(entity.effective.canonicalPath) })) });
const links = (entities) => `<ul>${entities.map((entity) => `<li><a href="${esc(entity.effective.canonicalPath)}">${esc(entity.effective.title)}</a></li>`).join("")}</ul>`;

export function renderEntity(entity, related = {}) {
    const canonical = absolute(entity.effective.canonicalPath);
    if (entity.entityType === "grower") {
        const products = related.products || [];
        return layout(entity, `<nav aria-label="Kruimelpad"><a href="/telers">Telers</a> / ${esc(entity.effective.title)}</nav><article><h1>${esc(entity.effective.title)}</h1><p>${esc(entity.effective.description)}</p><h2>Producten van ${esc(entity.effective.title)}</h2>${products.length ? links(products) : "<p>Geen gepubliceerde producten.</p>"}</article>`, [
            { "@type": "Organization", "@id": `${canonical}#organisatie`, name: entity.effective.title, description: entity.effective.description, url: canonical }, itemList(entity.effective.canonicalPath, products), crumb([{ name: "Telers", path: "/telers" }, { name: entity.effective.title, path: entity.effective.canonicalPath }]),
        ]);
    }
    if (entity.entityType === "product") {
        const grower = related.grower; const shops = related.shops || []; const products = related.products || [];
        const growerPath = grower?.effective.canonicalPath || `/telers/${entity.effective.growerSlug}`;
        return layout(entity, `<nav aria-label="Kruimelpad"><a href="/cannabis">Cannabis</a> / ${esc(entity.effective.title)}</nav><article><h1>${esc(entity.effective.title)}</h1><p>${esc(entity.effective.description)}</p><dl><dt>Teler</dt><dd><a href="${esc(growerPath)}">${esc(entity.effective.growerName)}</a></dd>${entity.effective.productForm ? `<dt>Vorm</dt><dd>${esc(entity.effective.productForm)}</dd>` : ""}</dl>${products.length ? `<h2>Gerelateerde producten van dezelfde teler en vorm</h2>${links(products)}` : ""}${shops.length ? `<h2>Publiek bevestigde coffeeshops</h2>${links(shops)}` : ""}</article>`, [
            { "@type": "Product", "@id": `${canonical}#product`, name: entity.effective.title, description: entity.effective.description, url: canonical, brand: { "@type": "Organization", name: entity.effective.growerName } }, crumb([{ name: "Cannabis", path: "/cannabis" }, { name: entity.effective.title, path: entity.effective.canonicalPath }]),
        ]);
    }
    if (entity.entityType === "shop") {
        const products = related.products || []; const growers = related.growers || [];
        return layout(entity, `<nav aria-label="Kruimelpad"><a href="/cannabis-winkel">Coffeeshops</a> / ${esc(entity.effective.title)}</nav><article><h1>${esc(entity.effective.title)}</h1><p>${esc(entity.effective.description)}</p>${entity.effective.province ? `<p>Provincie: ${esc(entity.effective.province)}</p>` : ""}${products.length ? `<h2>Publiek bevestigde producten</h2>${links(products)}` : ""}${growers.length ? `<h2>Telers</h2>${links(growers)}` : ""}</article>`, [
            { "@type": "LocalBusiness", "@id": `${canonical}#entity`, name: entity.effective.title, description: entity.effective.description, url: canonical }, crumb([{ name: "Coffeeshops", path: "/cannabis-winkel" }, { name: entity.effective.title, path: entity.effective.canonicalPath }]),
        ]);
    }
    return layout(entity, `<nav aria-label="Kruimelpad"><a href="/info">Informatie</a> / ${esc(entity.effective.title)}</nav><article><h1>${esc(entity.effective.title)}</h1>${entity.effective.bodyHtml || `<p>${esc(entity.effective.description)}</p>`}</article>`, [
        { "@type": "Article", "@id": `${canonical}#entity`, headline: entity.effective.title, description: entity.effective.description, url: canonical }, crumb([{ name: "Informatie", path: "/info" }, { name: entity.effective.title, path: entity.effective.canonicalPath }]),
    ]);
}

export function renderOverview(entity, entities, type) {
    const labels = { grower: "Telers", product: "Cannabisproducten", shop: "Coffeeshops", page: "Informatie" };
    const label = labels[type];
    return layout(entity, `<nav aria-label="Kruimelpad"><a href="/">Home</a> / ${label}</nav><section><h1>${label}</h1><p>${esc(entity.effective.description)}</p>${links(entities)}</section>`, [
        { "@type": "CollectionPage", "@id": `${absolute(entity.effective.canonicalPath)}#entity`, name: label, description: entity.effective.description }, itemList(entity.effective.canonicalPath, entities), crumb([{ name: label, path: entity.effective.canonicalPath }]),
    ]);
}

export function renderAmbiguity(pathname, route, products) {
    const canonical = absolute(pathname); const title = `${route.title} van ${route.growerName}`.trim();
    return `<!doctype html><html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} – kies een productvorm | Wietinfo</title><meta name="description" content="Kies de juiste productvorm van ${esc(title)}."><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(canonical)}"></head><body><header><a href="/">Wietinfo</a></header><main><nav aria-label="Kruimelpad"><a href="/cannabis">Cannabis</a> / ${esc(route.title)}</nav><h1>${esc(title)}</h1><p>Er zijn meerdere producten met deze naam. Kies het bedoelde product.</p><ul>${products.map((product) => `<li><a href="${esc(product.effective.canonicalPath)}">${esc(product.effective.title)} — ${esc(product.effective.productForm || "Product")} — ${esc(product.effective.subCategoryName || product.effective.growerName)}</a></li>`).join("")}</ul></main></body></html>`;
}

