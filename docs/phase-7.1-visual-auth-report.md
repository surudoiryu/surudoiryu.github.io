# Fase 7.1 — Visual UX, content depth & age/auth

Status: lokaal uitgevoerd op 18 september 2026. Geen cloud-, DNS-, hosting- of productiewijzigingen, geen Firebase Admin-key en geen productiewrites.

## Opgeleverd

- Rijkere homepage met hero, visuele category cards, platformintroductie, producten, telers, gereguleerde-cannabisblok, gezondheid en kennislinks. De SSR-home bevat dezelfde informatielagen zonder JavaScript.
- Eén herbruikbare `CategoryCards`-component op home en boven de filters van `/cannabis`; vaste routes en SEO-regels zijn behouden.
- Consumentenstatusbalk volledig verwijderd.
- Gezondheidspagina uitgebreid met werking, acute effecten, THC/CBD, dosis/sterkte, combineren, verkeer, zwangerschap, jongeren, mentale gezondheid, afhankelijkheid, extra voorzichtigheid, handelen bij een vervelende ervaring en hulpbronnen.
- Nieuwe geblurde, niet-interactieve 18+-overlay met focusbeheer via MUI Dialog, scroll lock, inert achtergrond, `age_verified`, `age_denied` en een gecontroleerde herstelkeuze. Verificatie verloopt na 180 dagen; denial na 24 uur. Er wordt geen geboortedatum voor de algemene gate opgeslagen.
- Header gebruikt een standaard toegankelijk accounticoon met tooltip en 48px touch target.
- Login en registratie hebben consistente auth-cards, labels, autocomplete, loading/errorstates en enumeration-bestendige resetmelding.
- Registratie vraagt geen avatar/header meer, maar een verplichte toegankelijke date-input.
- Eén kalenderaccurate leeftijdsregel wordt door client en serverpolicy gebruikt. Exact 18 en gisteren 18 zijn toegestaan; morgen 18, ongeldig, toekomstig en ouder dan 120 jaar worden geweigerd.
- Na een geslaagde controle bevat het voorgestelde profiel alleen `ageVerified: true` en `ageVerifiedAt`; de volledige geboortedatum wordt niet opgeslagen.

## Verwijderde statusreads

Uit `App.tsx` verwijderd:

- één permanente listener op `SyncStatus/graphql`;
- één permanente listener die de volledige collectie `Gebruikers` telde;
- één server-countread op `reviews` bij iedere appstart;
- daarna één review-countread per 60 seconden zolang de app open bleef;
- bijbehorende timer, state, summaryberekening en ontwikkelstatus-UI.

Andere listeners zijn ongemoeid gelaten omdat die product-, profiel-, review- of filterfunctionaliteit voeden.

## Informatiecontent en bronnen

Voorheen bestond gezondheid en risico's uit enkele regels. De pagina is nu zelfstandig bruikbaar, rustig opgedeeld in kaarten en voorzien van expliciete bron- en hulplinks. Gebruikte bronnen:

- Trimbos-instituut, cannabis en gezondheidseffecten;
- Jellinek, cannabis en omgaan met een vervelende ervaring;
- Rijksoverheid, regels voor cannabis en informatie rond het wietexperiment.

`/over-weedinfo`, privacy, cookies, voorwaarden en disclaimer zijn opnieuw beoordeeld. Ze zijn functioneel bruikbaar maar juridische eigenaar/contactgegevens, concrete verwerkers, bewaartermijnen en een volledige consentinterface blijven nodig vóór productie.

## Server-side leeftijdscontrole: harde grens

`server/registration-policy.mjs` is geïmplementeerd en getest, maar nog niet aan Firebase Auth gekoppeld. De huidige app maakt accounts rechtstreeks vanuit de browser aan. Clientvalidatie en Firestore Rules kunnen een aangepaste directe Firebase-signup niet betrouwbaar tegenhouden.

Daarom is echte serverhandhaving **niet als voltooid aangemerkt**. Vereist vóór productie:

1. Identity Platform/Firebase Auth `beforeCreate` blocking function of een uitsluitend server-side registratie-endpoint;
2. dezelfde `authorizeRegistration`-policy gebruiken vóór accountcreatie;
3. directe ongecontroleerde signup onmogelijk maken;
4. emulator- en stagingbewijs dat een minderjarige request geen Auth-user en geen profiel achterlaat.

