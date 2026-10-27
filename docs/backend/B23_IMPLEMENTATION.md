# B23: production-release engineering, monitoring, recoverability and handover

**Implementation status:** Repository controls implemented and verified by CI. **Live production release remains blocked** until separately obtained legal/security review, documented staging E2E, approved provider integrations, a tested encrypted backup/restore and an operator-led cutover. No bank payouts, verified human impressions, live KYC, regulated tax filing or signed physical hardware claims are activated by B23.

## 1. Hosting topology

- **Frontend:** Next.js 16 on an organization-owned Vercel project. Production build explicitly uses `NEXT_PUBLIC_DEMO_MODE=false`, `SITE_INDEXING_ENABLED=false` pending legal approval, `NEXT_PUBLIC_APP_URL` matching verified HTTPS frontend domain, and the secret **server-side** `ADVIBE_BACKEND_ORIGIN` matching the HTTPS backend origin. Next.js public variables are compiled into browser bundles at build time; rebuilding is required when changing the mode.
- **Backend:** Express/TypeScript on a separate Render web service. The included `render.yaml` is a **staging-only blueprint** with automatic deploys disabled, PostgreSQL migration predeploy and `/api/v1/ready` health checks. It prompts operators for private auth, email and database credentials; no application secrets or real provider keys are in Git.
- **Database:** Dedicated production Neon Postgres (or approved managed Postgres), with pooled `DATABASE_URL` and unpooled `DIRECT_URL` using TLS, independently restricted IAM, an approved migration window and database provider PITR/backup retention. Do not point CI tests at it.
- **Job workers:** B10 creatives, B13 expiry, B15 delivery, B17 GPS retention, B18 payouts, B19 refunds and B20 in-app dispatch each have separate worker commands. Deploy independently, only after policy approvals. No worker silently runs inside the Next frontend or Express HTTP service.
- **Vercel and Render ownership, verified URLs, commercial account approval and DNS:** **Not established by this commit.** No live deployment is claimed.

## 2. Environment and admission gates

The server calls `releaseGate` **before connecting to the database or opening a port** whenever `NODE_ENV=production`:

```dotenv
NODE_ENV=production
TRUST_PROXY=true
CORS_ORIGINS=https://staging-web.example.com
AUTH_WEB_ORIGIN=https://staging-web.example.com
B23_RELEASE_STAGE=staging
B23_STAGING_APPROVED=true
PAYMENTS_ENABLED=false
B18_PAYOUTS_ENABLED=false
B19_REFUNDS_ENABLED=false
B19_TAX_INVOICES_ENABLED=false
BOOKING_HOLDS_ENABLED=false
DEVICE_PLAYBACK_ENABLED=false
CREATIVE_WORKER_ENABLED=false
```

These are **illustrative placeholders**, not actual domains or approvals. Staging may not turn on financial transfers, paid booking or hardware/device production switches. It still needs authentic secured database, verified sender and Admin MFA configuration. Production stage requires `B23_RELEASE_STAGE=production`, `B23_RELEASE_APPROVED=true`, `B23_SECURITY_REVIEW_APPROVED=true`, `B23_LEGAL_REVIEW_APPROVED=true`, `B23_RESTORE_DRILL_VERIFIED=true`, `B23_STAGING_E2E_VERIFIED=true`, `B23_MONITORING_VERIFIED=true`, `B23_ROLLBACK_PLAN_VERIFIED=true` and 40-character matching `B23_RELEASE_SHA`/`B23_APPROVED_SHA`. Operators are accountable for substantiating these attestations.

Keep external Cashfree production, provider payouts, GPS, private storage and hardware flags **off** until their specialized prior-phase approvals, individual sandbox/pilot verification and applicable legal signoffs. B23 is infrastructure preparation, not authorization to handle money or regulated identity data.

## 3. Observability and alerting

- Backend emits structured JSON HTTP request logs with server-generated `X-Request-ID`, HTTP method, **parameter-free route template** (not private UUID, GPS, path payload), status code and rounded elapsed milliseconds. The logger redacts credentials and bank fields. Configure Render log retention and an external alert sink before launch.
- `GET /api/v1/health` is liveness: no database query.
- `GET /api/v1/ready` is backend readiness: fails with HTTP 503 on startup/shutdown or failed DB probe.
- `GET /api/health` is frontend liveness, reports `demo` or `api`, and **always** has `productionIntegrationsReady=false` until independent approval.
- `GET /api/ready` is frontend dependency readiness; checks backend `/api/v1/ready` server-side with a five-second timeout. It returns sanitized 503 if the API-mode backend is missing, unreachable or lacks migrated database readiness; demo mode does not claim API readiness.
- `scripts/b23-staging-probe.mjs` is a **read-only**, HTTPS-only staging check: confirms frontend API mode and readiness, backend health/readiness, and that an anonymous session receives HTTP 401. It never posts orders, triggers payouts or sends identity data. It fails nonzero if any condition changes.
- `.github/workflows/b23-staging-monitor.yml` runs every six hours or on manual dispatch **only after** the operator configures both GitHub repository variables `B23_STAGING_FRONTEND_ORIGIN` and `B23_STAGING_BACKEND_ORIGIN`. Failure is visible in Actions; alert recipients and escalation paths must still be verified, including a deliberate failure drill.

