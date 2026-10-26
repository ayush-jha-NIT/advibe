# AdVibe Backend B9: geographic catalog and inventory

The repository implements B0–B9 on Node 22, Express, Prisma and PostgreSQL 16+. The public frontend still uses demo data; no production AdVibe Neon database, KYC scanner, real device fleet or live inventory has been provisioned.

## Local execution

Configure backend/.env based on backend/.env.example: DATABASE_URL, DIRECT_URL, AUTH_SECRET, MFA_ENCRYPTION_KEY, approved origins and upstream provider credentials. Run:

- npm install --prefix backend
- npm --prefix backend run db:validate
- npm --prefix backend run db:migrate:deploy
- npm --prefix backend run dev

To test locally, use only disposable localhost PostgreSQL with NODE_ENV=test and DB_TEST_ALLOWED=true, then run npm --prefix backend run check. CI provisions PostgreSQL 16 and executes fresh migrations B2–B9.

## B9 APIs

Admin MFA only:
- GET/POST /api/v1/admin/cities, PATCH /api/v1/admin/cities/:cityId
- GET/POST /api/v1/admin/zones, PATCH /api/v1/admin/zones/:zoneId
- GET/POST /api/v1/admin/locations, PATCH /api/v1/admin/locations/:locationId
- PUT /api/v1/admin/screens/:screenId/location
- GET /api/v1/admin/locations/:locationId/screens

Public catalog: GET /api/v1/public/cities, /public/zones, /public/locations and /public/formats. Authenticated advertiser/driver: GET /api/v1/locations (published-only), Admin may view unpublished locations.

Cities and zones must be explicitly published before a site can appear. Zone geometry is a bounded circle and cannot change after locations exist. Site coordinates are curated and bounded by the zone; PostgreSQL built-in GiST on point(longitude,latitude) accelerates bbox searches, with exact Haversine radius filtering. Every Admin mutation requires a current session, CSRF and origin checks, with transactional audit records and idempotent creation.

A screen-site link returns inventoryStatus=NOT_BOOKABLE and is not proof of installation, verified playback, stock, price or booking. The six format labels are descriptions, not inventory commitments. Do not expose driver GPS or KYC through the curated site catalog. See docs/backend/B9_IMPLEMENTATION.md for full scope, queries, SQL index and privacy boundaries.

B10 is creative media ingestion; B11–B15 implement pricing, booking and scheduling; B17 adds opt-in GPS; B22 eventually connects the frontend to these APIs.