Dit is `requires_staging` en een releaseblocker. De lokale UX stopt een minderjarige poging vóór de client-accountcall en zet `age_denied`, maar een cookie/localStoragewaarde is nadrukkelijk geen security boundary.

## Auth-securityaudit

| Onderwerp | Bevinding |
|---|---|
| Accountenumeratie | Login gebruikt een generieke fout; reset geeft altijd dezelfde melding. Goed op UI-niveau. |
| Brute force | Firebase Auth-bescherming is leidend; App Check/rate-limitgedrag moet in staging worden gevalideerd. |
| Wachtwoordreset | Toegevoegd met generieke bevestiging. |
| Sessies/logout | Firebase SDK beheert tokens; bestaande logout behouden. |
| Redirects | Login gebruikt een vaste `/profiel`-bestemming; geen open redirectparameter gevonden. |
| XSS | React escaped standaard profielvelden; URL-/profielvelden blijven inputvalidatie vereisen. |
| CSRF | Firebase bearer-tokenrequests gebruiken geen cookie-auth; serverendpoints moeten later Origin/CSRF-beleid krijgen. |
| Firestore Rules | Profielen alleen door eigenaar schrijfbaar; reviews door eigenaar. `Stats` en `ViewStats` laten momenteel publieke writes toe en verdienen rate limiting/App Check. |
| Server-age gate | Nog niet gekoppeld; harde blocker zoals hierboven. |

## Performance

Fase-7-eigenschappen zijn behouden: SSR, 24 initiële producten, progressive loading, no-JS-links, lazy productimages en afbeeldingsdimensies. Decoratie gebruikt CSS, typografie en kleine SVG/icon-componenten; er is geen nieuwe zware UI-library of megabytebeeld toegevoegd.

| Metriek | Fase 7 | Fase 7.1 |
|---|---:|---:|
| Main JS gzip | 279,92 kB | 283,88 kB |
| Verschil | — | +3,96 kB |
| Initiële catalogusitems | 24 | 24 |
| SSR-catalogusafbeeldingen initieel | 0 | 0 |

De bundle blijft boven het voorkeursbudget van 250 kB. Werkelijke LCP/INP/CLS en mobiele netwerkmetingen zijn `requires_staging`.

## Schone frontendbuild

`npm run build:frontend:clean` bouwt in een tijdelijke bronkopie waarin `.env` niet aanwezig is. Het originele `.env` wordt niet gelezen, verplaatst, gewijzigd of verwijderd. Output: `build-clean/`.

De bundle-secretgate is groen:

- geen GraphQL tokenwaarde;
- geen GraphQL API-keywaarde;
- geen server-only GraphQL credential-identifiers;
- geen ADC-pad;
- geen private key;
- `serverOnlyLeak: false`.

De oudere `build/` blijft besmet en mag niet worden gebruikt.

## Tests

56/56 Node-tests slagen. Nieuwe dekking omvat statusverwijdering, category cards op home/catalogus, age-state en achtergrondblokkade, DOB-registratie zonder afbeeldingsvelden, toegankelijk accounticoon, enumeration-bestendige authmeldingen, exacte leeftijdsgrenzen en DOB-dataminimalisatie. Bestaande SSR-, canonical-, search-, sitemap-, generation-, progressive-loading- en no-leaktests blijven groen.

## `requires_staging` en blockers

- Firebase Auth blocking function/serverregistratie en bewijs van zero partial account bij afwijzing.
- Browsermatige focustrap-, screenreader-, zoom- en axe-audit.
- Age-gategedrag met bfcache, meerdere tabs, PWA-installatie en offline modus.
- Core Web Vitals en echte netwerkmetingen.
- Firebase Auth rate limiting/App Check en misbruik van publieke Stats/ViewStats-writes.
- Volledige consent-UI en privacy/juridische validatie.

Product- en telerteksten zijn niet inhoudelijk gewijzigd. De bestaande approvalpunten voor korte telerteksten, effectvelden en afgeleide THC/CBD-bereiken blijven staan.
