# Public read model contract

## Collections

### `PublicGrowers/{verdiqTenantId}`

Materialized public grower document. Contains immutable `publicId`, source facts,
effective presentation, provenance, canonical route, publication status and IDs
of published products.

### `PublicProducts/{verdiqProductId}`

Materialized public product document. References the grower by immutable
`growerPublicId`, contains canonical/legacy routes, permanent QR path and
entity-safe product facts.

### `PublicRoutes/{encodedPath}`

Route registry. The document ID is `encodeURIComponent(path)`. A route is either
`entity` or `redirect`. This gives SSR one deterministic lookup and makes slug
changes safe.

### `EditorialEntityOverrides/{encodedPublicId}`

Separately owned input that the VerdiQ sync never writes. Shape:

```json
{
  "editorial": { "description": "..." },
  "seoOverride": { "title": "...", "description": "..." },
  "updatedAt": "server timestamp",
  "updatedBy": "editor identity"
}
```

### Reserved future collections

- `EntityReviews`: review target, moderation and verification metadata.
- `ProductBatches`: immutable batch identity and product relation.
- `ConsumerInsightAggregates`: privacy-thresholded export units for VerdiQ.
- `PublicAvailability`: product/shop relation with `hidden`, `pending_review` or
  `public` status. Only `public` relations may enter the read model.

## Compatibility

Existing `Producten`, `Brands`, `Shops` and client routes remain intact during
the incremental migration. They are not the SSR contract. The public collections
can be rebuilt from VerdiQ plus editorial overrides.

