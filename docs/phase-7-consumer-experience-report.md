# Fase 7 — Consumer experience, performance & compliance

Status: lokaal uitgevoerd op 18 september 2026. Geen deployment, hosting-, DNS-, cloud- of productiewijziging uitgevoerd. Er is geen Firebase Admin-key gebruikt. VerdiQ blijft de source of truth; de SSR-routes lezen uitsluitend het bestaande generation-aware publieke read-model.

## Resultaat

De publieke ervaring is lokaal omgebouwd naar een consumentgerichte, server-rendered catalogus. De hoofdnavigatie bestaat uit Cannabis, Telers, Informatie en Zoeken. WeedInfo positioneert zich zichtbaar als onafhankelijk informatieplatform waarop niet gekocht, besteld of gereserveerd kan worden. Coffeeshops, prijzen, aanbiedingen, voorraad en product/shop-availability zijn niet in de nieuwe catalogus gepubliceerd.

Interne termen zoals VerdiQ, GraphQL, PublicGeneration, sourceId, publicationStatus en provenance zijn niet aanwezig in geteste consument-HTML. Interne IDs blijven noodzakelijk in servercode en het read-model, maar worden niet als UI-tekst of DOM-attribuut gepubliceerd. Diagnostische endpoints zoals `/readyz` en `/__generation` zijn operationele uitzonderingen en geen consumentenpagina's.

## Gewijzigde onderdelen

- `server/consumer-render.mjs`: SSR-home, catalogus, categorieën, teleroverzicht, informatie- en juridische pagina's, semantische HTML en progressief laden.
- `server/catalog-app.mjs`: routes, robotsheaders en pages-sitemap bovenop de actieve generation.
- `server/entity-render.mjs`: consumententaal, semantische navigatie en publieke JSON-LD-identiteiten.
- `server/phase7-consumer.test.mjs`: regressietests voor categorieën, SSR-batches, terminologie, noindex en afwezigheid van shopclaims.
- `src/Home.tsx`, `src/components/TopBar.tsx`, `src/components/SiteFooter.tsx`: positionering, navigatie en directe discovery-links.
- `src/ProductsOverview.tsx`, `src/components/BrandProducts.tsx`: echte productvormfilters, 24-items batches, desktop/mobile scroll en progressive loading.
- `src/components/ProductCard.tsx`: echte links, lazy images, decoding en dimensies.
- `src/components/GtmManager.tsx`: analytics standaard uit; laden alleen na expliciete consentwaarde.
- `src/App.tsx`, `src/LegalPage.tsx`: vaste categorie- en informatiepaden.
- `public/offline.html`, `public/manifest.json`: geldige, neutrale PWA-fallback en metadata.

## Categorieën en routes

De classificatie gebruikt uitsluitend de werkelijk aanwezige `categoryName`/`productForm` uit het bronmodel:

| Publieke route | Exacte bronwaarden | Aantal actieve producten |
|---|---|---:|
| `/cannabis/wiet` | `Wiet` | 189 |
| `/cannabis/hasj` | `Hasj` | 111 |
| `/cannabis/joints` | `Joints Wiet`, `Joints Hasj` | 95 |
| `/cannabis/edibles` | `Edibles` | 41 |
| Geen hoofdlandingspagina | `Vapes` | 22 |

Iedere vaste route heeft SSR-content, een unieke title/description, H1, breadcrumb, self-canonical, ItemList/CollectionPage JSON-LD, echte productlinks en opname in `/sitemap-pages.xml`. Gelijke namen blijven afzonderlijke entities; sortering gebruikt titel en daarna immutable ID voor een deterministische volgorde.

`/cannabis` toont initieel 24 producten. Een normale `?pagina=N`-URL werkt zonder JavaScript en pagina 2+ is `noindex,follow`. JavaScript voegt progressive loading toe via IntersectionObserver én een zichtbare knop. Willekeurige filterqueries blijven `noindex,follow` en canoniseren naar de vaste route.

## Bronveld- en publicatiematrix

