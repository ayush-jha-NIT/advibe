# B21: MFA-protected Admin reports, safe account moderation and redacted audit exports

Implemented on AdVibe Express/Prisma PostgreSQL backend. B22 frontend API migration and B23 production deployment are NOT part of B21.

## Admin reporting

`GET /api/v1/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` requires a verified, active Admin cookie and activated Admin MFA. Default period: latest 30 UTC calendar dates. Maximum: 366 days, both bounds inclusive. Queries use a single PostgreSQL repeatable-read transaction and aggregate **actual persisted records**, not frontend demo fixtures. The response includes:

- New account, business and campaign counts based on creation timestamps.
- Verified paid/allocated bookings (PAID and no unresolved exception), unallocated paid orders as **separate** exception gross, confirmed Cashfree refund amounts after B19 independent verification.
- B18 reviewed driver earning credits, provider-confirmed paid payouts, new support/maintenance case volumes, B19 financial reconciliation mismatches.
- Integer-paise money sums encoded as **decimal strings** to avoid floating point and JavaScript integer overflow, INR currency, UTC date boundaries, as-of timestamp, data lineage/limitations.

Gross verified bookings minus independently confirmed refunds is a period **difference**, NOT company profit or a bank settlement. Categories use different completion timestamps within the same date window. Earnings are reviewed contracted service entitlements, **not verified human views**, and are not auto-netted into tax/invoice totals. Payment orders with unresolved status cannot inflate confirmed revenue. Further tax and bank reconciliation remains an operational requirement.

`GET /api/v1/admin/reports/export?from=...&to=...` returns UTF-8 CSV with a BOM and formula-injection escaping, limited to 31 days. The export includes only aggregate metrics; no personal, bank, device GPS or advertiser transaction records. Every export adds an immutable `admin.report_exported` audit event before download.

## Accounts and governance

`GET /api/v1/admin/users` supports bounded 1–50-row cursor paging and strict role, status and text filters. The response includes only account ID, display name, email, role, status, verification flag and creation date. It NEVER includes credentials, MFA secrets, passwords, session hashes, KYC or bank details.

`PATCH /api/v1/admin/users/{userId}/status` requires Admin MFA, CSRF, valid 8–128 char Idempotency-Key and an explicit **20–500 character reviewed reason**. It is limited to `ACTIVE → SUSPENDED` or `SUSPENDED → ACTIVE` for ADVERTISER/DRIVER accounts. Never grants roles or activates PENDING/CLOSED users. An Admin cannot act on themselves or any other Admin. Suspending and reactivating both revoke every existing login session. Reactivation requires email verification and password setup. Optimistic expected-status checks prevent stale concurrent actions. An immutable `AccountStatusDecision` table captures subject, reviewer, before/after, reason and time, with DB constraint and delete/update trigger. The same transaction writes a standard append-only AuditEvent and outbox event. `GET /api/v1/admin/users/{userId}/decisions` provides paginated protected decision history.

No silent suspension of running ads, inventory holds or unsettled payments is implied by a login restriction. Admin operations must review ongoing contracts, payouts and service obligations separately. Role promotions/creation remain out of scope and MUST NOT be performed via this endpoint.

## Audit

`GET /api/v1/admin/audit-events` is MFA Admin-only, filtered by bounded dates, role-safe actor UUID, action and resource type, with max-50 record pages. Audit results deliberately exclude free-form `metadata`, request bodies, passwords, tokens, private documents and raw device telemetry.

`GET /api/v1/admin/audit-events/export` is limited to a 31-day period and at most 1000 records per export. CSV cells are quoted, newlines removed and spreadsheet formulas neutralized. Larger exports are rejected with a request to narrow the filter, rather than silently truncating records. The export action is written to the existing immutable audit log; reports and exports are `no-store` so browsers/CDNs do not cache private admin information.

## Tests and migration

- Migration `20261026234500_b21_admin_decisions`: immutable status decisions and audit scan indices.
- `npm --prefix backend run test:admin` checks account permissions, MFA, CSRF, idempotent status changes, target Admin protection, session invalidation, record immutability, redacted audit pagination/export and CSV formula neutralization.
- B19 finance fixture additionally verifies actual PostgreSQL paid-booking and completed partial-refund sums plus exported report data.
- Full backend B0–B21 test chain, frontend lint/build/contract suite and Chromium release smoke must pass on the exact final `main` commit.

**Production status:** code + CI verification only. Administrative onboarding, governance approvals, backup/retention, monitoring and deploy rollout belong to B23. Frontend remains demo mode until B22.
