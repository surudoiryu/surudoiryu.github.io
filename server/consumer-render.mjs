import { SITE_ORIGIN } from "./entity-model.mjs";

const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const json = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const absolute = (path) => new URL(path, SITE_ORIGIN).toString();

export const CATEGORY_DEFINITIONS = Object.freeze({
  wiet: { label: "Wiet", forms: ["Wiet"], description: "Gedroogde cannabisbloemen", image: "/images/pexels-alesiakozik-8336403.jpg" },
  hasj: { label: "Hasj", forms: ["Hasj"], description: "Geperste of verwerkte hars", image: "/images/pexels-elsa-olofsson-3357043-6321769.jpg" },
  joints: { label: "Joints", forms: ["Joints Wiet", "Joints Hasj"], description: "Voorgerolde cannabisproducten", image: "/images/pexels-bxxxty-5564076.jpg" },
  edibles: { label: "Edibles", forms: ["Edibles"], description: "Eetbare cannabisproducten", image: "/images/pexels-kindelmedia-7667903.jpg" },
});
export const CATEGORY_PATHS = Object.keys(CATEGORY_DEFINITIONS).map((key) => `/cannabis/${key}`);
export const PAGE_SIZE = 24;

const baseCss = `
:root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172018;background:#f8faf8}
*{box-sizing:border-box}body{margin:0}a{color:#176c36;text-underline-offset:3px}
header,main,footer{max-width:1120px;margin:auto;padding:1rem}header{display:flex;gap:1.5rem;align-items:center;justify-content:space-between}
nav{display:flex;gap:1rem;flex-wrap:wrap}.skip{position:absolute;left:-9999px}.skip:focus{left:1rem;top:1rem;background:#fff;padding:.75rem;z-index:9}
.hero{padding:2.5rem 1rem}.notice{background:#eaf5ed;border-left:4px solid #176c36;padding:1rem;border-radius:.25rem}
.categories{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin:1.25rem 0}.category{position:relative;display:flex;align-items:flex-end;min-height:13rem;overflow:hidden;border-radius:1rem;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 10px 28px rgba(20,45,27,.16)}.category img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.category-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:1.25rem;background:linear-gradient(180deg,rgba(7,18,10,.02) 20%,rgba(7,18,10,.86) 100%)}.category small{display:block;color:rgba(255,255,255,.9);font-weight:400;margin-top:.35rem}.feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:2rem 0}.feature{padding:1.5rem;border-radius:1rem;background:#edf6ef}.feature.dark{background:#173d24;color:#fff}.feature.dark a{color:#fff}
.products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;padding:0;list-style:none}.product{background:#fff;border:1px solid #dce7de;border-radius:.75rem;padding:1rem;min-height:8rem}.product a{font-weight:750}.meta{color:#526157;font-size:.9rem}
.more{display:block;width:max-content;margin:1.5rem auto;padding:.8rem 1.1rem;border-radius:.5rem;background:#176c36;color:#fff;font-weight:700}.loading{display:none;text-align:center}
footer{border-top:1px solid #dce7de;margin-top:3rem}.legal-links{display:flex;gap:1rem;flex-wrap:wrap}
:focus-visible{outline:3px solid #ef9b0f;outline-offset:3px}@media(max-width:760px){.categories{grid-template-columns:repeat(2,1fr)}.products{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important}}
`;

function shell({ title, description, canonical, robots = "index,follow", body, graph = [] }) {
  return `<!doctype html><html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(absolute(canonical))}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(absolute(canonical))}">
<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#176c36"><style>${baseCss}</style>
${graph.length ? `<script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": graph })}</script>` : ""}</head>
<body><a class="skip" href="#inhoud">Direct naar inhoud</a><header><a href="/" aria-label="WeedInfo home"><strong>WeedInfo</strong></a><nav aria-label="Hoofdnavigatie"><a href="/cannabis">Cannabis</a><a href="/telers">Telers</a><a href="/info">Informatie</a><a href="/zoeken">Zoeken</a></nav></header>
<main id="inhoud">${body}</main><footer><p>WeedInfo is een onafhankelijk informatieplatform. Je kunt via WeedInfo geen cannabis kopen, bestellen of reserveren.</p><nav class="legal-links" aria-label="Juridische informatie"><a href="/over-weedinfo">Over WeedInfo</a><a href="/informatie/gezondheid-en-risicos">Gezondheid en risico's</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/gebruiksvoorwaarden">Gebruiksvoorwaarden</a><a href="/disclaimer">Disclaimer</a></nav></footer>
<script>if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js").catch(()=>{}));</script></body></html>`;
}

