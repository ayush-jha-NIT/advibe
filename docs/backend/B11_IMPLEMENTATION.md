# AdVibe B11: versioned commercial pricing and immutable quote estimates

**Source + disposable PostgreSQL 16 CI implementation only.** B11 does not reserve a screen, certify installed hardware, charge a card, or create a campaign. Backend production Neon, legal tax sign-off and payment onboarding are not configured. Review architecture decision **D04** with an actual Indian tax/finance advisor. The marketing demo's 18% GST must NEVER silently become the live price tax rate.

## Scope

- PostgreSQL RateRule and immutable RateRevision tables: one logical rate for each (City, ScreenPlacement), version 1 created by an MFA Admin, future versions appended using expectedVersion. Revisions include ratePaisePerScreenDay, active, validFrom and validTo. Database uniqueness and serializable transactions prevent stale overwrites; previous revisions survive forever for audits. Prices apply only where the latest active revision covers the entire campaign date range.
- TaxPolicy: immutable, explicitly-created and active version, effective dates, basis-point tax rate and operator-provided sourceReference. Admin creation rejects overlapping active policy windows. No legal claim is made about a self-entered sourceReference. In production quotes additionally require PRICING_TAX_POLICY_APPROVED=true after finance/legal sign-off; this env flag must be controlled by deployment/operations, not a web user.
- DiscountPolicy: scoped by uppercase discount code, immutable version, active window and percent basis-points or fixed paise. Revisions require expectedVersion (0 for first version). The latest version controls eligibility; older versions remain evidence. A discount can never exceed the subtotal.
- PriceQuote: exactly-once, append-only snapshot with business ID, requestedByUserId, provisional campaign UUID, selected screen UUIDs, dates/weekday selection, rate rule IDs and versions, daily paise rates, line subtotals, tax policy version and tax bps, discount policy version and value, computed amounts and a 15-minute expiry. Quoted money uses integer paise and BigInt intermediates. PostgreSQL CHECK constraints enforce arithmetic, currency INR, date and quote-version consistency. Triggers forbid UPDATE/DELETE of quote, rate revision, tax and discount policy rows.

## Deterministic calculations

The selected calendar dates are inclusive, and weekday numbers are JavaScript/ISO-style 0=Sunday through 6=Saturday. Up to 100 distinct screens, up to 60 calendar days and a start date within 180 days are accepted. Dates represent **venue-local calendar days**, not booked UTC playback slots; quote weekdays are counted using UTC midnight to preserve the date's weekday independently of the server locale.

Each screen costs ratePaisePerScreenDay * matchedDays. subtotalPaise is the sum of those screen lines. A percent discount is rounded half up from basis points: (subtotal*discountBps+5000)/10000 using integers; fixed discounts are capped at subtotal. taxablePaise = subtotal - discount. Tax is rounded half up from taxablePaise using the explicitly approved effective taxBps. totalPaise=taxablePaise+tax. All returned money amounts must be safe JavaScript integer values (<=2^53-1); the database stores BIGINT paise. There is no binary floating point currency arithmetic. All snapshots preserve historical quoted money even after commercial rules change.

## APIs and security

- POST /api/v1/admin/pricing/rules: Admin MFA, CSRF, Idempotency-Key; defines City + Placement base rule and version 1.
- GET /api/v1/pricing/rules: Admin MFA; internal active/latest pricing only.
- PUT /api/v1/admin/pricing/rules/:ruleId: Admin MFA, CSRF and expectedVersion; appends a revision without editing past revisions.
- GET/POST /api/v1/admin/pricing/tax-policies: Admin MFA, explicit active date windows and source reference, immutable versioned tax policies.
- GET/POST /api/v1/admin/pricing/discounts: Admin MFA, versioned optional discounts.
- POST /api/v1/pricing/quotes: Advertiser OWNER/MANAGER business membership, trusted-origin CSRF and Idempotency-Key. Requires a published City, Zone and Location for each paired screen, an APPROVED driver application, a covering latest rate rule and exactly one active tax policy. Quote creation and audit run in one serializable database transaction.
- GET /api/v1/pricing/quotes/:quoteId and GET /api/v1/pricing/quotes?businessId=...: Advertiser with current membership of the quoted business only. No cross-business disclosure.

The status in the quote response is **NOT_BOOKED**, and the snapshot states bookable=false. PAIRED only proves a cryptographic device identity; it is NOT evidence of certified installation, GPS reach, impression delivery or available booking inventory. Capacity and actual booking locks are B13; campaign state belongs to B12, while live payment and tax invoices follow B14. A B11 price must not be presented as a binding order or paid amount.

## CI and production restrictions

CI tests fresh migrations, half-up paise rounding, missing tax/rate fail-closed, finance-policy lifecycle, rate revision contention, tenant scope, CSRF, MFA, idempotent quote retries, unpaired screen exclusion, independent quote snapshot integrity and PostgreSQL immutability triggers. All B0–B10 regression tests, frontend lint/Next.js build and Chromium smoke remain required.

Production must configure real price catalog, policy approval and legal disclosure, tax registration status, promotional consent, price amendments, exchange/lifecycle policies, expiration logic and booking integration. No Pay/Cashfree webhooks or invoice handling are enabled in B11.
