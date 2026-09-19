# WeedInfo production-readiness runbook

Status: technisch voorbereid; niet gedeployed. VerdiQ blijft source of truth. PublicShops en availability blijven uitgesloten.

## Huidige productiearchitectuur en incompatibiliteiten

- CRA build via `react-scripts`, publicatie met `gh-pages -d build`, custom domain uit `public/CNAME`: `weedinfo.nl`.
- `package.json.homepage` wees naar `surudoiryu.github.io`; dit is lokaal gecorrigeerd naar het canonieke domein.
- GitHub Pages kan de Node SSR-processen, Firestore Admin repository, redirects/statuscodes, healthchecks en generation switching niet uitvoeren.
- De oude `404.html` zet deep links client-side om naar `/?pwa_path=...`; crawlers ontvangen dus geen entity-HTML of correcte 301/404.
- De oude service worker stuurde alle navigaties naar `index.html` en had een globale cache-first handler. Dit kon SSR en nieuwe canonicals langdurig maskeren.
- `firebase.json` bevat alleen Firestore rules; er is nog geen actieve Hosting-configuratie of `.firebaserc`.
- De SPA leest verschillende broncollecties rechtstreeks uit Firestore. Voor publieke entitynavigatie moet SSR/PublicGeneration leidend worden; interactieve account/PWA-functies mogen enhancement blijven.

## Voorkeursarchitectuur

Voorkeur: een containerized Node SSR-service op Cloud Run achter Firebase Hosting.

- Firebase Hosting: custom domain, beheerd TLS, CDN voor fingerprinted assets, `robots.txt`, manifest en service worker; alle dynamische routes rewriten naar Cloud Run.
- Cloud Run: `server/catalog-server.mjs`, generation-aware Firestore Admin reads, immutable revision rollback en gestructureerde stdout/stderr-logging.
- Firestore: uitsluitend actieve immutable PublicGeneration; workload identity/service account met minimale readrechten op PublicConfig/PublicGenerations.
- Voorgestelde maar niet actieve config: `docs/deployment/firebase.hosting.proposed.json` en `Dockerfile.ssr`.

Waarom niet GitHub Pages: geen serverruntime of statuscode-/redirectcontrole. App Hosting is technisch mogelijk via custom run command en biedt Cloud Run/CDN/GitHub-integratie, maar de huidige custom Node+CRA-combinatie heeft geen native frameworkadapter. Direct Cloud Run + Firebase Hosting sluit nauwkeuriger aan op de bestaande serverentrypoint, biedt revision tags/traffic rollback en houdt statische caching expliciet.

## Vereiste configuratie

- Runtime: `NODE_ENV=production`, `PORT`, `FIREBASE_PROJECT_ID`, `PUBLIC_SITE_ORIGIN=https://weedinfo.nl`, optioneel `PUBLIC_GENERATION_POINTER_TTL_MS=1000`.
- Cloud Run service account via Application Default Credentials; geen private key in container/environment wanneer workload identity beschikbaar is.
- Syncworker apart van web runtime: expliciete niet-localhost `GRAPHQL_ENDPOINT`; tokens/API keys in Secret Manager.
- Productiestart faalt hard bij ontbrekende project/site-config, gedeeltelijke service-accountconfig of localhost-GraphQL.
- Firestore en Cloud Run gebruiken `europe-west3`; de stagingconfiguratie is hierop vastgezet.

## Cachebeleid

| Resource | Beleid |
|---|---|
| Fingerprinted `/static/**` | `public,max-age=31536000,immutable` |
| Service worker | `no-cache,no-store,must-revalidate` via Hosting |
| Product/teler HTML | `public,max-age=0,s-maxage=60,stale-while-revalidate=30` |
| Zoekpagina | `private,no-store`, `noindex,follow` |
| Sitemap | `public,max-age=60,s-maxage=300,stale-while-revalidate=60` |
| robots.txt | `public,max-age=300` |
| QR 302 | `public,max-age=60,s-maxage=300`, `noindex` |
| Legacy 301 | `public,max-age=3600,s-maxage=86400`, `noindex` |

De server controleert de generationpointer maximaal één seconde gecachet. Routes/entities/artifacts zijn uitsluitend onder `generationId` gecachet. Een nieuwe generation kan dus nooit data onder een oude cachekey vervangen.

## Service-worker migratie

Nieuwe worker: `skipWaiting`, `clientsClaim`, cleanup van verouderde Workbox-precache en expliciete verwijdering van oude `cache_weedinfo` caches. Navigaties zijn network-authoritative; alleen bij echte netwerkfout volgt `/offline.html`. Alleen statische afbeeldingen behouden stale-while-revalidate. De app-shell navigation fallback en globale cache-first fetch-handler zijn verwijderd.

