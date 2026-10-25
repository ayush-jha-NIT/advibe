# AdVibe B2 — PostgreSQL / Neon + Prisma backend

B0 contracts, B1 Express, and B2 database foundation are implemented. The server **requires reachable PostgreSQL before listening**; `/api/v1/ready` checks DB connectivity. `/api/v1/health` is process liveness only.

**No production accounts, authentication, KYC, payment, bookings, payouts or physical devices exist yet.** The Next.js portals remain browser-local demos. No dedicated AdVibe Neon project was found in the connected account, so GitHub Actions verifies this against isolated PostgreSQL 16, not production Neon.

## Configuration and setup (Node 22+)

1. Provision a new AdVibe-specific Neon project or PostgreSQL 16+ locally. Obtain runtime pooled `DATABASE_URL` and unpooled migration `DIRECT_URL`.
2. Copy `backend/.env.example` to `backend/.env`. Set **private** URLs. Production requires `sslmode=require` or stronger and approved HTTPS CORS. Never put secrets into `NEXT_PUBLIC_`.
3. From repository root:

```bash
npm install --prefix backend
npm --prefix backend run db:validate
npm --prefix backend run db:migrate:deploy
npm --prefix backend run dev
```

For PowerShell: `Copy-Item backend/.env.example backend/.env`. Prisma CLI loads `backend/.env` for migrations; the B1 Node dev command also loads it. Hosted `npm --prefix backend start` requires injected env vars (it does not read .env automatically).

Release deploy order: migration with restricted `DIRECT_URL`, then start API using `DATABASE_URL`. Never use `prisma db push` or `prisma migrate reset` in staging/production.

## CI and integration tests

The `backend-verify` GitHub Actions job starts disposable PostgreSQL 16, validates the Prisma schema, runs `migrate deploy`, then executes:

```bash
npm --prefix backend run check
```

This includes lint, TypeScript, Node HTTP tests, real DB constraint/transaction tests, build and compiled server smoke. To run locally set `NODE_ENV=test DB_TEST_ALLOWED=true` and use a LOCAL database whose name includes `_test` or `_ci`. Tests create immutable audit rows, so use a disposable DB and do not reuse production data.

Development fixtures require `NODE_ENV=development`, `DEV_SEED_ACK=true`, a LOCAL database and an explicit manual invocation of `npm --prefix backend run db:seed:dev`. Sample records cannot log in, contain no actual people or banking data and are never seeded automatically.

## Relational scope and boundaries

B2 models: User, Session, OtpChallenge, Business, BusinessMembership, AuditEvent, IdempotencyRecord, OutboxEvent. PostgreSQL enforces UUID keys, foreign keys, unique email/member/idempotency scopes, canonical emails, safe checks and append-only audit events. The internal business repository writes owner membership, audit and outbox in one serializable transaction.

B3/B4: real authentication, OTP, sessions, RBAC and MFA. B5: authenticated business endpoints. B6–B21: approved driver/hardware/ads/financial tables through additional forward-only migrations.

Documentation and backup runbook: `../docs/backend/B2_IMPLEMENTATION.md`.
