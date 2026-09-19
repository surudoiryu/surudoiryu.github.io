# Wietinfo SEO/SSR migration baseline

Status: accepted implementation scope for phases 0, 1 and the phase-2 vertical slice.

## Product boundary

Wietinfo is the public, consumer-facing layer of VerdiQ. VerdiQ remains the
authoritative source for catalog and tenant facts. Wietinfo owns editorial
presentation, consumer reviews, SEO decisions and consented/aggregated consumer
insights.

The migration is incremental. The existing Create React App remains available
for routes that have not migrated. The first SSR slice contains grower pages and
their product pages only.

## Baseline

- Current public UI: React 18, React Router, Material UI and Firestore.
- Current deployment: static GitHub Pages app shell.
- Current PWA: manifest plus Workbox service worker registered after page load.
- Catalog source: VerdiQ GraphQL, synchronized to Firestore by
  `scripts/catalog-sync-worker.mjs`.
- SEO gap: entity content and metadata are produced after client JavaScript.

## URL and identity contract

Identity and routing are deliberately separate.

| Entity | Immutable public ID | Canonical route | Permanent QR route |
| --- | --- | --- | --- |
| Product | `verdiq:product:{verdiqProductId}` | `/cannabis/{slug}` | `/q/p/{verdiqProductId}` |
| Grower | `verdiq:grower:{verdiqTenantId}` | `/telers/{slug}` | reserved: `/q/g/{verdiqTenantId}` |
| Shop | `verdiq:shop:{verdiqTenantId}` | `/cannabis-winkel/{province}/{slug}` | reserved: `/q/s/{verdiqTenantId}` |
| Batch | `verdiq:batch:{verdiqBatchId}` | future | `/q/b/{verdiqBatchId}` |

QR URLs never contain a mutable slug. They return a temporary or permanent HTTP
redirect to the current public representation. Legacy slugs are route aliases,
not entity identifiers.

## Ownership and provenance

Every public entity has three layers:

1. `source`: facts synchronized from VerdiQ. Only the sync worker writes these.
2. `editorial`: Wietinfo copy and presentation fields. Only editorial tooling
   writes these.
3. `seoOverride`: optional manual title, description, canonical/index controls
   and social image. Only authorized Wietinfo editors write these.

The effective public view is materialized from those layers. A VerdiQ sync may
replace `source`, but must never write `editorial` or `seoOverride`. Each exposed
field carries `owner`, source field and sync/edit timestamp in `provenance`.

SEO defaults are derived from effective entity data. An explicitly set override
wins, including an intentionally empty optional value; absence of an override
falls back to the generated value.

## Reviews and consumer insights

Reviews target an entity reference, never a slug:

```text
ReviewTarget { entityType: product | grower | shop, entityId: immutable public ID }
```

The model reserves `verification.status`, `verification.method`, receipt/POS
reference hashes and verifier timestamps. Future POS integrations can promote a
review to `verified_purchase` without changing its identity or target.

Consumer events use immutable entity IDs and a pseudonymous subject/session ID.
Only consented, thresholded aggregates may be exported back to VerdiQ. Raw
profile or event data is not part of the catalog sync. Aggregates include their
window, sample size, metric definition, consent policy version and generation
timestamp.

## Indexation rules

- Only published canonical entity routes are indexed and included in sitemaps.
- Search, arbitrary filters, QR routes and legacy aliases are never sitemap URLs.
- QR and legacy routes redirect before rendering.
- Unpublished entities return 404; legally pending availability is omitted from
  HTML, structured data and public APIs.

## Phase-2 vertical-slice acceptance criteria

- Grower and linked product primary content exists in the HTTP HTML without JS.
- Entity-specific title, description, canonical and JSON-LD are in `<head>`.
- Legacy and permanent QR routes return HTTP redirects.
- Existing CRA files, manifest and service worker remain served as fallback.
- The rest of the application is not migrated in this slice.

