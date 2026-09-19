import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeRoute } from "./public-model.mjs";
import { renderGrower, renderProduct } from "./render.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function createRequestHandler(repository) {
    return async function handle(request, response) {
        const pinned = await repository.snapshot?.() || repository;
        const url = new URL(request.url, "http://localhost");
        const pathname = url.pathname.replace(/\/$/, "") || "/";
        const route = await pinned.getRoute(encodeRoute(pathname));

        if (route?.kind === "redirect") {
            response.writeHead(route.permanent === false ? 302 : 301, { Location: route.destination, "Cache-Control": "public, max-age=300" });
            response.end();
            return;
        }

        if (route?.kind === "entity" && route.entityType === "grower") {
            const grower = await pinned.getGrower(route.sourceId);
            if (grower?.publicationStatus === "published") {
                const products = await pinned.getProducts(grower.productPublicIds || []);
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" });
                response.end(renderGrower(grower, products.filter((item) => item.publicationStatus === "published")));
                return;
            }
        }

        if (route?.kind === "entity" && route.entityType === "product") {
            const product = await pinned.getProduct(route.sourceId);
            if (product?.publicationStatus === "published") {
                const grower = product.growerSourceId ? await pinned.getGrower(product.growerSourceId) : null;
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" });
                response.end(renderProduct(product, grower));
                return;
            }
        }

        // Incremental migration fallback: assets and all non-migrated routes
        // continue to use the existing CRA/PWA build.
        const relative = pathname === "/" ? "index.html" : pathname.slice(1);
        const candidates = [path.join(root, "build", relative), path.join(root, "public", relative)];
        for (const candidate of candidates) {
            try {
                const file = await fs.readFile(candidate);
                const extension = path.extname(candidate);
                const type = extension === ".json" ? "application/json" : extension === ".js" ? "text/javascript" : extension === ".html" ? "text/html; charset=utf-8" : "application/octet-stream";
                response.writeHead(200, { "Content-Type": type });
                response.end(file);
                return;
            } catch { /* try next candidate */ }
        }

        if (pathname.startsWith("/telers/") || pathname.startsWith("/cannabis/")) {
            response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
            response.end("<!doctype html><html lang=\"nl\"><title>Niet gevonden | Wietinfo</title><meta name=\"robots\" content=\"noindex\"><h1>Pagina niet gevonden</h1></html>");
            return;
        }

        try {
            const shell = await fs.readFile(path.join(root, "build", "index.html"));
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(shell);
        } catch {
            response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("De applicatiebuild is nog niet beschikbaar.");
        }
    };
}
