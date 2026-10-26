# AdVibe Backend B11: versioned rates and immutable quote estimates

B0–B11 are implemented as repository code and tested against disposable PostgreSQL 16 in GitHub Actions. The deployed Vercel frontend remains **demo-only**. There is no deployed AdVibe production database, certified screen inventory, confirmed tax policy or payment integration.

Backend setup remains Node 22+, Prisma 6, PostgreSQL 16, DATABASE_URL / DIRECT_URL, AUTH_SECRET and MFA_ENCRYPTION_KEY, with all earlier B7–B10 vendor dependencies configured separately. Migration 20261026070000_b11_pricing_quotes adds versioned RateRule/RateRevision, TaxPolicy, DiscountPolicy and append-only PriceQuote snapshots.

Run:
- npm install --prefix backend
- npm --prefix backend run db:validate
- npm --prefix backend run db:migrate:deploy
- npm --prefix backend run dev
- For **disposable localhost** PostgreSQL only, NODE_ENV=test and DB_TEST_ALLOWED=true, npm --prefix backend run check

B11 policy/quote endpoints:
- GET /api/v1/pricing/rules
- POST /api/v1/admin/pricing/rules
- PUT /api/v1/admin/pricing/rules/:ruleId
- GET/POST /api/v1/admin/pricing/tax-policies
- GET/POST /api/v1/admin/pricing/discounts
- POST /api/v1/pricing/quotes
- GET /api/v1/pricing/quotes/:quoteId
- GET /api/v1/pricing/quotes?businessId=...

Admin updates require a currently enrolled MFA session; creation requires CSRF and idempotency. Advertisers may quote only their current business-owned screen candidates at published sites. Quotes are immutable non-binding estimates marked NOT_BOOKED; no reservation or delivery is implied.

### Production tax gate

Review D04 with an Indian tax/finance advisor. Enter an effective TaxPolicy with explicit sourceReference and non-demo rate. Production quote creation is blocked unless PRICING_TAX_POLICY_APPROVED=true is explicitly configured in secure deployment configuration after the real approval. Never copy the demo 18% tax assumption.

See docs/backend/B11_IMPLEMENTATION.md for exact integer arithmetic, revision history, policy expiry, venue-local dates, and limitations. B12 is campaigns, B13 is booking capacity, B14 is payments and invoices.
