export function validateRuntimeConfig(env = process.env) {
    if (env.NODE_ENV !== "production") return;
    const missing = ["FIREBASE_PROJECT_ID", "PUBLIC_SITE_ORIGIN"].filter((key) => !String(env[key] || "").trim());
    if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
    if (env.PUBLIC_SITE_ORIGIN !== "https://weedinfo.nl") throw new Error("PUBLIC_SITE_ORIGIN must be https://weedinfo.nl in production");
    const endpoint = env.GRAPHQL_ENDPOINT || env.REACT_APP_GRAPHQL_ENDPOINT || "";
    if (/localhost|127\.0\.0\.1/i.test(endpoint)) throw new Error("Production GraphQL configuration may not use localhost");
    const credentialParts = [env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY].filter(Boolean).length;
    if (credentialParts === 1) throw new Error("Firebase service-account configuration is incomplete");
}

const category = (pathname) => pathname.startsWith("/q/") ? "qr" : pathname.startsWith("/sitemap") ? "sitemap" : pathname === "/zoeken" ? "search" : pathname.startsWith("/cannabis/") ? "product" : pathname.startsWith("/telers/") ? "grower" : "other";
export function observed(handler, repository) {
    return async (request, response) => {
        const started = performance.now(); let status = 200; const original = response.writeHead.bind(response); response.writeHead = (code, ...args) => { status = code; return original(code, ...args); };
        try { await handler(request, response); }
        catch (error) { status = 500; if (!response.headersSent) response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); if (!response.writableEnded) response.end("Interne serverfout"); console.error(JSON.stringify({ event: "ssr_error", category: category(new URL(request.url, "http://localhost").pathname), message: error?.message || "unknown_error" })); }
        finally { const pathname = new URL(request.url, "http://localhost").pathname; console.log(JSON.stringify({ event: "ssr_request", category: category(pathname), status, latencyMs: Number((performance.now() - started).toFixed(2)), generationId: repository.diagnostics?.().activeGenerationId || null })); }
    };
}
