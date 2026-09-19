import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { publicMediaUrl } from "./public-media-url.mjs";
import { buildGrowerEntity, buildProductEntity } from "./entity-model.mjs";
import { renderGrower, renderProduct } from "./render.mjs";

const aardachtig = "cmu4mgcpr0000zt4jh6xe5esb";
const productId = "cmu4mll190001zt4j1whtanum";
const placeholder = "/android-chrome-192x192.png";

test("official VerdiQ URL requires an exact CUID", () => {
  assert.equal(publicMediaUrl(aardachtig), `https://media.verdiq.nl/${aardachtig}`);
  for (const value of [undefined, "", "invalid", `/media/${aardachtig}`, `https://media.verdiq.nl/${aardachtig}`, `${aardachtig}?X-Amz-Signature=x`, "Cmu4mgcpr0000zt4jh6xe5esb"]) assert.equal(publicMediaUrl(value), placeholder);
});

test("grower and product use only their supported public relationships", () => {
  const grower = buildGrowerEntity("g1", { title: "Aardachtig", shortcode: "aardachtig", logoMediaId: aardachtig, thumbnailUrl: productId, images: { logo: productId } });
  const product = buildProductEntity("p1", { title: "Product", shortcode: "product", mainImageId: productId, promoImageId: aardachtig, images: { close: aardachtig } });
  const noMain = buildProductEntity("p2", { title: "Geen hoofdfoto", shortcode: "geen-foto", promoImageId: aardachtig });
  assert.equal(grower.effective.image, `https://media.verdiq.nl/${aardachtig}`);
  assert.equal(product.effective.image, `https://media.verdiq.nl/${productId}`);
  assert.equal(noMain.effective.image, placeholder);
});

test("existing Firestore cache preserves Aardachtig and product IDs in proven legacy aliases", async () => {
  const source = fs.readFileSync("src/utils/mediaSource.ts", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const browser = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
  const grower = { images: { logo: aardachtig }, thumbnailUrl: "private-or-invalid" };
  const product = { images: { main: productId, close: aardachtig }, promoImageId: aardachtig };
  assert.equal(browser.growerLogoUrl(grower), `https://media.verdiq.nl/${aardachtig}`);
  assert.equal(browser.productMainImageUrl(product), `https://media.verdiq.nl/${productId}`);
  assert.equal(browser.growerLogoUrl({ images: { logo: "invalid" }, thumbnailUrl: aardachtig }), null);
  assert.equal(browser.productMainImageUrl({ promoImageId: aardachtig, images: { close: aardachtig } }), null);
  assert.equal(browser.growerLogoUrl({ logoMediaId: null }), null);
  assert.equal(browser.productMainImageUrl({ mainImageId: "malformed" }), null);
  const img = { src: "https://media.verdiq.nl/failing", onerror: () => {} };
  browser.mediaFallback()({ currentTarget: img });
  assert.equal(img.src, placeholder);
  assert.equal(img.onerror, null);
});

test("Public serializers retain the immutable media ID from pre-migration cache", () => {
  const grower = buildGrowerEntity("g1", { title: "Aardachtig", shortcode: "aardachtig", images: { logo: aardachtig }, thumbnailUrl: aardachtig });
  const product = buildProductEntity("p1", { title: "Product", shortcode: "product", images: { main: productId }, promoImageId: aardachtig });
  assert.equal(grower.effective.mediaId, aardachtig);
  assert.equal(product.effective.mediaId, productId);
  assert.equal(grower.effective.image, `https://media.verdiq.nl/${aardachtig}`);
  assert.equal(product.effective.image, `https://media.verdiq.nl/${productId}`);
});

test("SSR image and JSON-LD never contain a raw ID or signed URL", () => {
  const grower = buildGrowerEntity("g1", { title: "Aardachtig", shortcode: "aardachtig", logoMediaId: aardachtig });
  const html = renderGrower(grower);
  assert.match(html, new RegExp(`src="https://media\\.verdiq\\.nl/${aardachtig}"`));
  assert.match(html, /loading="lazy" width="320" height="180"/);
  assert.doesNotMatch(html, /src="cmu4/);
  assert.doesNotMatch(html, /X-Amz-/);
  const product = buildProductEntity("p1", { title: "Product", shortcode: "product", mainImageId: productId });
  const productHtml = renderProduct(product, grower);
  assert.match(productHtml, new RegExp(`src="https://media\\.verdiq\\.nl/${productId}"`));
  assert.doesNotMatch(productHtml.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1] || "", /android-chrome|X-Amz-/);
});

test("static browser path has no signing, proxy or persistent signed URL storage", () => {
  const helper = fs.readFileSync("src/utils/mediaSource.ts", "utf8");
  const card = fs.readFileSync("src/components/ProductCard.tsx", "utf8");
  const detail = fs.readFileSync("src/Product.tsx", "utf8");
  const app = fs.readFileSync("server/catalog-app.mjs", "utf8");
  assert.match(helper, /\^c\[a-z0-9\]\{24\}\$/);
  assert.match(helper, /image\.onerror = null/);
  assert.match(helper, /image\.src = MEDIA_PLACEHOLDER/);
  assert.match(card, /productMainImageUrl\(product\)/);
  assert.doesNotMatch(card, /images\?\.close|images\?\.mood/);
  assert.match(detail, /productMainImageUrl\(product\?\.data\)/);
  assert.doesNotMatch(detail, /useSignedMediaUrl|signViewUrl/);
  assert.doesNotMatch(app, /createMediaResolver|\/media\/\(/);
  assert.equal(fs.existsSync("src/services/mediaSigner.ts"), false);
  assert.equal(fs.existsSync("src/hooks/useSignedMediaUrl.ts"), false);
});
