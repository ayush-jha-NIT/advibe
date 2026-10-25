# AdVibe Backend B3: secure authentication

## Delivered

Real PostgreSQL/Prisma registration, email verification, login, session inspection, logout, revoke-all sessions, non-enumerating password recovery and email resends. Backend code has no fixed demo code/password and no self-registration of Admin roles.

- Argon2id for password hashes; minimum 12 characters; valid passwords never returned.
- Verification codes generated with CSPRNG, MAC-hashed before storage, expire in 10 minutes, maximum five guesses per challenge and single-use atomic consumption. Challenge IDs are sent in both response and email.
- Reset credentials use 32 random bytes, single-use MAC-hashed database records, expire after 20 minutes and revoke all prior sessions.
- Login rotates any existing cookie, stores only a SHA-256 token hash in the database, and issues an HTTP-only 7-day cookie. Secure `__Host-advibe_session` in production, localhost development cookie isolated.
- Session GET returns short-lived session facts plus a server-derived HMAC CSRF token; authenticated mutations require matching `X-CSRF-Token`.
- PostgreSQL `AuthThrottle` counters enforce shared per-IP/per-email limits, not local memory. They do not replace advanced B4 security monitoring.
- CORS origin allowlist, JSON-only auth writes, Fetch Metadata protection; all sensitive responses no-store and server-generated request IDs.
- Audit events for verification, login, password reset are database append-only.
- Admin credentials cannot authenticate until MFA is implemented in B4. No production Admin user is self-registerable.

## Server setup

Backend uses `DATABASE_URL` pooled PostgreSQL and `DIRECT_URL` unpooled for migrations, as established in B2. Set `AUTH_SECRET` to 32+ genuinely random characters; store only in host-managed secrets. Configure `RESEND_API_KEY` and `AUTH_EMAIL_FROM` with a verified sender domain, required on production startup. Set `AUTH_WEB_ORIGIN` to a frontend URL already explicitly included in `CORS_ORIGINS`. Production session cookies must travel on a verified owner-controlled same-site domain or same-origin proxy, not arbitrary Vercel/Render unrelated public suffixes.

Apply versioned migration `20261025234500_b3_auth_throttle` with `npm --prefix backend run db:migrate:deploy`. This adds the rate-counter table/index and OTP lookup index. No destructive schema change.

## QA and scope

GitHub Actions provisions PostgreSQL 16, applies B2 and B3 migrations, executes an isolated HTTP + DB auth lifecycle integration suite and the existing frontend/domain/security regression checks. The tests verify blocked Admin registration/login, wrong OTP, verification replay, Argon2id database hashes, pending-account rejection, HTTP-only cookies, CSRF rejection, password reset replay and revocation, generic recovery responses and explicit origin rejection.

**Deferred:** Admin MFA and staff permissions (B4), trusted device/browser session management and refined throttling policy (B4), profile APIs (B5), frontend service replacement (B22), external Neon and Resend production provisioning (deployment), live phone OTP provider (pending provider selection). Never treat green local/CI tests as proof that a verified email service or deployed authentication is online.
