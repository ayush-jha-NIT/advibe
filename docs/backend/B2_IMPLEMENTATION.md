# AdVibe B2 — Neon/PostgreSQL + Prisma

## Implemented scope

- Prisma 6.19.0 client and CLI, PostgreSQL 16+ schema and committed forward migration `20261025220000_b2_foundation`.
- Runtime `DATABASE_URL` pooled for normal queries, `DIRECT_URL` unpooled for migrations. Production TLS enforcement.
- Eight foundational tables, enums, FK relationships, unique/index/check constraints and a PostgreSQL UPDATE/DELETE blocker for append-only audit events.
- Database-backed readiness (actual query against migrated User table) and fail-closed startup, with safe responses and graceful disconnect.
- Serializable transaction helper with P2034 retry, audited/transactional business-owner repository and membership-scoped reads.
- Explicit localhost-only fictional development seed and independent PostgreSQL service in GitHub Actions.
- Integration tests for migration, live Prisma reads/writes, scoped ownership, transaction rollback, canonical email, FK/unique/idempotency and audit immutability; compiled API smoke against Postgres.

## Foundational entities

| Table | Purpose |
| --- | --- |
| User | Normalized unique email, server-held status/role, future password hashes |
| Session | Hashed session identifiers, expiry, revocation |
| OtpChallenge | Purpose, hashed OTP, bounded attempts, expiry |
| Business | Advertiser owner, unique slug and display/legal name |
| BusinessMembership | Unique per-business user membership and revoke timestamp |
| AuditEvent | Append-only audit record, enforce no UPDATE/DELETE at DB |
| IdempotencyRecord | Unique actor scope + route + key and request fingerprint |
| OutboxEvent | Persistent transactional events for later async workers |

These are foundations, not active sign-up or account-management HTTP endpoints. KYC, vehicles, zones, screens, ad creatives, bookings, ledgers and tax need their phase-specific policy and SQL migrations (B5–B21). Do not create unapproved pricing or inventory constraints before the B0 decisions are finalized.

## Neon setup and migration runbook

1. Create an AdVibe-specific Neon project with **separate** development, staging and production databases/branches. No existing dedicated AdVibe project was found during implementation. Do not reuse an unrelated project's data.
2. Provide `DATABASE_URL` (pooled Neon host) for runtime and `DIRECT_URL` (non-pooled Neon host) for migrations. Supply values as secret environment variables. Production requires TLS and an approved HTTPS CORS origin.
3. `npm install --prefix backend` then `npm --prefix backend run db:validate` and `npm --prefix backend run db:migrate:deploy`. Check `_prisma_migrations` and `GET /api/v1/ready`.
4. Use a least-privilege runtime database user for DML; do not pass migration credentials to the always-on Render process. Restrict the migration user to release automation.
5. Stage new migrations before production and run `migrate deploy` only after verifying a backup/restore point. CI re-runs deploy to confirm it is a no-op.

## Safe rollback and production changes

- Use reviewed **forward-only** migrations and expand/backfill/contract for breaking changes. Never edit an applied migration or run `db push` / `migrate reset` in shared databases.
- Roll back incompatible application code and ship an additional corrective migration. Data restoration requires incident approval, verified backup, an explicit restore point and acceptable data loss.
- B13 must add PostgreSQL transactional/exclusion booking constraints; B14 and B18 must introduce exact integer-paise financial ledgers with unique provider events. Redis locks are not a correctness guarantee.
- A successful DB query does not verify provider credentials or payment/KYC/device readiness.

## Backup, restore and retention

Neon PITR/restore availability depends on the plan and configured retention. Verify it on the actual AdVibe project before promising recovery windows.

An optional operator-invoked script `backend/scripts/backup.sh` uses `pg_dump --format=custom` against an approved `PG_DUMP_URL` (libpq syntax, omit Prisma-only `?schema=public`). It creates a restricted new file and checks that `pg_restore --list` can read it. Encrypt and transfer to access-controlled backup storage, then remove the unencrypted local artifact.

A real restore drill means running `pg_restore` into a **fresh disposable database**, verifying table contents, indexes and app read-only queries. Record actual RTO/RPO and use separate retention policies for OTP/session, KYC, GPS, payments and audit data after legal review.

## Testing and security limitations

GitHub CI uses disposable PostgreSQL 16 with an obviously test-only password. Production Neon credentials must never enter repository, browser bundle or CI fixture. The integration test suite refuses non-local/non-test URLs and deliberately retains immutable audit rows until the disposable test DB is destroyed.

B2 introduces no public business API, no login and no production tenant authorization. B3 must derive user identity from server-held sessions, B4 must enforce per-record RBAC, and B5 must build authorized account/business endpoints. The existing Vercel app remains an isolated demo.
