import { SITE_ORIGIN } from "./public-model.mjs";
import { publicMediaUrl } from "./public-media-url.mjs";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeJson(value) {
    return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function layout({ entity, body, jsonLd }) {
    const canonical = new URL(entity.effective.canonicalPath, SITE_ORIGIN).toString();
    const imagePath = publicMediaUrl(entity.effective.mediaId, "/android-chrome-512x512.png");
    const image = imagePath
        ? new URL(imagePath, SITE_ORIGIN).toString()
        : `${SITE_ORIGIN}/android-chrome-512x512.png`;
    const robots = entity.effective.indexable ? "index,follow" : "noindex,follow";

    return `<!doctype html>
<html lang="nl-NL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(entity.effective.seoTitle)}</title>
  <meta name="description" content="${escapeHtml(entity.effective.seoDescription)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(entity.effective.seoTitle)}">
  <meta property="og:description" content="${escapeHtml(entity.effective.seoDescription)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#ffffff">
  <script type="application/ld+json">${safeJson(jsonLd)}</script>
</head>
<body>
  <header><a href="/" aria-label="Wietinfo home">Wietinfo</a></header>
  <main id="ssr-content">${body}</main>
  <noscript>Alle primaire informatie op deze pagina is zonder JavaScript beschikbaar.</noscript>
  <script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/service-worker.js").catch(function(){})})}</script>
</body>
</html>`;
}

export function renderGrower(grower, products = []) {
    const canonical = new URL(grower.effective.canonicalPath, SITE_ORIGIN).toString();
    const productItems = products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: new URL(product.effective.canonicalPath, SITE_ORIGIN).toString(),
        name: product.effective.title,
    }));
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${canonical}#entity`,
                name: grower.effective.title,
                description: grower.effective.description,
                url: canonical,
                ...(grower.effective.mediaId ? { logo: publicMediaUrl(grower.effective.mediaId) } : {}),
            },
            {
                "@type": "ItemList",
                "@id": `${canonical}#products`,
                itemListElement: productItems,
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Telers", item: `${SITE_ORIGIN}/telers` },
                    { "@type": "ListItem", position: 2, name: grower.effective.title, item: canonical },
                ],
            },
        ],
    };
    const productHtml = products.length
        ? `<ul>${products.map((product) => `<li><a href="${escapeHtml(product.effective.canonicalPath)}">${escapeHtml(product.effective.title)}</a></li>`).join("")}</ul>`
        : "<p>Er zijn nog geen gepubliceerde producten.</p>";
    const body = `<nav aria-label="Kruimelpad"><a href="/telers">Telers</a> / ${escapeHtml(grower.effective.title)}</nav>
<article data-entity-id="${escapeHtml(grower.publicId)}">
  <h1>${escapeHtml(grower.effective.title)}</h1>
  <img src="${escapeHtml(publicMediaUrl(grower.effective.mediaId))}" alt="Logo van ${escapeHtml(grower.effective.title)}" loading="lazy" width="320" height="180" onerror="this.onerror=null;this.src='/android-chrome-192x192.png'">
  <p>${escapeHtml(grower.effective.description)}</p>
  <h2>Producten van ${escapeHtml(grower.effective.title)}</h2>
  ${productHtml}
</article>`;
    return layout({ entity: grower, body, jsonLd });
}

export function renderProduct(product, grower) {
    const canonical = new URL(product.effective.canonicalPath, SITE_ORIGIN).toString();
    const growerCanonical = grower
        ? new URL(grower.effective.canonicalPath, SITE_ORIGIN).toString()
        : `${SITE_ORIGIN}/telers/${product.effective.growerSlug}`;
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                "@id": `${canonical}#entity`,
                name: product.effective.title,
                description: product.effective.description,
                url: canonical,
                ...(product.effective.imagePubliclyUsable === true && product.effective.mediaId ? { image: publicMediaUrl(product.effective.mediaId) } : {}),
                brand: { "@type": "Organization", "@id": `${growerCanonical}#entity`, name: product.effective.growerName },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Cannabis", item: `${SITE_ORIGIN}/cannabis` },
                    { "@type": "ListItem", position: 2, name: product.effective.title, item: canonical },
                ],
            },
        ],
    };
    const body = `<nav aria-label="Kruimelpad"><a href="/cannabis">Cannabis</a> / ${escapeHtml(product.effective.title)}</nav>
<article data-entity-id="${escapeHtml(product.publicId)}">
  <h1>${escapeHtml(product.effective.title)}</h1>
  <img src="${escapeHtml(publicMediaUrl(product.effective.mediaId))}" alt="${escapeHtml(product.effective.title)}" loading="lazy" width="640" height="420" onerror="this.onerror=null;this.src='/android-chrome-192x192.png'">
  <p>${escapeHtml(product.effective.description)}</p>
  <dl><dt>Teler</dt><dd><a href="${escapeHtml(grower?.effective.canonicalPath || `/telers/${product.effective.growerSlug}`)}">${escapeHtml(product.effective.growerName)}</a></dd>
  <dt>Type</dt><dd>${escapeHtml(product.effective.type || "Onbekend")}</dd></dl>
</article>`;
    return layout({ entity: product, body, jsonLd });
}
