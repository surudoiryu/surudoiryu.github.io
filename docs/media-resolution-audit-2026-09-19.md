# VerdiQ-mediaflow audit — 19 september 2026

> Historisch onderzoek van de oude signed-URL-architectuur. Vervangen door het [publieke statische mediacontract](public-verdiq-media-migration-2026-09-19.md); de hieronder beschreven WeedInfo-proxy bestaat niet meer.

## Conclusie

`cmu4mgcpr0000zt4jh6xe5esb` is het immutable mediarecord-ID uit `tenants.logoMediaId` van Aardachtig. Het is geen URL. VerdiQ resolveert dit officieel met de GraphQL-query `signViewUrl(mediaId)`. De response verwijst naar `https://media.verdiq.nl/verdiq-media/...` en is een S3-presigned GET-URL met `X-Amz-Expires=300`.

WeedInfo schreef het ID tot nu toe als `thumbnailUrl` en `images.logo` naar de afgeleide Firestore-cache. Het Public read model kopieerde dit vervolgens als `effective.image`; verschillende componenten gebruikten die waarde rechtstreeks of als fallback in `<img src>`. De bestaande browserresolver kon alleen signeren met een browser-API-key, maar browsercredentials zijn terecht uitgeschakeld. Daardoor bleef het raw ID over.

## Live read-only audit

GraphQL op 19 september 2026:

| Type | Totaal | Media-ID | Geen media-ID | Resolver levert bestaand beeld |
|---|---:|---:|---:|---:|
| Telers | 9 | 9 | 0 | 1 |
| Producten | 458 | 3 | 455 | 1 |

- Aardachtig: `logoMediaId=cmu4mgcpr0000zt4jh6xe5esb`, resolveert naar PNG.
- Foto Product: `mainImageId=cmu4mll190001zt4j1whtanum`, resolveert naar JPEG.
- De overige acht telerlogo-ID’s en twee product-image-ID’s krijgen wel een signed URL van `signViewUrl`, maar de objectstore antwoordt met HTTP 404.
- Alle twaalf signed URLs zijn tijdelijk (`X-Amz-Expires=300`).
- Geen dubbele media-ID’s gevonden.
- `promoImageId`: 0 van 458 producten.

De tien 404-objecten zijn `source_media_conflict`/orphaned media in VerdiQ. WeedInfo construeert hiervoor geen opslagpad en vervangt de bronidentiteit niet.

## Structurele oplossing

- Firestore/sourcecache blijft het immutable media-ID bewaren.
- Publice afbeeldingswaarden worden genormaliseerd naar `/media/{immutableMediaId}`.
- De SSR-server roept server-side `signViewUrl` aan, accepteert uitsluitend HTTPS-resources op `media.verdiq.nl`, controleert `image/*`, begrenst responses op 12 MiB en proxyt de bytes.
- GraphQL-credentials en signed URLs komen niet in HTML of browserbundles.
- Signed URLs worden niet gecachet (`0 seconden`) en bestaan alleen binnen één serverrequest.
- Geverifieerde image-bytes worden vijftien minuten in het serverproces gecachet. De HTTP-response gebruikt `max-age=86400`, `s-maxage=604800` en `stale-while-revalidate=86400`. Dit is praktisch lang maar niet oneindig, omdat VerdiQ alleen binnen de normale uploadflow een nieuw immutable media-ID garandeert.
- GraphQL NotFound, storage 404 en ongeschikte MIME-types worden zestig seconden negatief gecachet. Autorisatiefouten worden afzonderlijk gelogd en slechts dertig seconden gecachet.
- Niet-resolveerbare media redirecten naar de WeedInfo-placeholder. Raw IDs, tijdelijke signed URLs en ongeldige strings worden nooit als `src` gebruikt.
- `/media/{id}` accepteert uitsluitend logo- en main-image-ID's van gepubliceerde entiteiten uit de actieve PublicGeneration. Een ander geldig VerdiQ MediaAsset-ID wordt met HTTP 404 geweigerd voordat `signViewUrl` wordt aangeroepen.

## Performance

Lazy loading en vaste dimensies blijven behouden. De proxy haalt een object pas op wanneer de afbeelding wordt aangevraagd. Resizing, WebP en AVIF zijn nog niet geïmplementeerd: daarvoor ontbreekt momenteel een betrouwbare image-transformlaag. Aanbevolen vervolg is dezelfde immutable proxykey uitbreiden met gecontroleerde varianten (`card`, `detail`) via een image-CDN of server-side transformer, zonder originele bronownership over te nemen.

## Resterende blockers

1. VerdiQ moet de acht telerlogo-ID’s en twee product-image-ID’s herstellen of vervangen; de officiële resolver wijst nu naar ontbrekende objecten.
2. 455 producten hebben geen `mainImageId`; WeedInfo toont daarvoor bewust een placeholder.
3. Werkelijke card/detail-resizing en moderne formaten vereisen een gekozen transformservice en rechten-/opslagbesluit.

Er zijn geen Firestore-writes, syncwrites, deployments, DNS- of cloudwijzigingen uitgevoerd.
