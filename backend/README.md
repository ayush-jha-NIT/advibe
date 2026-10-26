# AdVibe Backend B14: Cashfree signed payments and booking confirmation

B0–B14 are implemented in source and test CI using disposable PostgreSQL 16 and an injected Cashfree adapter. No real Cashfree merchant account, live payments, refund disbursements or production Neon instance are configured here. The deployed Next.js site remains a demo.

Prerequisites: Node 22+, PostgreSQL 16, Prisma 6. Prior B3 MFA/auth, B10 private creative media, B11 tax pricing, B12 reviewed campaigns, B13 holds all continue to apply.

- `npm install --prefix backend`
- `npm --prefix backend run db:validate`
- `npm --prefix backend run db:migrate:deploy`
- `npm --prefix backend run dev`
- `NODE_ENV=test DB_TEST_ALLOWED=true npm --prefix backend run check` **only** against disposable localhost test database.

Migration `20261026101500_b14_cashfree_payments` adds PaymentOrder, PaymentAttempt and PaymentWebhookEvent. Payments have unique provider and hold identifiers, immutable amount in INR paise, exact-match verification and SQL append-only event/attempt triggers. Confirmed holds keep their PostgreSQL-exclusive screen/day slot rows.

Routes:
- POST /api/v1/payments/orders
- GET /api/v1/payments/orders/:orderId
- GET /api/v1/payments
- POST /api/v1/webhooks/cashfree/payments (raw signed webhook)
- POST /api/v1/reservations/holds/:holdId/confirm (server-side provider reconciliation)

Cashfree sandbox setup (do not put secrets in the frontend):
`CASHFREE_ENV=sandbox`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_NOTIFY_URL=https://<controlled-host>/api/v1/webhooks/cashfree/payments`. Cashfree Checkout on the frontend receives only the paymentSessionId from the backend after user authorization. Configure actual Cashfree sandbox webhook events at the merchant dashboard; verify replay and refunds before any live launch.

Live charges remain disabled by default. Production additionally requires `PAYMENTS_ENABLED=true`, `BOOKING_HOLDS_ENABLED=true`, `PRICING_TAX_POLICY_APPROVED=true`, `CASHFREE_ENV=production` and all D04/D06/D13 approval requirements. Inactive/expired holds can never be booked even if provider charge succeeds; such money is recorded PAID_UNALLOCATED for review. B15 adds playback scheduling, B19 handles refunds/invoices and full settlement reconciliation. Full architecture and security details: docs/backend/B14_IMPLEMENTATION.md.


## Backend B15: delivery scheduling and activation

See [B15 implementation](../docs/backend/B15_IMPLEMENTATION.md). Schedule `DELIVERY_TICK_ENABLED=true npm run delivery:tick` externally. B15 does not serve signed device playlists.


## Backend B16: signed device playlist gateway

See [B16 implementation](../docs/backend/B16_IMPLEMENTATION.md). Positive production manifests require DEVICE_PLAYBACK_ENABLED=true, DEVICE_FLEET_APPROVED=true, a pinned Ed25519 signing key, and private versioned S3 media. Playback reports are not verified exposures.


## Backend B17: consent-led trip GPS and playback evidence

See [B17 implementation](../docs/backend/B17_IMPLEMENTATION.md). Production GPS requires documented D09 privacy approval and purpose-specific consent; raw samples are purged using the protected `gps:purge` job. Counted events are authenticated device reports, **not verified human impressions**.


## B18 reviewed earnings, immutable ledger and verified payouts

See [B18 implementation](../docs/backend/B18_IMPLEMENTATION.md). Financial policy and D05/D07 approvals are required to activate production payouts. B17 device telemetry never auto-generates payable impressions; an MFA Admin independently reviews service evidence. A configured payout provider must independently confirm transfers before settlement is marked PAID. Never store raw bank details or call these simulated transfers live settlement.


## B19 finance and tax records

B19 adds immutable invoice snapshots, GST component breakdowns from approved quote values, partial refund and credit-note records, and independently fetched Cashfree PG refund/reconciliation evidence. Production issuance requires statutory supplier details, D04/D06/D13 signoff and all corresponding feature flags. See [B19 implementation](../docs/backend/B19_IMPLEMENTATION.md). The backend does not auto-provision live GST e-invoice IRNs or tax filing.


## B20 support, maintenance and in-app notification jobs

Read [B20 implementation](../docs/backend/B20_IMPLEMENTATION.md). Create tickets scoped by role, follow maintenance status and view authenticated in-app notifications. A separate opt-in trusted scheduler runs `B20_JOBS_ENABLED=true npm run support:dispatch`. No push/SMS/email dispatcher or always-on cloud worker is deployed by B20. Maintenance records do not automatically pause paid campaigns; operators must coordinate approved playback interruption and existing delivery controls.


## B21 admin reports, user decisions and safe audit exports

B21 implements MFA-protected operational and confirmed-cashflow reporting, paginated account searches, audited suspension/reactivation of advertiser/driver accounts and read-only audit APIs. CSV exports are bounded, sanitized and themselves audited. See [B21 implementation](../docs/backend/B21_IMPLEMENTATION.md). Figures are not net profit, a tax return, bank reconciliation, or verified human impressions. Frontend remains demo mode until B22.
