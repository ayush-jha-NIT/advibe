# AdVibe Production Readiness — Mandatory Backend and Launch Work

**Status: frontend demonstration only, NOT production-ready. B0 contract, B1 Express runtime and B2 Prisma/PostgreSQL foundation implemented; B3–B23 pending. An AdVibe Neon database has not been provisioned.**

Backend baseline: [B0 architecture](backend/B0_ARCHITECTURE.md), [database](backend/B0_DATABASE.md), [API migration map](backend/B0_API_MAPPING.md), [decisions](backend/B0_DECISIONS.md), and [versioned OpenAPI](../contracts/openapi.v1.json).

The 24-part approved implementation is a Next.js UI backed by fictional browser-local data. Demo roles are not server-enforced permissions. Client-only payment/KYC/device statuses are not reliable proof.

| Blocker | Required before any real-user launch |
| --- | --- |
| Authentication & RBAC | Secure user database, password hashing, email/SMS validation, MFA for Admin, real sessions and server-side per-record ownership enforcement |
| Persistent database | Real transactional storage, migrations, backups, schema constraints, reservation concurrency, rate limits and idempotency |
| Creative storage | Private file uploads, media validation, malware scanning, moderation, secure distribution and deployment controls |
| Cashfree collection | Server-created payment orders, verified webhooks, refund settlement, tax/invoice compliance and reconciliation |
| Driver KYC | Consent-led identity/license/RC/insurance validation, secure documents and approved data retention policy |
| Screens / IoT | Certified installation, secure pairing, device heartbeats, approved playback, logs, uptime and tamper monitoring |
| Verified exposure | Consented geolocation, route telemetry, playback proof, aggregation and accuracy review |
| Driver payouts | Bank verification, payout provider and ledger, TDS/tax review, receipts and reconciliation |
| Support and notifications | Authenticated service desk, real transport, opt-in, escalation, dispatch and audit trails |
| Legal | Approved Privacy Policy, Terms, driver partnership agreement, advertiser cancellation/content policy and actual commercial terms |
| Monitoring/security | API observability, error tracking, immutable audit trails, incident procedures, threat modeling and vulnerability testing |
| Hosting and accessibility | Account-owned Vercel project, HTTPS, environment security, tested domain, cross-browser/manual QA and privacy sign-off |

Suggested order: legal/product approval and service contracts; secure API identity and database; asset/media/inventory; payments and webhook reconciliation; driver compliance; device telemetry; bank payouts; support/notifications; security and manual acceptance; production deployment.

## Safe demo-preview deployment

A hosted **demo** may be used for design review after green CI, successful browser smoke, HTTPS, clear fictional-data disclosures, legal preview labeling and disabling indexing with SITE_INDEXING_ENABLED=false. Never enter production secrets under NEXT_PUBLIC variables. Do not accept real payments, identity files, account details or bookings.

Part 23's health endpoint proves only the frontend responds; it cannot prove secure server auth, financial processing or live device connectivity.
