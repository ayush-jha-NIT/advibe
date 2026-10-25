# AdVibe Backend B0 — Architecture and system boundaries

Status: B0 specification delivered. There is NO production backend, Neon database, secure login, payment processor, KYC provider or hardware gateway implemented by B0.

## Existing source of truth

Frontend: Next.js 16 App Router, TypeScript, React, Tailwind; deployed as a demo.
Repo: ayush-jha-NIT/advibe. Existing browser demo domain types: src/types/domain.ts.
Existing business-rule prototypes: src/lib/demo-rules.ts.
Existing browser state: src/services/demo-store.ts, demo-auth-store.ts.
Existing client-only payment abstraction: src/services/cashfree-contract.ts.

B0 is documentation plus machine-readable contracts; it MUST NOT alter demo behavior or enable secrets, identity collection, money movements or device commands.

## Architectural choice (ADR-B0-01): modular monolith first

Single repository with Next.js frontend and a separately deployable Node 22 + Express + TypeScript HTTP API in backend/.
Modules: auth, accounts, businesses, enquiries, drivers, kyc, vehicles, locations, screens, devices, creatives, pricing, campaigns, inventory, checkout, payments, refunds, payouts, delivery, reports, support, notifications, admin, audit.
B1 introduces the executable backend package and strict environment validation; B2 adds Neon PostgreSQL and Prisma. Module internals have controllers, Zod request schemas, services, repositories and explicit authorization/policies. No service-to-service network microservices initially.

Canonical HTTP contract: contracts/openapi.v1.json. API prefix /api/v1; proposed public origin https://api.<owned-domain>. AdVibe Vercel frontend remains on Next.js. An owner-controlled same-site domain or trusted same-origin reverse proxy is REQUIRED before production cookie authentication. Do not assume a Vercel preview origin and a Render domain can exchange SameSite cookies safely.

## Components and trust boundaries

Browser -> HTTPS frontend -> authenticated /api/v1 requests -> Express API -> Prisma -> Neon PostgreSQL.
Express -> Redis + BullMQ for background jobs, OTP delivery, media processing, notifications, webhook recovery and settlement reconciliation.
Express -> private media/KYC object storage by short-lived upload intents. Private files are never stored in localStorage or exposed as public CDN links.
Express -> Cashfree server-to-server collections/payouts and verified webhook receivers. No provider secrets in NEXT_PUBLIC variables.
Device player / gateway -> separate device identity and signed manifest/media fetch; device events must NOT reuse human user cookies.
SMS/email and licensed KYC provider -> server-only adapters; availability and retention subject to contracts and legal sign-off.
Observability: structured redacted logs, trace/correlation IDs, health/readiness probes, metrics, error alerts and backup/restore verification.

## Authentication and authorization

Use Argon2id password hashes, server-held credential/session records, HttpOnly Secure SameSite-compatible cookies, session rotation/revocation, CSRF protection on browser mutations, Admin MFA, OTP rate limits, account lockout/detection, email verification and password reset single-use tokens. Avoid storing JWT access tokens in browser localStorage.
Enforce server-side RBAC + object ownership in ALL handlers: user cannot select another advertiserId, driverId, settlement owner or role through a request body. Admin access must require a server-stored verified role, not a frontend role header. Split system-admin operations and staff permissions once organizational access policies are approved.
Public GET endpoints expose safe aggregates only. Anonymous enquiry endpoints require anti-abuse protection. Webhooks authenticate provider signatures against raw body; device endpoints authenticate separately.

## Consistency-critical operations

Booking: take transactional holds for an explicit capacity unit (B0 default assumption: exclusive full-screen per date/time slot; unresolved if ad rotation slots are desired). Reject overlaps under concurrent requests, enforce hold TTL and idempotency. No frontend screen selection is a booking.
Campaign stages: draft -> submitted -> under_review -> approved -> paid -> scheduled -> live -> completed, with changes_requested/rejected/paused/cancelled branches and backend-enforced transition guards. Actual transitions and payment order can be refined in B10–B15; review approval and verified payment are separate requirements for activation.
Payment: backend owns order amount/quote snapshot, verifies Cashfree webhook and GET reconciliation before status paid. Successful checkout redirect alone means nothing.
Playback: signed playlist and device events, deduplication, offline upload support, anomaly checks. Screen online is based on recent trusted heartbeat, not a browser flag.
Settlement: append-only financial ledger with payout state transitions and separate provider reconciliation. Never derive paid earnings from estimated impression counters.

## API conventions

Contract is OpenAPI 3.1.2, JSON. API version fixed /api/v1. Request and response media application/json except webhook raw bytes and future multipart signed upload, with UTC ISO 8601 timestamps and YYYY-MM-DD calendar dates. Money integer paise and currency INR. Pagination: cursor/limit (default 20; max 100), stable ordering, limit guard; filtering explicit. IDs opaque UUIDs/ULIDs; do not rely on seeded IDs such as adv-1. On mutation: Idempotency-Key header for money, booking and provisioning operations, unique per actor and endpoint with request-hash replay protection.
Responses: success envelope with data and optional meta; errors use a stable error object with code, message, requestId and optional field details. Use 400, 401, 403, 404, 409, 422, 429 and 500 correctly; never echo raw provider secrets or internal stack traces. CORS allowlist and HTTP security headers; caching private responses disabled.

## Phases and rollout

B0: specs and contract tests only.
B1–B5: runtime/database/secure auth/accounts.
B6–B9: driver compliance and screen/location network.
B10–B14: creatives, pricing, campaigns, inventory and payments.
B15–B19: scheduling, device/player, route evidence, payouts and billing.
B20–B23: support, Admin/audit, frontend migration, production launch.
See BACKEND_ROADMAP.md and B0_DECISIONS.md.

## Definition of done for B0

- Versioned machine-readable endpoint contract and shared error/security models.
- Conceptual data model with constraints, transaction and migration plan.
- Existing frontend paths mapped to planned server APIs without modifying behavior.
- Documented unresolved hardware, provider, business, tax and legal decisions with safe defaults.
- Automated contract-integrity tests in the existing GitHub Actions domain-test step.
- Green existing lint, TypeScript, domain tests, Next.js production build and Chromium smoke run.