Cutover-test: installeer eerst de huidige productie-PWA, bezoek meerdere entityroutes, deploy daarna uitsluitend naar een staginghost, forceer update, herlaad open tabs, bevestig dat de controller wisselt, oude cache verdwijnt, online navigatie SSR-header/generation toont en offline navigatie uitsluitend de offlinepagina toont.

## URL-migratie en canonical host

Canonical beleid: uitsluitend `https://weedinfo.nl`, zonder trailing slash behalve `/`. Hosting/load balancer doet één permanente hop voor `http`, `www.weedinfo.nl`, Firebase-host en Cloud Run-host naar de apex HTTPS-host. Queryparameters horen niet in entitycanonicals.

Audit: 418 product/teler-URL's blijven identiek; 49 productentities gebruiken een nieuwe canonical. Die 49 komen uit 21 gedeelde oude slugs. Omdat één oude URL meerdere immutable entities representeerde, mag deze niet willekeurig naar één product 301'en. Maak per gedeelde legacy-URL een expliciete noindex-disambiguatiepagina met links naar alle actuele entities, of kies pas na aantoonbare historische ownership één 301-bestemming. Er zijn nul redirectchains gevonden.

Statische migratiematrix:

- `/`, `/kaart`, `/voorwaarden`, `/privacy`, `/cookies`, `/disclaimer`: SPA-route behouden tijdens incrementele migratie.
- `/cannabis`, `/telers`: behouden totdat SSR-overviewentities gematerialiseerd zijn.
- `/zoeken`: SSR-search vervangt de oude SPA-redirect naar `/info`.
- `/blog`: één 301 naar `/info`.
- `/cannabis-winkel/*`: bestaande SPA-weergave behouden; geen PublicShop/availability ontsluiten.
- `/?pwa_path=...`: tijdens cutover éénmalig server-side decoderen naar de oorspronkelijke route; daarna de GitHub Pages 404-truc verwijderen.
- Hashrouter: niet aangetroffen. Filterqueries blijven bereikbaar maar `noindex,follow`.

## Observability en health

- `/healthz`: procesliveness, geen Firestore-afhankelijkheid.
- `/readyz`: verse generationpointer plus actieve generationmetadata; 503 wanneer niet gereed.
- `/__generation`: actieve generation-ID voor smoke/diagnose, `no-store`.
- Gestructureerde logs: requestcategorie, status, latency en generation-ID; geen volledige zoekquery, IP, e-mail of zoekhistorie.
- Expliciete events: SSR-fout en generation activation failure. Cloud Monitoring alerts configureren op 5xx-rate, p95 latency, readiness, Firestore errors en activation failures. Sitemap/search/QR zijn afzonderlijke logcategorieën; onbekende QR volgt via 404-metric.
- Canonical gate blijft hard falen vóór writes.

## Generationretentie

- Actieve en `previousGenerationId` altijd beschermen.
- Minimaal drie recente succesvolle generations bewaren.
- `building`, `failed`, `inactive` en `rolled_back` pas na 30 dagen kandidaat maken.
- Eerst dry-run beoordelen; nooit referenced generations verwijderen.
- `scripts/public-generation-cleanup.mjs` is bewust read-only en voert nul deletes uit.

## Exacte deploymentvolgorde

1. Blockers oplossen: tracked `.env` verwijderen uit huidige tree en Git-historie; alle mogelijk blootgestelde GraphQL/servicecredentials roteren.
2. Firestore-regio en beoogde Cloud Run-regio bevestigen; dedicated least-privilege runtime service account maken.
3. Productievariabelen en secrets in Secret Manager/config zetten; nergens client-side GraphQL-secrets bundelen.
4. Nogmaals tests, CRA build, Docker build en dependency/securityscan uitvoeren.
5. Nieuwe PublicGeneration dry-run; canonical/identity/search/sitemap gates controleren.
6. Cloud Run revision bouwen en deployen met **0% verkeer** of revision tag; geen custom domain wijzigen.
7. Revision-tag URL testen met productie-readonly Firestore en alle smokechecks hieronder.
8. Firebase Hosting preview channel met Cloud Run rewrite en `pinTag` testen.
9. Service-worker upgradepad testen vanaf een installatie van de huidige productie-PWA.
10. Legacy 21 gedeelde-slugbeslissingen vastleggen en migration routes aan generation toevoegen.
11. Backups, actieve/previous generation en huidige GitHub Pages deployment-ID noteren.
12. In gepland venster Firebase Hosting/custom domain voorbereiden; eerst certificaat/hostvalidatie, daarna DNS volgens providerwizard. Geen gegokte records.
13. Apex `https://weedinfo.nl` activeren; `www`, HTTP en providerhosts naar één hop laten redirecten.
14. Direct smokecheck en monitoring; bij fout applicatierollback of generationrollback onafhankelijk uitvoeren.

