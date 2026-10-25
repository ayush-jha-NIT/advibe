# AdVibe B5: accounts, advertiser businesses and public enquiries

Status: implemented and tested against disposable PostgreSQL; no production AdVibe Neon project or public backend deployment is connected.

## Authenticated accounts

`GET /api/v1/me` returns only the authenticated account's id, verified email, display name, city, role array and status. `PATCH /api/v1/me` requires a valid B4 server session plus session-derived X-CSRF-Token and a permitted Origin; it permits only a display-name/city edit. No email, passwordHash, role, status, MFA settings, tokenHash or admin flags are writable via this API. Profile changes are audited inside a serializable transaction.

## Advertiser business management

`POST /api/v1/businesses` accepts validated slug, name, city and optional legal name, only for verified active ADVERTISER sessions. It writes business, OWNER membership, immutable audit and outbox event atomically using SERIALIZABLE isolation. The same slug is unique in PostgreSQL, and ten active owned businesses is the current maximum.

Current membership is required for every GET. List queries have cursor/limit and are scoped to server-verified userId, not request-supplied IDs. The legacy `GET /businesses/me` returns the earliest current membership; full support for multiple businesses is available through `GET /businesses`, `GET /businesses/{businessId}`.

PATCH requires an active OWNER/MANAGER advertiser membership, runs tenant-qualified DB update and audit/outbox in one transaction, and only permits displayName/city/legalName. Business `verificationStatus` remains `pending` by default; nothing in B5 can approve it. DELETE is **soft archive**, available only to the owner and revoking active memberships. Historical audit records and related data survive. Foreign, archived or revoked businesses return 404 without disclosing their existence. Admin access does not bypass membership.

## Public enquiries

`POST /api/v1/enquiries` requires JSON with name/email/subject/message/explicit consent=true plus a Turnstile captchaToken. The configured Cloudflare Turnstile Siteverify service must report success, the exact configured frontend hostname, and action=enquiry. Any verification transport error or missing secret rejects the request (fail closed); tests inject a fixed verifier dependency without enabling any development bypass in the production server.

PostgreSQL throttling uses HMAC-scoped per-IP and per-email windows: 10 submissions per IP/hour and 3 per email/hour including invalid CAPTCHA attempts. IPs are not stored directly on Enquiry rows; only a keyed HMAC fingerprint is stored. The consent and CAPTCHA verification timestamps are persisted, and the enquiry and outbox event are atomic. There is no unauthenticated enquiry read endpoint. Email notification dispatch is **not yet implemented** (scheduled outbox worker is part of B20).

## PostgreSQL and QA

Forward-only migration `20261026010000_b5_accounts_business_enquiry` adds nullable legacy city data, the PENDING/UNDER_REVIEW/APPROVED/REJECTED enum, archivedAt, and new Enquiry table and validation checks. It does not backfill invented locations or delete historical users/businesses.

CI creates isolated PostgreSQL 16 and checks signed sessions, mandatory CSRF, role spoofing, illegal field rejection, duplicate slugs, owner/manager/viewer permissions, revoked memberships, persistence, business archival, consent, CAPTCHA, durable outbox and enquiry throttling. Existing B0 contracts, B1–B4 security tests, frontend lint/build, and Chromium smoke remain gates.

## Known boundaries

- No real AdVibe production Neon DB, Resend verified sender, Turnstile site key/secret or production API URL was provisioned in B5.
- No newly invented driver, KYC, payments, booking or inventory tables have been deployed.
- The existing Vercel frontend still operates as a **demo**; B22 will replace demo data and auth with real API calls after the backend modules mature.
- This B5 management API is not a substitute for legally reviewed privacy/retention policies or automated enquiry notifications.
