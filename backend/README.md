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
