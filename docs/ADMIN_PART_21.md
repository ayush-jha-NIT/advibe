# AdVibe Part 21 — Admin analytics, accounts, notifications, support and audit

## Routes

- /admin/analytics — seeded fictional KPIs (campaigns, sample impressions, payment flags and driver settlement ledger), status visualization, geographic counts, CSV export.
- /admin/advertisers — fictional advertiser profiles and linked campaign/payment summaries.
- /admin/users — account roles and local active/inactive flags, demo Admin protected, search, role filter.
- /admin/support — driver and advertiser local tickets, search, lifecycle status actions and recipient notifications.
- /admin/notifications — preset demo Admin notices with search, event types, individual and bulk mark read.
- /admin/audit — a dedicated chronological browser-local audit viewer with search, filters and a CSV export.
- /admin/settings — environment limitations and double-confirmed reset of the shared fictional database.

## Security and restrictions

All records remain browser-local, user-editable demonstrations. The Admin session is seeded and cannot enforce real authorization. Account enabled/disabled toggles do not revoke sessions, send account emails or change an external identity store. Role changes are intentionally unavailable without real authorization and user provisioning.

Support tickets transition only through valid local status changes; no customer service reply, physical technician dispatch, legal dispute resolution or refund occurs. Notification changes affect only the account-owned demo notices.

Audit events are written in the same local storage as business records, so **they are not tamper-evident compliance logs**. CSV exports use quoted cells and protect against spreadsheet formula injection in user-provided string fields. Reports are not tax, accounting or verified campaign delivery reports.

The demo environment reset requires two confirmations and erases local generated records across all portals while leaving browser-session demo auth separate.

Real platform operations require secure backend RBAC, verified payment and payout reconciliation, secure document/KYC storage, media/device telemetry, service integrations and immutable audit capture. Part 22 will run cross-portal accessibility checks and Part 23 the final deployment/handoff QA.

## CI

tests/admin-part21.test.mjs tests guard behavior, ticket lifecycle, metrics and CSV escaping. CI also runs all earlier domain suites plus ESLint, TypeScript and Next.js production build.