## Post-deployment smokecheck

- Homepage en statische assets; mobile viewport.
- Normaal product, beide `test2` fallbackproducten en wiet/hasj/joint-conflictgroep.
- Teler met productanchors.
- `/zoeken`, gecombineerde en fuzzy query; HTML `noindex,follow`.
- Sitemapindex/product/grower; geen QR/search/redirect/noindex URL.
- robots.txt verwijst naar apex sitemap.
- QR geeft 302 naar dezelfde immutable entitycanonical; onbekende QR geeft 404.
- Onbekende entity geeft echte 404.
- Canonical is apex HTTPS en self-referencing; trailing slash één hop.
- JSON-LD immutable IDs, zonder offers/availability/fictieve reviews.
- No-JS HTML bevat title, description, H1, hoofdcontent en anchors.
- Securityheaders aanwezig.
- Nieuwe PWA-installatie en update van bestaande PWA; online SSR blijft leidend.
- `/healthz`, `/readyz`, `/__generation` correct.
- Generationpointer wissel binnen maximaal korte cachewindow zichtbaar.
- Applicatierevision rollback en datapointerrollback vooraf en achteraf verifiëren.

## Rollback

Applicatie: zet Cloud Run traffic terug naar de vorige gezonde immutable revision, of rollback de gepinde Firebase Hosting release. Dit verandert geen Firestore-generation.

Data: transactioneel `PublicConfig/catalog.activeGenerationId` terugzetten naar `previousGenerationId`, metadata van de doelgeneration controleren en daarna `/readyz` plus steekproeven uitvoeren. Dit verandert geen applicatierevision, VerdiQ of Brands/Producten/Shops.

De twee rollbacklagen zijn bewust onafhankelijk.

## Staging blocker resolution update (2026-09-18)

- `.env` is uit Git tracking verwijderd maar lokaal behouden; `.env.example` bevat uitsluitend lege/veilige placeholders. Historische commits met `.env`: `ab9e087`, `5d4cfb7`, `6343017`, `50878da`, `64c4409`. History is niet herschreven.
- De oude production bundle bevatte de geconfigureerde GraphQL token- en API-keywaarden. Browser-auth is verwijderd en de herbouwde bundle bevat nul van deze waarden/identifiers. Reeds blootgestelde GraphQL-credentials moeten nog worden geroteerd.
- Firestore `(default)` is `FIRESTORE_NATIVE` in regionale locatie `europe-west3`; aanbevolen Cloud Run-regio is daarom definitief `europe-west3`.
- De 21 gedeelde legacyroutes zijn als generation-backed `ambiguity` routes gematerialiseerd in `public-20260918085618009`: 200, SSR, self-canonical, `noindex,follow`, links naar alle immutable entities, niet in sitemap.
- IAM API-activatie is aangevraagd, maar service-accountcreatie/rolbinding is niet afgerond. `roles/datastore.viewer` is read-only maar databasebreed; hiervoor is expliciete scopegoedkeuring nodig of een aparte public database/API-laag.
- Lokale containerbuild kon niet starten omdat Docker Desktop/Linux engine niet actief was.
- Cloud SDK en Firebase CLI zijn niet geïnstalleerd. Daardoor zijn Cloud Run revision, Hosting preview, Secret Manager en alerts nog niet uitgevoerd.

Exacte toekomstige commando's na credentialrotatie en IAM-goedkeuring (project/region eerst verifiëren):

```sh
gcloud config set project bugged-out-73939
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com secretmanager.googleapis.com monitoring.googleapis.com
gcloud builds submit --tag europe-west3-docker.pkg.dev/bugged-out-73939/weedinfo/ssr:COMMIT -f Dockerfile.ssr .
gcloud run deploy weedinfo-ssr --image europe-west3-docker.pkg.dev/bugged-out-73939/weedinfo/ssr:COMMIT --region europe-west3 --service-account weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com --no-traffic --tag staging --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=bugged-out-73939,PUBLIC_SITE_ORIGIN=https://weedinfo.nl
firebase hosting:channel:deploy staging --project bugged-out-73939
```

Gebruik vóór uitvoering de echte revision/tag URL uit Cloud Run en de preview URL uit Firebase; voeg geen DNS-record toe totdat Firebase die in de custom-domainwizard toont.