| Informatiedimensie | Live GraphQL-bron | Normale cachemapping | Public-model/UI | Bevinding |
|---|---|---|---|---|
| immutable product-ID, naam, telerrelatie | ja | ja | ja | leidend voor identiteit/links |
| categorie en subcategorie | ja | ja | ja | gebruikt voor exacte filters |
| bronbeschrijving | ja | ja | ja | override/editorial/source-volgorde blijft behouden |
| hoofd-/promoafbeelding | ja | ja | hoofdafbeelding | promo-media niet publiek benodigd |
| THC/CBD | ja | ja | min/maxvelden aanwezig | bestaande sync leidt marges af; niet als exacte bronclaim presenteren |
| terpenen en smaakprofiel | ja | ja | niet volledig | mapping gap; niet door UI invullen of raden |
| positieve/negatieve effecten | ja | ja | niet volledig | gezondheidsclaimrisico; eerst redactioneel/juridisch beleid |
| variantenamen | ja | ja | ja | beperkte publieke variantinformatie |
| gewicht, pack size, mg/unit, SKU | ja | ja | nee | mapping gap; alleen toevoegen met bron- en presentatieregels |
| leaflet/promo-video | ja | ja | nee | mapping gap, geen blokkade voor catalogus |
| shops/availability | bronrelaties mogelijk | intern | niet gepubliceerd | bewust geblokkeerd wegens legal review |

De audit bevestigt 458 actieve producten en 9 actieve telers in de huidige publieke generation. Voor detailvelden is geen browser-GraphQL-call toegevoegd. De consumentenlaag maakt geen ontbrekende eigenschappen of marketingclaims aan.

## UX, filters en afbeeldingen

- Desktopfilters blijven binnen `calc(100vh - 112px)` en scrollen intern.
- De mobiele filterlade gebruikt maximaal `92dvh`, interne scroll, dialoogsemantiek en een label.
- Hoofdproductvormen staan vóór verdere eigenschappen. Filters worden uit echte velden opgebouwd, niet uit productnamen.
- Productafbeelding en titel zijn normale links; essentieel navigeren vereist geen click-handler.
- Productafbeeldingen zijn lazy, async decoded en hebben gereserveerde afmetingen/aspect-ratio.
- Het SPA-homebeeld is gewijzigd van `header.png` (3.125 MB) naar een bestaand beeld van 362.387 bytes: circa 88,4% minder bronbytes.
- SSR-home en de eerste SSR-catalogusbatch vragen initieel nul productafbeeldingen op. De SPA-catalogus rendert maximaal 24 kaarten vóór verdere interactie in plaats van maximaal 458.

Er staan nog ongebruikte afbeeldingen van circa 4–5 MB in `public/images`. Verwijderen is buiten scope omdat gebruik/ownership niet volledig bewezen is. Een formatconversie naar AVIF/WebP en responsieve `srcset` vereist een afzonderlijke assetpipeline.

## Performance

Lokale credentialvrije rendererbenchmark met 458 synthetische records, 500 iteraties:

| Meting | Resultaat |
|---|---:|
| p50 SSR-render | 0,066 ms |
| p95 SSR-render | 0,193 ms |
| maximum | 9,743 ms |
| `/cannabis` HTML | 11.909 bytes |
| home HTML | 4.430 bytes |
| initiële kaarten | 24 |
| initiële `<img>`-tags | 0 |

Dit is een renderer-microbenchmark en geen end-to-end latency of Core Web Vitals-meting. Budgetten voor staging: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 op p75 mobiel; SSR TTFB p95 ≤ 800 ms; initiële JS gzip bij voorkeur ≤ 250 kB. De huidige CRA-mainbundle is 279,92 kB gzip en overschrijdt het voorkeursbudget met 29,92 kB. Route-level splitting bestaat, maar verdere reductie is nodig.

`requires_staging`: echte mobiele/desktop LCP, INP, CLS, TTFB, cacheheaders via CDN, service-worker upgrade/offlinegedrag en throttled netwerkmetingen.

## Toegankelijkheid

Toegevoegd/gecontroleerd: Nederlandstalig document, landmarks, skiplink, H1, breadcrumbnav, normale anchors, zichtbare `:focus-visible`, reduced-motion, live loadingstatus, bedienbare load-more-knop en responsieve éénkolomsweergave. De kleurkeuzes gebruiken een donkere groene tekst op lichte vlakken; een geautomatiseerde axe- en handmatige screenreader-/zoomtest blijft `requires_staging` omdat deze browserintegratie hier niet beschikbaar is.

## Compliance-audit

