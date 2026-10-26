# AdVibe B9: cities, circular zones and curated geographic inventory

Status: implemented in PostgreSQL and Express source, tested in isolated PostgreSQL 16 GitHub Actions. No city, site, screen or availability was imported from the real world. The Next.js frontend remains in isolated demo mode.

## Data and spatial model

Migration 20261026050000_b9_geo_inventory creates City, Zone and Location with referential integrity, durable UUIDs, scoped unique slugs, numeric coordinate/radius CHECK constraints, workflow state (DRAFT/PUBLISHED/ARCHIVED) and one nullable Screen.locationId reference. A PostgreSQL built-in point(longitude,latitude) **GiST** expression index accelerates regional bounding-box candidates. A second spherical Haversine distance predicate enforces true radial distance. No PostGIS or paid geocoding key is required to run CI.

Zone geometry is a provisional **circle** (center and radius, 100–50,000 meters), not an official legal ward boundary or a configurable administrative polygon. An Admin-created Location must fall within its zone's circle. Once a zone has locations, geometry cannot change without a deliberate controlled relocation/migration. Changing a mapped location's coordinates is blocked until its screen assignments are removed.

## Public visibility, roles and privacy

Only a Location with PUBLISHED state AND a PUBLISHED Zone AND a PUBLISHED City is exposed by GET /public/locations or ordinary advertiser/driver GET /locations. Admins may view unpublished and archived locations via GET /admin/locations. City/zone lists similarly show only published entries to the public.

Public content is **curated stationary site locations**, not live GPS telemetry or a driver's home/current position. No B9 API starts GPS collection, tracks individual trips, claims verified exposures, discloses KYC data or returns driver contact details. Exposing a precise curated location requires independent business/site permission and privacy review before real deployment.

Location list query parameters: cursor, limit (1–100), citySlug, zoneId; optional minLat/minLng/maxLat/maxLng as a complete rectangular bbox of at most 5 degrees per axis and not crossing the international date line; or lat/lng/radiusMeters as a complete spherical radius query, 100–50,000m. Inputs must be finite, valid geographic coordinates; malformed, oversized or incomplete filters return 422. Stable UUID ascending pagination uses an opaque base64url cursor. Queries are parameterized, with SQL ordering and indexes. Radius bbox prefilters are conservative and exact Haversine checks exclude locations outside the radius; near date-line searches skip the bbox to preserve correct results. The public formats route returns the six potential placement types, expressly **not a price or sellable inventory**.

## Admin workflow and endpoint gates

- POST/PATCH /api/v1/admin/cities and GET /admin/cities: creates DRAFT city with a unique slug, validated ISO country code and IANA time zone. Publishing is an explicit Admin action. Archival hides all child locations.
- POST/PATCH /api/v1/admin/zones and GET /admin/zones: validated city scope, center and radius; cannot publish until parent city is published. Geometry is frozen after any site is registered.
- POST/PATCH /api/v1/admin/locations and GET /admin/locations: validates circular-zone containment. Publication requires both parent city and zone published. Site updates preserve provenance and audit history.
- GET /api/v1/public/cities, /public/zones, /public/locations, /public/formats: curated published-only catalog and provisional formats; no private assets.
- GET /api/v1/locations: published-only for advertiser/driver; Admin receives internal catalog.
- PUT /api/v1/admin/screens/:screenId/location: maps an already-paired screen linked to an APPROVED driver application onto a published site; supports removal with null. An assignment is marked **NOT_BOOKABLE**, independent of screen identity, inventory capacity and physical installation.
- GET /api/v1/admin/locations/:locationId/screens: Admin-only mapped screen metadata, always bookable=false.

Every mutation requires a fresh server-side Admin MFA session, trusted origin, and CSRF. POST creates require Idempotency-Key with transactional writes; state changes and assignments run in SERIALIZABLE transactions and emit append-only AuditEvent records. Public reads have no mutation paths; regular driver/advertiser accounts cannot publish a location or associate a screen with a location. Archives are not deletions and cannot be silently republished through these B9 routes.

## CI and production boundary

Fresh PostgreSQL 16 tests cover migration, GiST index existence, incorrect hierarchy states, unpublished visibility, parent archive propagation, zone circle validation, exact distance/bbox filtering, pagination, invalid filters, wrong-role/CSRF denial, creation idempotency, location-coordinate lock and screen assignment constraints. Earlier B0–B8 authorization, MFA, KYC, pairing and device security tests, frontend build and Chromium smoke remain required.

B9 does not offer commercial availability, zone pricing, booking holds, trip/GPS telemetry, advertiser location targeting or guaranteed impression counts. Pricing, capacity and campaign inventory are B11–B15, while driver opt-in GPS is B17. Production requires legal review of approved public location detail, site-owner permission, timezone/city taxonomy and operations onboarding. No staging/production Neon DB was provisioned here.
