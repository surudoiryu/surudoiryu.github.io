import assert from "node:assert/strict";import fs from "node:fs";import test from "node:test";const source=fs.readFileSync("src/service-worker.ts","utf8");
test("SSR navigations are network authoritative",()=>{assert.match(source,/request\.mode === "navigate"/);assert.match(source,/return await fetch\(request\)/);assert.doesNotMatch(source,/createHandlerBoundToURL/);});
test("legacy cache-first navigation handler is removed",()=>{assert.doesNotMatch(source,/response \|\| fetch\(event\.request\)/);assert.match(source,/cache_weedinfo/);assert.match(source,/caches\.delete/);});