| Ernst | Bevinding | Status/advies |
|---|---|---|
| kritiek | Lokale CRA-build bevat bestaande `REACT_APP_GRAPHQL_AUTH_TOKEN` en `REACT_APP_GRAPHQL_API_KEY` waarden | publicatie blokkeren; uitsluitend bouwen in een geschoonde omgeving zonder serversecrets en secret-audit als harde gate |
| hoog | Reviews zijn gebruikersinhoud maar missen zichtbare verificatiestatus, rapportage/moderatie en gezondheidsclaimbeleid | niet “verified” noemen; moderation/reporting en bronlabel ontwerpen vóór opschaling |
| hoog | Bestaande sync maakt THC-min/max als ±5 rond een bronwaarde en bevat effectfallbacks | niet als bronfeit presenteren; mappingcontract corrigeren vóór deze velden prominent worden gebruikt |
| midden | Privacy/cookiepagina is functioneel maar geen volledige verwerkingsinventaris met verantwoordelijke, bewaartermijnen, ontvangers en rechten/contact | juridisch aanvullen vóór productie |
| midden | Consent schakelt analytics standaard uit, maar er is nog geen volwaardige consent-UI voor accepteren/weigeren/intrekken | CMP/voorkeurenscherm toevoegen en browsermatig bewijzen |
| midden | Gezondheidsinformatie is kort en verwijst naar Trimbos | redactionele/juridische review; actualiteitsdatum en verantwoordelijke toevoegen |
| laag | Algemene voorwaarden/disclaimer zijn functionele startteksten | juridisch laten valideren; disclaimer vervangt geen correcte inhoud of zorgplicht |

Nederlandse overheidsregels rond het experiment verbieden reclame door deelnemende telers/coffeeshops, vereisen leeftijdscontrole door coffeeshops en informatie over gezondheidsrisico's. Productverpakking kent daarnaast informatie- en waarschuwingseisen. WeedInfo is geen verkooppunt, maar de UX moet informatief en niet-promotioneel blijven. Trackingcookies mogen pas na een vrije, geïnformeerde en actieve keuze laden; weigeren en later intrekken moeten mogelijk zijn en de site moet functioneel blijven.

## Wijzigingen die product-/telergoedkeuring vereisen

Deze zijn bewust niet doorgevoerd:

| Entity/veld | Huidige situatie | Voorgestelde vervolgstap |
|---|---|---|
| Aardachtig — beschrijving | zeer korte bron/redactionele tekst | feitelijke uitbreiding laten aanleveren en goedkeuren; geen marketingtekst genereren |
| CanAdelaar — beschrijving | zeer korte bron/redactionele tekst | idem |
| Producteffecten/smaken/terpenen | bronvelden niet volledig in Public-model | veld-voor-veld provenance en claimbeleid goedkeuren vóór publicatie |
| THC/CBD-bereiken | deels afgeleid door sync | vervangen door exact bronmodel of expliciet als afleiding labelen na goedkeuring |
| Reviews op product/teler | geen verificatie/moderatiepropositie | labels, beleid, klachtenroute en toekomstige kassaverificatie goedkeuren |

Korte beschrijvingen zijn niet automatisch `noindex`; informatiewaarde blijft een combinatie van identiteit, relaties, classificatie, eigenschappen en redactionele inhoud.

## Tests en build

- Node-regressies: 48/48 geslaagd.
- Fase-7-tests dekken consumentterminologie, vier categorieën, canonicals, breadcrumbs, 24-items batches, no-JS-links, noindexfilters, informatiepagina's en het ontbreken van shop-/prijs-/availabilityclaims.
- CRA-productionbuild: geslaagd met twee bestaande React-hookwaarschuwingen en verouderde CRA/Browserslist-waarschuwingen.
- Main JS: 279,92 kB gzip.
- Secret-audit: **rood**; server-only GraphQLwaarden zijn aantoonbaar in de lokale browserbundle opgenomen. `build/` mag niet worden gepubliceerd.

## Releaseblockers en `requires_staging`

Harde blockers vóór enige release:

1. Een volledig schone frontend-build zonder `REACT_APP_GRAPHQL_*` of andere servercredentials, gevolgd door een groene bundle-secret-audit.
2. Volledige privacy/cookieverwerkingsinventaris en werkende consentkeuze/intrekking.
3. Besluit en beleid voor reviewmoderatie, verificatielabels en gezondheidsclaims.
4. Correctie of expliciete goedkeuring van afgeleide THC/CBD- en effectmapping voordat deze als feiten worden getoond.

`requires_staging`: Core Web Vitals en netwerkprofielen, browser-accessibility/axe, consent- en analyticsverkeer, PWA-update/offlineflow, CDN-cacheheaders, redirects/statuscodes achter de uiteindelijke edge en CSP in de uiteindelijke hostingketen.

Fase 4/5, shoppublicatie, availability, deployment en hosting zijn niet gestart of gewijzigd.