const categories = (active) => `<nav class="categories" aria-label="Cannabiscategorieën">${Object.entries(CATEGORY_DEFINITIONS).map(([key, category]) => `<a class="category" href="/cannabis/${key}"${active === key ? ' aria-current="page"' : ""}><img src="${category.image}" alt="" loading="lazy" decoding="async" width="420" height="260"><span class="category-copy">${category.label}<small>${category.description}</small></span></a>`).join("")}</nav>`;
const productItem = (entity) => `<li class="product" data-product-key="${esc(entity.effective.canonicalPath)}"><a href="${esc(entity.effective.canonicalPath)}">${esc(entity.effective.title)}</a><p class="meta">${esc([entity.effective.productForm, entity.effective.growerName].filter(Boolean).join(" · "))}</p></li>`;

export function categoryFor(entity) {
  const form = entity?.effective?.productForm || entity?.effective?.categoryName;
  return Object.entries(CATEGORY_DEFINITIONS).find(([, value]) => value.forms.includes(form))?.[0] || null;
}

export function renderHome() {
  const description = "Onafhankelijke informatie over gereguleerde cannabisproducten en telers.";
  return shell({
    title: "WeedInfo – informatie over cannabisproducten en telers",
    description,
    canonical: "/",
    graph: [{ "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, name: "WeedInfo", url: SITE_ORIGIN, description }],
    body: `<section class="hero"><h1>Informatie over cannabisproducten en telers</h1><p>Bekijk feitelijke productinformatie, vergelijk productsoorten en ontdek telers.</p><p class="notice">WeedInfo verkoopt geen cannabis en bemiddelt niet bij verkoop, bestellingen of reserveringen.</p><p><a class="more" href="/cannabis">Bekijk cannabis</a></p></section><h2>Ontdek per productsoort</h2>${categories()}<section class="feature-grid"><article class="feature"><h2>Wat is WeedInfo?</h2><p>Een onafhankelijk platform dat publieke product- en telerinformatie begrijpelijk bij elkaar brengt.</p><a href="/over-weedinfo">Lees meer</a></article><article class="feature dark"><h2>Gereguleerde cannabis</h2><p>Lees wat het experiment met een gesloten coffeeshopketen betekent.</p><a href="/info">Bekijk informatie</a></article><article class="feature"><h2>Telers ontdekken</h2><p>Bekijk telers en hun onderling gekoppelde producten.</p><a href="/telers">Ontdek telers</a></article><article class="feature"><h2>Gezondheid en risico's</h2><p>Lees nuchtere informatie over werking, risico's en hulp.</p><a href="/informatie/gezondheid-en-risicos">Lees meer</a></article></section>`,
  });
}

export function renderGrowerOverview(growers) {
  const stable = [...growers].sort((a, b) => a.effective.title.localeCompare(b.effective.title, "nl"));
  const description = "Bekijk telers en hun gepubliceerde cannabisproducten.";
  const body = `<nav aria-label="Kruimelpad"><a href="/">Home</a> / Telers</nav><h1>Telers</h1><p>${description}</p><ul>${stable.map((grower) => `<li><a href="${esc(grower.effective.canonicalPath)}">${esc(grower.effective.title)}</a></li>`).join("")}</ul>`;
  return shell({ title: "Telers | WeedInfo", description, canonical: "/telers", body, graph: [{ "@type": "CollectionPage", name: "Telers", url: absolute("/telers"), description }, { "@type": "ItemList", itemListElement: stable.map((grower, index) => ({ "@type": "ListItem", position: index + 1, name: grower.effective.title, url: absolute(grower.effective.canonicalPath) })) }] });
}

export function renderInfoOverview() {
  const description = "Algemene informatie over WeedInfo, gezondheid, privacy en het gebruik van de website.";
  const body = `<nav aria-label="Kruimelpad"><a href="/">Home</a> / Informatie</nav><h1>Informatie</h1><p>${description}</p><ul><li><a href="/over-weedinfo">Over WeedInfo</a></li><li><a href="/informatie/gezondheid-en-risicos">Gezondheid en risico's</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/cookies">Cookies</a></li><li><a href="/gebruiksvoorwaarden">Gebruiksvoorwaarden</a></li><li><a href="/disclaimer">Disclaimer</a></li></ul>`;
  return shell({ title: "Informatie | WeedInfo", description, canonical: "/info", body });
}

function listingScript() {
  return `<script>
(()=>{const link=document.querySelector("[data-load-more]"),list=document.querySelector("[data-product-list]"),status=document.querySelector("[data-loading]");if(!link||!list)return;let busy=false;
async function load(event){if(event)event.preventDefault();if(busy||!link.href)return;busy=true;status.style.display="block";try{const response=await fetch(link.href,{headers:{"X-WeedInfo-Fragment":"products"}});if(!response.ok)throw new Error("load");const html=await response.text(),doc=new DOMParser().parseFromString(html,"text/html"),next=doc.querySelector("[data-product-list]"),nextLink=doc.querySelector("[data-load-more]");const known=new Set([...list.querySelectorAll("[data-product-key]")].map(x=>x.dataset.productKey));for(const item of next?.children||[])if(!known.has(item.dataset.productKey))list.append(item);if(nextLink)link.href=nextLink.href;else link.remove();}catch{location.href=link.href}finally{busy=false;status.style.display="none"}}
link.addEventListener("click",load);if("IntersectionObserver"in window){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting))load()},{rootMargin:"240px"});observer.observe(link);}})();
</script>`;
}

export function renderCatalog(products, { categoryKey = null, page = 1, hasArbitraryFilters = false } = {}) {
  const category = categoryKey ? CATEGORY_DEFINITIONS[categoryKey] : null;
  const filtered = category ? products.filter((entity) => category.forms.includes(entity.effective.productForm || entity.effective.categoryName)) : products;
  const stable = [...filtered].sort((a, b) => a.effective.title.localeCompare(b.effective.title, "nl") || a.sourceId.localeCompare(b.sourceId));
  const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
  const start = (safePage - 1) * PAGE_SIZE;
  const batch = stable.slice(start, start + PAGE_SIZE);
  const basePath = category ? `/cannabis/${categoryKey}` : "/cannabis";
  const nextPath = start + PAGE_SIZE < stable.length ? `${basePath}?pagina=${safePage + 1}` : null;
  const label = category?.label || "Cannabisproducten";
  const robots = hasArbitraryFilters || safePage > 1 ? "noindex,follow" : "index,follow";
  const description = category ? `Bekijk ${category.label.toLowerCase()}producten en de bijbehorende telers op WeedInfo.` : "Bekijk gereguleerde cannabisproducten en filter op een vaste productcategorie.";
  const graph = [
    { "@type": "CollectionPage", "@id": `${absolute(basePath)}#pagina`, name: label, description, url: absolute(basePath) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Cannabis", item: absolute("/cannabis") }, ...(category ? [{ "@type": "ListItem", position: 2, name: category.label, item: absolute(basePath) }] : [])] },
    { "@type": "ItemList", itemListElement: batch.map((entity, index) => ({ "@type": "ListItem", position: start + index + 1, name: entity.effective.title, url: absolute(entity.effective.canonicalPath) })) },
  ];
  const body = `<nav aria-label="Kruimelpad"><a href="/">Home</a>${category ? ' / <a href="/cannabis">Cannabis</a> / ' + esc(category.label) : " / Cannabis"}</nav><h1>${esc(label)}</h1><p>${esc(description)}</p>${categories(categoryKey)}<p><strong>${stable.length}</strong> producten</p><ul class="products" data-product-list>${batch.map(productItem).join("")}</ul><p class="loading" role="status" aria-live="polite" data-loading>Meer producten laden…</p>${nextPath ? `<a class="more" rel="next" data-load-more href="${nextPath}">Meer producten laden</a>` : ""}${listingScript()}`;
  return shell({ title: `${label} | WeedInfo`, description, canonical: basePath, robots, body, graph });
}

const LEGAL_PAGES = Object.freeze({
  "/over-weedinfo": { title: "Over WeedInfo", description: "WeedInfo is een onafhankelijk informatieplatform over gereguleerde cannabisproducten en telers.", body: `<h1>Over WeedInfo</h1><p>WeedInfo helpt consumenten feitelijke informatie over gereguleerde cannabisproducten en telers te vinden.</p><p>WeedInfo verkoopt geen cannabis, neemt geen bestellingen aan en bemiddelt niet bij verkoop of reserveringen.</p>` },
  "/informatie/gezondheid-en-risicos": { title: "Gezondheid en risico's", description: "Feitelijke informatie over effecten en gezondheidsrisico's van cannabisgebruik.", body: `<nav aria-label="Kruimelpad"><a href="/">Home</a> / <a href="/info">Informatie</a> / Gezondheid en risico's</nav><h1>Gezondheid en risico's</h1><p class="notice"><strong>Deze informatie is algemeen en geen persoonlijk medisch advies.</strong> Bespreek vragen over je gezondheid of medicatie met een arts.</p>
  <section><h2>Werking en acute effecten</h2><p>THC is de stof die vooral verantwoordelijk is voor het bedwelmende effect. CBD bedwelmt niet op dezelfde manier. Effecten verschillen per persoon, hoeveelheid, sterkte, gebruikswijze en situatie. Mogelijke acute effecten zijn ontspanning of een veranderde waarneming, maar ook slechter geheugen en reactievermogen, duizeligheid, angst, paniek of achterdocht.</p></section>
  <section><h2>Hoeveelheid, sterkte en combineren</h2><p>Een hogere dosis of meer THC kan de effecten en risico's vergroten. Bij eetbare producten kan de werking later beginnen, waardoor te snel bijnemen extra risico geeft. Combineren met alcohol, medicijnen of andere middelen kan onvoorspelbare of sterkere effecten veroorzaken.</p></section>
  <section><h2>Verkeer, zwangerschap en jongeren</h2><p>Neem niet deel aan het verkeer onder invloed: aandacht en reactievermogen kunnen verminderen. Gebruik geen cannabis tijdens zwangerschap of borstvoeding. Jong beginnen en frequent gebruik hangen samen met grotere risico's; WeedInfo is daarom uitsluitend voor volwassenen.</p></section>
  <section><h2>Mentale gezondheid en afhankelijkheid</h2><p>Frequent gebruik kan leiden tot afhankelijkheid en problemen op school, werk of in relaties. Cannabis kan angst of psychotische klachten uitlokken of verergeren, vooral bij kwetsbaarheid daarvoor. Wees extra voorzichtig bij psychische klachten, hartproblemen, medicijngebruik of eerdere vervelende ervaringen.</p></section>
  <section><h2>Bij een vervelende ervaring</h2><p>Ga naar een rustige, veilige plek, beperk prikkels en blijf bij iemand die je vertrouwt. Neem niets extra's en neem niet deel aan het verkeer. Bel 112 bij bewusteloosheid, ernstige lichamelijke klachten of een onveilige situatie. Neem voor niet-acute zorgen contact op met een arts of verslavingszorg.</p></section>
  <section><h2>Betrouwbare hulp en bronnen</h2><ul><li><a href="https://www.trimbos.nl/kennis/drugs/informatiepermiddel/cannabis/">Trimbos-instituut: cannabis</a></li><li><a href="https://www.jellinek.nl/informatie-over-alcohol-drugs/cannabis/">Jellinek: cannabis en hulp</a></li><li><a href="https://www.rijksoverheid.nl/onderwerpen/drugs/regels-cannabis">Rijksoverheid: regels rond cannabis</a></li></ul></section>` },
  "/privacy": { title: "Privacy", description: "Hoe WeedInfo zorgvuldig omgaat met persoonsgegevens.", body: `<h1>Privacy</h1><p>WeedInfo verwerkt alleen persoonsgegevens die nodig zijn voor de gebruikte functies, beveiliging en werking van de website.</p><p>Account-, contact- en reviewgegevens worden niet voor verkoopdoeleinden gebruikt. Je kunt vragen stellen over inzage, correctie of verwijdering via de contactmogelijkheid van WeedInfo.</p>` },
  "/cookies": { title: "Cookies", description: "Informatie over cookies en lokale opslag op WeedInfo.", body: `<h1>Cookies en lokale opslag</h1><p>WeedInfo gebruikt functionele opslag voor de werking van de website en PWA. Niet-noodzakelijke analytics mogen pas na een geldige keuze worden geactiveerd.</p><p>Je kunt opgeslagen websitegegevens via de instellingen van je browser verwijderen.</p>` },
  "/gebruiksvoorwaarden": { title: "Gebruiksvoorwaarden", description: "Voorwaarden voor het gebruik van WeedInfo.", body: `<h1>Gebruiksvoorwaarden</h1><p>Gebruik WeedInfo uitsluitend als informatiebron. De informatie is geen verkoopaanbod, medisch advies of uitnodiging om cannabis te gebruiken.</p><p>Gebruikersbijdragen mogen niet misleidend, commercieel, beledigend of in strijd met de wet zijn.</p>` },
  "/disclaimer": { title: "Disclaimer", description: "Toelichting op de informatieve rol van WeedInfo.", body: `<h1>Disclaimer</h1><p>WeedInfo streeft naar actuele en juiste informatie, maar kan niet garanderen dat alle informatie altijd volledig of foutloos is.</p><p>WeedInfo verkoopt geen cannabis, bemiddelt niet bij verkoop en geeft geen medisch advies. Controleer belangrijke informatie bij een bevoegde of officiële bron.</p>` },
});
export function isLegalPath(pathname) { return Object.hasOwn(LEGAL_PAGES, pathname); }
export function renderLegal(pathname) { const page = LEGAL_PAGES[pathname]; return shell({ title: `${page.title} | WeedInfo`, description: page.description, canonical: pathname, body: page.body }); }
export function categorySitemapXml() { return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/cannabis", ...CATEGORY_PATHS, "/", "/over-weedinfo", "/informatie/gezondheid-en-risicos", "/privacy", "/cookies", "/gebruiksvoorwaarden", "/disclaimer"].map((path) => `<url><loc>${absolute(path)}</loc></url>`).join("")}</urlset>`; }
