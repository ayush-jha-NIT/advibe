# AdVibe Backend B12: campaign drafts and approval workflows

The backend repository includes B0–B12 with PostgreSQL 16 CI integration tests. Deployed Vercel frontend remains **demo-only**; no production database, media-worker fleet, approved real device inventory, bookings or payments have been configured.

## Local development

Node.js 22+, Prisma 6, PostgreSQL 16. Configure DATABASE_URL and DIRECT_URL plus AUTH_SECRET and MFA_ENCRYPTION_KEY, controlled CORS origin and earlier B7–B11 providers. Install and migrate:

- `npm install --prefix backend`
- `npm --prefix backend run db:validate`
- `npm --prefix backend run db:migrate:deploy`
- `npm --prefix backend run dev`
- On **disposable localhost Postgres only**, use NODE_ENV=test and DB_TEST_ALLOWED=true to run `npm --prefix backend run check`.

The B12 migration creates campaigns, immutable submissions and decisions. Owners/managers can create/edit drafts, associate their own B10 creatives, and submit only once those creatives are approved and processed. Admin MFA sessions review a submission with approve/reject/request-changes decisions and recorded reasons. Changes-requested campaigns must be revised before resubmission. All mutations audit transactions, idempotent creates and submissions, and strict CSRF/origin checks.

## API routes

- `GET/POST /api/v1/campaigns`
- `GET/PATCH /api/v1/campaigns/:campaignId`
- `POST /api/v1/campaigns/:campaignId/submit`
- `GET /api/v1/campaigns/:campaignId/submissions`
- `POST /api/v1/admin/campaigns/:campaignId/decision`
- `GET /api/v1/admin/campaigns/:campaignId/reviews`

Every campaign has inventoryStatus=NOT_BOOKED and paymentStatus=unpaid, even when APPROVED. B13 implements screen reservations, B14 payments, B15 scheduling, and B22 real frontend API integration. Production-only dependencies remain pending. See docs/backend/B12_IMPLEMENTATION.md for state transition and test details.
