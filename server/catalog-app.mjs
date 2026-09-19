import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeRoute } from "./entity-model.mjs";
import { renderAmbiguity, renderEntity, renderOverview } from "./entity-render.mjs";
import { search, autocomplete } from "./discovery.mjs";
import { categorySitemapXml, isLegalPath, renderCatalog, renderGrowerOverview, renderHome, renderInfoOverview, renderLegal } from "./consumer-render.mjs";
import { publicMediaUrl } from "./public-media-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const collectionByType = { grower: "growers", product: "products", shop: "shops", page: "pages" };
const overviewPaths = new Map([["/telers", "grower"], ["/cannabis", "product"], ["/cannabis-winkel", "shop"], ["/info", "page"]]);

function send(response, status, body, headers = {}) {
    response.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY", "Permissions-Policy": "geolocation=(), camera=(), microphone=()", "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'", ...headers }); response.end(body);
}

async function published(repository, type, ids) {
    const values = await repository.getEntities(collectionByType[type], ids);
    return values.filter((entity) => entity?.publicationStatus === "published");
}

export function createCatalogHandler(repository) {
    return async (request, response) => {
        const pathname = new URL(request.url, "http://localhost").pathname.replace(/\/$/, "") || "/";
        if (pathname === "/healthz") { send(response, 200, JSON.stringify({ status: "ok" }), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return; }
        const pinned = pathname === "/readyz" ? await repository.snapshot?.({ fresh: true }) : await repository.snapshot?.() || repository;
        const generationHeader = pinned?.generationId ? { "X-Public-Generation": pinned.generationId } : {};
        if (pathname === "/readyz") { const metadata = await pinned?.getGenerationMetadata?.(); const ready = Boolean(pinned?.generationId && metadata?.status === "active"); send(response, ready ? 200 : 503, JSON.stringify({ status: ready ? "ready" : "not_ready", generationId: pinned?.generationId || null }), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return; }
        if (pathname === "/__generation") { send(response, 200, JSON.stringify({ generationId: pinned?.generationId || null }), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return; }
        if (pathname === "/api/search/suggest") {
            const query = new URL(request.url, "http://localhost").searchParams.get("q")?.trim() || "";
            const artifact = await pinned.getArtifact?.("search");
            const matches = query.length >= 2 && artifact ? search(artifact, query, 8).filter((item) => item.type === "product") : [];
            const suggestions = (await Promise.all(matches.map(async (item) => {
                const entity = await pinned.getEntity?.("products", item.sourceId);
                if (!entity?.effective) return null;
                return { label: entity.effective.title, target: item.canonical, kind: "product", image: publicMediaUrl(entity.effective.mediaId), category: entity.effective.productForm || entity.effective.categoryName || "Product", grower: entity.effective.growerName || "" };
            }))).filter(Boolean);
            response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private,no-store", "X-Robots-Tag": "noindex,nofollow", "X-Content-Type-Options": "nosniff", ...generationHeader });
            response.end(JSON.stringify({ suggestions })); return;
        }
        if (pathname === "/") { send(response, 200, renderHome(), { "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader }); return; }
        if (pathname === "/info") { send(response, 200, renderInfoOverview(), { "Cache-Control": "public,max-age=0,s-maxage=300,stale-while-revalidate=60", ...generationHeader }); return; }
        if (pathname === "/telers") { const growers = await pinned.listPublished("growers"); send(response, 200, renderGrowerOverview(growers), { "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader }); return; }
        if (isLegalPath(pathname)) { send(response, 200, renderLegal(pathname), { "Cache-Control": "public,max-age=0,s-maxage=300,stale-while-revalidate=60", ...generationHeader }); return; }
        const categoryMatch = pathname.match(/^\/cannabis\/(wiet|hasj|joints|edibles)$/);
        if (pathname === "/cannabis" || categoryMatch) {
            const url = new URL(request.url, "http://localhost");
            const page = Math.max(1, Number.parseInt(url.searchParams.get("pagina") || "1", 10) || 1);
            const arbitrary = [...url.searchParams.keys()].some((key) => key !== "pagina");
            const products = await pinned.listPublished("products");
            send(response, 200, renderCatalog(products, { categoryKey: categoryMatch?.[1] || null, page, hasArbitraryFilters: arbitrary }), { "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader, ...(arbitrary || page > 1 ? { "X-Robots-Tag": "noindex,follow" } : {}) }); return;
        }
        if (pathname === "/sitemap-pages.xml") { response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", ...generationHeader, "Cache-Control": "public,max-age=60,s-maxage=300,stale-while-revalidate=60", "X-Content-Type-Options": "nosniff" }); response.end(categorySitemapXml()); return; }
        if (pathname === "/sitemap.xml" || /^\/sitemap-(products|growers|pages)\.xml$/.test(pathname)) { const artifact = await pinned.getArtifact?.("sitemaps"); const key = pathname === "/sitemap.xml" ? "index" : pathname.match(/^\/sitemap-(.+)\.xml$/)[1]; let body = artifact?.[key]; if (pathname === "/sitemap.xml" && body && !body.includes("/sitemap-pages.xml")) body = body.replace("</sitemapindex>", "<sitemap><loc>https://weedinfo.nl/sitemap-pages.xml</loc></sitemap></sitemapindex>"); if (body) { response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", ...generationHeader, "Cache-Control": "public,max-age=60,s-maxage=300,stale-while-revalidate=60", "X-Content-Type-Options": "nosniff" }); response.end(body); return; } }
        if (pathname === "/zoeken") { const artifact = await pinned.getArtifact?.("search"); const query = new URL(request.url, "http://localhost").searchParams.get("q") || ""; const index = artifact || { generationId: pinned.generationId, documents: [] }; const results = search(index, query); const suggestions = autocomplete(index, query, 8); const html = `<!doctype html><html lang="nl-NL"><head><meta charset="utf-8"><title>Zoeken${query ? ` naar ${esc(query)}` : ""} | Wietinfo</title><meta name="description" content="Zoek in producten en telers op Wietinfo."><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://weedinfo.nl/zoeken"></head><body><header><a href="/">Wietinfo</a></header><main><h1>Zoeken</h1><form action="/zoeken" method="get"><label>Zoekterm <input name="q" value="${esc(query)}"></label><button type="submit">Zoeken</button></form>${query ? `<h2>Resultaten voor ${esc(query)}</h2>` : ""}${results.length ? `<ul>${results.map((item) => `<li><a href="${esc(item.canonical)}">${esc(item.label)}</a>${item.context.length ? ` — ${esc(item.context.join(" — "))}` : ""}</li>`).join("")}</ul>` : query ? "<p>Geen resultaten gevonden.</p>" : "<p>Vul een zoekterm in.</p>"}<script type="application/json" id="search-suggestions">${JSON.stringify(suggestions).replaceAll("<", "\\u003c")}</script></main></body></html>`; send(response, 200, html, { "X-Robots-Tag": "noindex,follow", ...generationHeader, "Cache-Control": "private,no-store" }); return; }
        const route = await pinned.getRoute(encodeRoute(pathname));
        if (route?.kind === "redirect" && typeof route.destination === "string" && route.destination.startsWith("/") && !route.destination.startsWith("//")) {
            response.writeHead(route.permanent === false ? 302 : 301, { Location: route.destination, "Cache-Control": route.qr ? "public,max-age=60,s-maxage=300" : "public,max-age=3600,s-maxage=86400", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" }); response.end(); return;
        }
        if (route?.kind === "ambiguity" && route.entityType === "product") { const products = await published(pinned, "product", route.sourceIds || []); if (products.length) { send(response, 200, renderAmbiguity(pathname, route, products), { "X-Robots-Tag": "noindex,follow", "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader }); return; } }
        const overviewType = overviewPaths.get(pathname);
        if (overviewType) {
            const overview = await pinned.getOverview(overviewType);
            const entities = await pinned.listPublished(collectionByType[overviewType]);
            if (overview) { send(response, 200, renderOverview(overview, entities, overviewType), { "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader }); return; }
        }
        if (route?.kind === "entity") {
            const entity = await pinned.getEntity(collectionByType[route.entityType], route.sourceId);
            if (entity?.publicationStatus === "published") {
                const related = {};
                if (route.entityType === "grower") related.products = await published(pinned, "product", entity.productPublicIds || []);
                if (route.entityType === "product") {
                    related.grower = entity.growerPublicId ? await pinned.getEntity("growers", entity.growerPublicId) : null;
                    related.shops = await published(pinned, "shop", entity.shopPublicIds || []);
                    related.products = await published(pinned, "product", entity.relatedProductPublicIds || []);
                }
                if (route.entityType === "shop") {
                    related.products = await published(pinned, "product", entity.productPublicIds || []);
                    related.growers = await published(pinned, "grower", entity.growerPublicIds || []);
                }
                send(response, 200, renderEntity(entity, related), { "Cache-Control": "public,max-age=0,s-maxage=60,stale-while-revalidate=30", ...generationHeader }); return;
            }
        }
        if (/^\/(telers|cannabis|cannabis-winkel|info)\//.test(pathname)) {
            send(response, 404, '<!doctype html><html lang="nl"><head><title>Niet gevonden | Wietinfo</title><meta name="robots" content="noindex,nofollow"></head><body><h1>Pagina niet gevonden</h1><a href="/">Naar Wietinfo</a></body></html>', { "Cache-Control": "no-store" }); return;
        }
        const relative = pathname === "/" ? "index.html" : pathname.slice(1);
        for (const directory of ["build", "public"]) {
            try {
                const filename = path.join(root, directory, relative); const file = await fs.readFile(filename); const extension = path.extname(filename);
                const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" }[extension] || "application/octet-stream";
                response.writeHead(200, { "Content-Type": mime, "Cache-Control": /\.[a-f0-9]{8,}\./i.test(relative) ? "public,max-age=31536000,immutable" : "public,max-age=300", "X-Content-Type-Options": "nosniff" }); response.end(file); return;
            } catch { /* continue */ }
        }
        send(response, 404, "Niet gevonden");
    };
}
