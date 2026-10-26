# AdVibe Backend B13: exclusive screen-day holds and expiry

Source and disposable PostgreSQL 16 integration tests only. This is not deployed live capacity, a paid reservation or proof of certified physical installation. B14 confirmation/payment, B15 scheduling and B16 device playback remain separate. The frontend is still in local demo mode.

## Authoritative inventory capacity model

One whole **screen per local service date** is the unit of capacity, matching B11's exclusive-full-screen-day pricing. The choice of campaign timeWindow does not subdivide daily capacity: if an ad requests any minute of a selected date, the entire screen-day is temporarily held. A configured screen can never be promised to overlapping campaigns on that date while a HELD (unexpired) or CONFIRMED allocation exists.

Migration `20261026090000_b13_inventory_holds` adds ReservationHold (state HELD, RELEASED, EXPIRED, CONFIRMED reserved for B14), append-only ReservationHoldItem as historical evidence, and InventorySlot as the current occupied capacity set. **The composite PostgreSQL PRIMARY KEY (screenId, serviceDate)** prevents two concurrent active allocations for the same unit. HELD states expire at the earlier of 10 minutes after issuance and the B11 quote expiry (normally 15 minutes). Service days are calculated from date-only campaign values, matching B11 weekday arithmetic; no timezone conversion of GPS logs occurs.

An advertiser may create a hold only after B12 Admin approval, documented B12 approved review evidence, B10 approved scanned creative and READY media, valid B11 quote issued after campaign approval and not yet expired, exact same screen IDs/date/weekday selection and business, and B8 paired nonrevoked device on a B9 published location with an APPROVED driver application and approved vehicle verification. The same business's OWNER/MANAGER membership is rechecked inside the SERIALIZABLE transaction; role and CSRF/origin are checked at ingress. The active screen rows are FOR UPDATE locked in a stable sorted order, while the inventory primary key remains the decisive database constraint. Cross-tenant accounts receive the same 404 as absent records. Quote replay with changed fields fails idempotency checks.

## Endpoints

- POST /api/v1/reservations/holds: advertiser OWNER/MANAGER only; Idempotency-Key + CSRF, same-business quote and approved campaign. Atomic append-only items + active slots + AuditEvent + OutboxEvent. A contention or overlapping date returns HTTP 409 and never partially allocates.
- GET /api/v1/reservations/holds/:holdId: current advertiser business member, no keys/driver PII. Effective state is expired if HELD but its timestamp is past. It never extends the original hold.
- DELETE /api/v1/reservations/holds/:holdId: authorized business OWNER/MANAGER with CSRF and empty JSON object. Idempotent release returns RELEASED (or EXPIRED if already expired); active slots are removed without deleting history. CONFIRMED state is refused, as later B14 confirmation must not be silently undone by the advertiser.
- GET /api/v1/campaigns/:campaignId/bookings: current member of the campaign's advertiser business or MFA Admin; returns per-date screen allocation history, with held/cancelled/confirmed status and explicit `paymentStatus=unpaid`. Confirmed is a reserved enum for B14 and cannot be created through a B13 API.

## Expiry and races

Capacity reclamation is **transactional**: when a new hold locks candidate screens, expired/nonactive slots on requested dates are released and earlier HELD rows become EXPIRED within the same transaction before checking conflicts. Historical items remain immutable. An independent bounded sweeper `npm --prefix backend run reservations:sweep` can expire holds across the fleet. Configure `RESERVATION_SWEEPER_ENABLED=true` *only* on a dedicated trusted worker and schedule it operationally; the source code does not schedule a cloud cron itself. Sweeps lock the same screen rows before deleting slots and record audit/outbox changes. The PostgreSQL trigger refuses deleting any slot belonging to a CONFIRMED hold. An idle expired hold may report effective EXPIRED before its physical slot is reclaimed; it cannot block creation indefinitely, because creation performs its own reclaim.

Concurrent contenders for the same screen/date are serialized and protected by the DB unique key; stale quote, different business, unapproved campaign/creative, uncertified vehicle or inactive device fail closed. CI tests include parallel hold attempts, release, claim after release, claim after expiry, sweeper idempotence and preserved append-only history. No Redis/local mutex is trusted as the inventory authority.

## Production controls

B13 **does not certify installation or verify playback**. In production, the hold creation route fails closed unless server-only `BOOKING_HOLDS_ENABLED=true` has been explicitly configured *after actual fleet verification and commercial/legal review*. This key must never be shipped to the Next.js client. In CI/development, physical states are controlled disposable fixtures, not manufacturer attestation.

Operational onboarding needs certified installation/driver checks, media compliance, vendor lifecycle monitoring, daily booking horizon and date boundaries, real quote tax signoff (D04), retention/privacy controls, an external sweep schedule and alerting for stale HELD rows. A hold has no payment authorization and cannot become CONFIRMED in B13. The B14 payment transition must re-check capacity and successful, verified provider payment.
