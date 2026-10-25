# AdVibe backend B6: driver onboarding and vehicles

The repository implements B0–B6 with Node 22+, Express, Prisma and PostgreSQL 16+. The deployed Vercel frontend is still in demo mode and the real AdVibe Neon service is not provisioned.

## Local setup

Set private DATABASE_URL (pooled), DIRECT_URL (direct for Prisma Migrate), AUTH_SECRET (32+ characters), MFA_ENCRYPTION_KEY (separate 64 hex characters), approved CORS_ORIGINS and AUTH_WEB_ORIGIN in backend/.env. Production also requires verified Resend and Cloudflare Turnstile from B3–B5.

Run from project root:
- npm install --prefix backend
- npm --prefix backend run db:validate
- npm --prefix backend run db:migrate:deploy
- npm --prefix backend run dev

Use the new B6 forward-only migration on staging before production. Never db push/reset a shared DB.

B6 driver-only endpoints:
- GET /api/v1/drivers/me: own safe driver profile
- POST /api/v1/drivers/applications: start resumable private draft, requires CSRF and Idempotency-Key
- GET /api/v1/drivers/applications: list own applications with cursor/limit
- GET /api/v1/drivers/applications/{applicationId}: resume draft with current version
- PATCH /api/v1/drivers/applications/{applicationId}: discriminated per-step input, sequential progression, optimistic expectedVersion
- POST /api/v1/drivers/applications/{applicationId}/submit: atomic, idempotent submitted state and audit/outbox
- GET/POST /api/v1/drivers/me/vehicles: private owned vehicles; registration token HMAC only, no raw plate; always pending review at creation

Submitted is NOT approved. An agreement template reference is not a legal signature; readiness is not KYC verification. B7 adds documents, consent and audited Admin review. B22 later migrates the Next.js frontend to live services.

See docs/backend/B6_IMPLEMENTATION.md for state/step schema, transactions, threat boundaries and QA. Run npm --prefix backend run check only against disposable local PostgreSQL with NODE_ENV=test and DB_TEST_ALLOWED=true; the GitHub Actions pipeline provisions this automatically.
