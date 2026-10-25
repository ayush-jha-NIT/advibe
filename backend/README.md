# AdVibe backend B5: profiles, businesses and enquiries

B0–B5 are implemented in the backend repository; the deployed Vercel UI is still demo-only. B5 uses B3 sessions and B4 MFA/RBAC and adds authenticated account profiles, advertiser business management, and public enquiries with consent and CAPTCHA verification.

## Setup (Node 22+, PostgreSQL 16+)

Copy backend/.env.example to backend/.env and set the private DATABASE_URL, DIRECT_URL, AUTH_SECRET, MFA_ENCRYPTION_KEY and Resend settings. For B5 public enquiries also configure:

- ENQUIRY_TURNSTILE_SECRET: private server-side Cloudflare Turnstile secret
- ENQUIRY_TURNSTILE_HOSTNAME: the exact approved frontend hostname
- Client Turnstile widget: action must be **enquiry**, and client sends its one-time token as captchaToken

Production API **refuses to start** without Turnstile configuration, and the public enquiry endpoint fails closed when CAPTCHA verification is unavailable. Use a real site-key, verified hostname and HTTPS in staging; never put the secret in a public Next.js environment variable.

```bash
npm install --prefix backend
npm --prefix backend run db:validate
npm --prefix backend run db:migrate:deploy
npm --prefix backend run dev
```

The B5 migration (20261026010000_b5_accounts_business_enquiry) adds nullable account and legacy business city fields, business verification/archival metadata, and a consent-backed Enquiry table with constraints and indexes. Existing B2 businesses are preserved without inventing a city value.

## Live backend routes: /api/v1

| Method | Path | Authorization and effect |
| --- | --- | --- |
| GET | /me | Session-authenticated owner profile; no passwords, session secrets or MFA data |
| PATCH | /me | CSRF-protected own displayName/city, audited |
| POST | /businesses | Verified advertiser with CSRF; creates pending business + OWNER membership + audit + outbox in one DB transaction |
| GET | /businesses | Current own active memberships; cursor pagination |
| GET | /businesses/me | Backward-compatible first active membership; requires advertiser or Admin with explicit membership |
| PATCH | /businesses/me | Advertiser owner updates first owned active business |
| GET | /businesses/:businessId | Explicit current membership, otherwise 404 |
| PATCH | /businesses/:businessId | Advertiser OWNER or MANAGER, current active membership and CSRF; never accepts owner or verification changes |
| DELETE | /businesses/:businessId | Advertiser who owns business; CSRF; archives and revokes all memberships without deleting history |
| POST | /enquiries | Public JSON POST, consent=true, verified Turnstile, PostgreSQL rate limits; persists DB enquiry and durable outbox event |

Every authenticated operation derives the account from server-held, verified sessions and checks current role/membership in the database. No Admin override to read an unrelated tenant, no direct self-approval and no account role escalation. Business changes and enquiry writes preserve append-only audit/outbox requirements.

Public enquiry responses do **not** return contact details or an internal enquiry identifier. The outbox is durable; a later worker (B20) must deliver notifications. There is no public enquiry listing or public access to stored PII.

## Testing, production boundary and next steps

CI uses disposable PostgreSQL 16, runs all Prisma migrations, validates B2–B5 plus real HTTP authorization and CAPTCHA-stub tests, and checks the original Next.js production build and Chromium smoke. To run backend checks yourself supply NODE_ENV=test and DB_TEST_ALLOWED=true with a **local** throwaway database named with _test or _ci, then `npm --prefix backend run check`.

The production AdVibe Neon database, dedicated email sender, verified Turnstile widget, frontend real-API migration and production service are not provisioned/deployed. B6 driver onboarding is next; B22 later connects the frontend to the real backend.
