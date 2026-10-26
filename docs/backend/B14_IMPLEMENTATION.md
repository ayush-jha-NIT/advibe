# AdVibe Backend B14: Cashfree signed payments and booking confirmation

**Source and isolated PostgreSQL 16 integration tests only.** No real Cashfree merchant account or production payment credentials were used, and no live payment, settlement or refund has occurred. Frontend still runs a simulated browser demo. Cashfree sandbox integration is required before operations can enable the production switches.

B14 completes the provisional D06 payment lifecycle while explicitly preserving outstanding compliance gates D04 (tax), D06 (merchant/KYB, Cashfree), D13 (cancellation and refund policy), D15 (consumer legal documents) and D16 (launch review). Finance invoices, refunds and settlement reconciliation belong to **B19**, not to B14. Driver payouts belong to B18.

## Cashfree integration

B14 implements the server-side Cashfree PG API with locked sandbox or production base URLs (no user-supplied HTTP host), `x-api-version: 2025-01-01`, server-only `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, and an operator-set controlled HTTPS `CASHFREE_NOTIFY_URL`. CreateOrder sends customer phone provided on the checkout request and account email, exact quote amount in INR, unique provider order ID, and hold expiry time. It returns the provider-issued checkout payment session ID; the merchant credentials never appear in responses or `NEXT_PUBLIC_*` configuration.

The exact paise amount comes ONLY from the B11 immutable PriceQuote. Provider responses are independently checked for order ID, order amount and currency. A single hold can create one unique PaymentOrder; a retried Idempotency-Key reuses its original providerOrderId. Failures/timeouts leave a CREATING record for safe retry; Cashfree provider-side `x-idempotency-key` is that stable order ID. No second order can be created for a hold through another idempotency key.

## Verified webhooks and confirmation

- `POST /api/v1/webhooks/cashfree/payments`: isolated **raw** JSON middleware mounted before global `express.json`. Base64 HMAC-SHA256 checks `x-webhook-signature` over **timestamp + byte-for-byte body**, with constant-time comparison and 10-minute timestamp replay bound. Invalid signatures fail with 401. Signed payment event fields are validated and mapped to a server-known provider order.
- For any supported payment event, the backend **GETs the payment directly from Cashfree** and checks payment ID, order ID, INR currency, provider state and immutable order amount. A purported SUCCESS event additionally requires independently verified Cashfree order status **PAID**. Signed event data or a browser redirect alone never grants booking.
- `POST /api/v1/reservations/holds/:holdId/confirm`: advertiser-authorized CSRF-protected request only triggers Cashfree server-side order/payment reconciliation. No caller-provided paid state or amount accepted. It confirms only a fully verified success.
- `POST /api/v1/payments/orders`: advertiser OWNER/MANAGER, business-scoped, trusted Origin+CSRF, mandatory Idempotency-Key; matches held reservation and quote. Requires explicit 10-digit checkout phone. No card/CVV/account data is collected by AdVibe.
- `GET /api/v1/payments/orders/:orderId` and `GET /api/v1/payments`: advertiser current business membership or MFA Admin. Responses omit merchant keys and payment instruments.

## Atomic fulfillment and late authorizations

Within a SERIALIZABLE PostgreSQL transaction, settlement locks relevant screen records in stable order, inserts an immutable unique `PaymentAttempt` by Cashfree payment ID and a unique signed `PaymentWebhookEvent` hash, then checks that the hold remains HELD and **expiresAt is strictly in the future**, all B13 screen-day InventorySlots are still present, campaign remains APPROVED and the quote total still matches. Only then does it mark ReservationHold CONFIRMED and PaymentOrder PAID with `paidAt`, in the same transaction that publishes audit and outbox entries. B13's SQL trigger blocks deleting slots belonging to a CONFIRMED hold.

If verified SUCCESS arrives after expiry/release or with missing capacity, B14 never recreates or steals slots. It records **PAID_UNALLOCATED** with `requiresResolution=true` and a dedicated outbox notification for operator handling/refund according to approved B19 policy. A second verified successful payment for one already-paid order marks `requiresResolution=true` as potential double-debit instead of creating a second booking. Repeated webhooks and reconciliation attempts cannot replay booking fulfillment; payment identity and event-hash uniqueness are database constraints.

PaymentAttempt and PaymentWebhookEvent are **append-only** ledger evidence; no refund/invoice, fake tax invoice, successful settlement or device deployment is implied. Provider webhooks may retry on provider downtime and on transient database failures. Real reconciliation/exception dashboards, signed tax invoices and refund implementation are B19.

## Production and testing gates

B14 real order creation and browser-driven confirmation fail closed in production unless **all** server-controlled gates hold: `PAYMENTS_ENABLED=true`, `BOOKING_HOLDS_ENABLED=true`, `PRICING_TAX_POLICY_APPROVED=true`, and `CASHFREE_ENV=production`. Production must additionally provide valid provider secrets, HTTPS webhook configuration, Cashfree merchant/KYB approval, reviewed tax/refund terms, hardware certification, operational exception dashboard, key rotation and replay testing. Webhooks are signature guarded independently of these switches to allow safe reconciliation of existing payment attempts; do not turn off reconciliation before unsettled provider orders are resolved.

CI uses a deterministic fake Cashfree adapter for injected success/failure and signed event payloads, **not real Cashfree money movement or sandbox E2E**. Tests cover business isolation, CSRF, provider order idempotency, invalid webhook signature, server-verified success, duplicate signed event no-op, verified booking capacity retention and late authorization PAID_UNALLOCATED, plus all B0–B13 regression suites. Fresh migration, build, OpenAPI, Next.js and Chromium smoke remain release gates.