Recommended operational alert targets to configure: repeated 5xx/503 readiness, elevated p95 latency, queue dead letters, payout/refund reconciliation mismatches, storage malware worker outage, low backup recency, missing device heartbeats, and failed restore drill. Some metrics require external managed monitoring or a secure exporter; no such external service is fabricated here.

## 4. Backups and recovery

`backend/scripts/backup-encrypted.sh` streams `pg_dump --format=custom` directly into **age** encryption with a verified public recipient, mode 0600, refusing overwrite and never writing a plaintext dump to disk. It relies on libpq environment/pgpass and requires an approved encrypted destination. Example:

```bash
export PGHOST='<approved database host>'
export PGUSER='<read-only backup role>'
export PGPASSFILE='<private file outside Git>'
export PGDATABASE='<approved database>'
export B23_BACKUP_RECIPIENT='age1<operator public recipient>'
bash backend/scripts/backup-encrypted.sh /secure-backups/advibe-2026-10-27.dump.age
```

`backend/scripts/restore-drill.sh` decrypts and restores into a **pre-created empty disposable** `advibe_*_restore` / `_drill` / `_ci` database using `pg_restore --exit-on-error`, then checks core Prisma migration/identity tables. It requires the explicit acknowledgement `B23_RESTORE_ACK=YES_DISPOSABLE_DATABASE`, a readable age private identity, and an explicit `PGHOST`. It refuses non-disposable database names and non-empty public schemas. **Never supply production credentials or an actual production database name.**

Example:

```bash
export PGHOST='<isolated test instance>'
export PGUSER='<isolated restore role>'
export PGPASSFILE='<private restore credentials file>'
export PGDATABASE='advibe_b23_restore'
export B23_AGE_IDENTITY_FILE='/secure/keys/advibe-age-identity.txt'
export B23_RESTORE_ACK=YES_DISPOSABLE_DATABASE
bash backend/scripts/restore-drill.sh /secure-backups/advibe-2026-10-27.dump.age
```

These tools alone are **not a scheduled backup or PITR policy**. Provision automated, immutable offsite retention and managed Postgres PITR independently; test actual restores, document measured RPO/RTO, and enforce access controls and deletion schedules. Never upload backup artifacts or private age keys to a CI artifact, the repo, or chat.

## 5. Promotion and rollback

1. Freeze the main branch to an approved **40-character commit SHA** after all five CI jobs pass; require PR review, dependency/security scan, secret scan and operator signoff for production protection rules.
2. Provision isolated staging projects and GitHub environment variables, configure HTTPS/DNS and a verified sender, migrate a **synthetic/authorized** staging dataset, and validate startup/readiness, real server session, Admin MFA, tenant isolation and CSRF.
3. Exercise real staging B22 frontend-to-Express workflows including independent error conditions. Existing B22 Chromium uses intercepted mock HTTP; passing that **is not equivalent** to this staging exercise.
4. Review Cashfree payment/settlement sandbox, refund and payout-provider behavior, tax evidence, KYC privacy and hardware enrollment separately. Real bank transfers and device operations remain disabled absent agreements and provider signoffs.
5. Produce encrypted backup, restore into disposable database, measure RPO/RTO and collect **redacted evidence IDs**. Verify logs, alerts, recovery on readiness failures, S3 private storage, media scanning and expiry workers.
6. Fill an **external/private copy** of `ops/b23-release-evidence.template.json` with reviewed SHA, reviewer identities and real evidence IDs. Validate with `node scripts/b23-approve-release.mjs <evidence.json> <40-character-SHA>`. Validation checks document completeness, **not** the authenticity of signatures or the actual connected platforms.
7. Only authorized operators enable production stage flags and deploy the exact approved commit to Render/Vercel through release approvals. Deploy immutable migrations in a scheduled window. Rerun the read-only staging/live readiness checks, authorized end-to-end workflows, manual real-device acceptance and legal release approval.
8. For an incident: halt traffic/disable new financial activity with the appropriate provider flags, save redacted logs and incident record, revert **code** to last known safe immutable SHA, then check schema compatibility. **Do not reverse destructive migrations** or restore production DB automatically. If a database restore is actually required, execute a separate incident-approved plan with provider PITR, loss analysis, recorded RPO/RTO, payment reconciliation and human signoff.

## 6. CI acceptance and remaining external dependencies

GitHub B23 adds **six checks**: frontend, backend, demo Chromium, API-mode Chromium, real encrypted backup/restore using disposable PostgreSQL and synthetic data, then the final `release-gates` check. The synthetic recovery job installs age and PostgreSQL tooling, streams an encrypted archive, restores it into a separate empty test database and checks the restored record and migrations. The final release gate checks refusal defaults, syntax, operational presence and handoff documentation. **This CI drill never touches real Neon data** and cannot prove production RTO/RPO or access controls. Backend suite tests staged and production admission rules; Node tests verify that evidence template is *unapproved* by default.

No real Vercel/Render project deployment, external recovery test, provider signoff or operational on-call acknowledgment is implied by repository CI. Source implementation can be complete without the business being legally/operationally approved to go live.

**B23 handover deliverables:** `render.yaml`, `backend/src/ops/release.ts`, `backend/scripts/backup-encrypted.sh`, `backend/scripts/restore-drill.sh`, `scripts/b23-staging-probe.mjs`, `scripts/b23-approve-release.mjs`, `ops/b23-release-evidence.template.json`, scheduled monitoring workflow, health/readiness endpoints, tests and this runbook.
