# AdVibe Backend B13: exclusive screen-day holds and expiry

B0–B13 are implemented at GitHub repository + disposable PostgreSQL 16 CI level. Vercel's current frontend still runs in demo mode; there is no active Neon production database, verified installed hardware fleet or payment integration.

Run Node 22+ with configured backend/.env, DATABASE_URL, DIRECT_URL, AUTH_SECRET, MFA_ENCRYPTION_KEY and all previous B7–B12 dependencies.

- `npm install --prefix backend`
- `npm --prefix backend run db:validate`
- `npm --prefix backend run db:migrate:deploy`
- `npm --prefix backend run dev`
- `npm --prefix backend run check` only on disposable localhost PostgreSQL, `NODE_ENV=test` and `DB_TEST_ALLOWED=true`.

B13 PostgreSQL migration: `20261026090000_b13_inventory_holds` adds ReservationHold, ReservationHoldItem and InventorySlot. InventorySlot PRIMARY KEY (screenId,serviceDate) forbids double booking, with SERIALIZABLE transactions and ordered screen-row locks. Holds run at most ten minutes, capped by the immutable B11 quote expiry. Release and expiry preserve append-only historical allocation rows and emit audited events.

B13 endpoints:
- POST /api/v1/reservations/holds
- GET/DELETE /api/v1/reservations/holds/:holdId
- GET /api/v1/campaigns/:campaignId/bookings

Before capacity is held, B13 rechecks Admin-approved campaign and evidence, matching and unexpired post-approval quote, active business membership, published geo site, paired and nonrevoked credential, driver approval and APPROVED vehicle verification. B13 operates per whole screen calendar day, not fractions of a day.

Production defaults to disabled: `BOOKING_HOLDS_ENABLED=false` until real fleet and legal checks have passed. Separate controlled `RESERVATION_SWEEPER_ENABLED=true` scheduler can run `npm --prefix backend run reservations:sweep`; no cron has been created/deployed. B13 holds are **unpaid, unconfirmed**; booking confirmation awaits B14. See docs/backend/B13_IMPLEMENTATION.md for full assumptions and restrictions.
