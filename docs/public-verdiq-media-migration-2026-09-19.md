# Publiek VerdiQ-mediacontract voor statisch WeedInfo

WeedInfo op GitHub Pages gebruikt voor growerlogo's uitsluitend `Tenant.logoMediaId` en voor producthoofdafbeeldingen uitsluitend `Product.mainImageId`. Een geldig CUID (`^c[a-z0-9]{24}$`) wordt rechtstreeks `https://media.verdiq.nl/{mediaId}`. Een ontbrekend/ongeldig ID of een mislukte afbeeldingsrequest toont de bestaande placeholder. Promo-, leaflet-, video- en losse library-media zijn geen automatische hoofdafbeelding.

De oude Node `/media/{id}`-proxy, browser-signinghook en browser-cache voor signed URLs zijn verwijderd. De source/cache en Public-read-models bewaren immutable media-ID's, geen presigned URLs. Een normale catalogussync is nodig om bestaande Firestore-documenten ook daadwerkelijk van de expliciete `logoMediaId`/`mainImageId`-velden te voorzien; deze opdracht heeft geen Firestore-write uitgevoerd.

## Verificatie en blokkade

- 65/65 lokale server-/SEO-/PWA-tests slagen.
- TypeScript en de schone statische frontendbuild slagen.
- Bundle-secret-audit: geen VerdiQ-token/API-key/credentialwaarden of serversecret-identifiers in de browserbundel.
- De gebundelde frontend bevat de publieke `media.verdiq.nl`-route en geen WeedInfo `/media`-resolver.
- De helper produceert voor Aardachtig exact `https://media.verdiq.nl/cmu4mgcpr0000zt4jh6xe5esb`.
- Na VerdiQ's productiecorrectie gaf een anonieme `GET` op die URL HTTP **200**, `image/png`.
- Read-only Firestore-audit: alle 9 actieve Brands hebben nog geen `logoMediaId`, maar wel het originele immutable ID in `images.logo`; alle 458 actieve Producten missen nog `mainImageId`, terwijl 3 producten het oorspronkelijke ID in `images.main` hebben. Dit verklaarde de bijna overal getoonde placeholder. De frontend en serializers lezen die twee specifieke, gevalideerde overgangsvelden totdat een normale sync de expliciete velden vult. `thumbnailUrl`, promo en andere velden zijn géén mediafallback.

Er is niet gedeployed of gecommit en er zijn geen VerdiQ- of Firestore-writes uitgevoerd.
