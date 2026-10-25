# AdVibe backend B4: MFA and authorization

The backend repository implements B0–B4. B4 adds AES-256-GCM encrypted Admin TOTP MFA, one-time MFA login tickets, atomic code replay prevention, fresh database-backed role checks and tenant membership enforcement. Production endpoints are NOT deployed; Vercel frontend retains browser demo login.

## Environment and startup

Node 22+, PostgreSQL 16+, private pooled DATABASE_URL and direct DIRECT_URL, a 32+ character AUTH_SECRET, independent 32-byte hex MFA_ENCRYPTION_KEY (64 hex chars), approved CORS_ORIGINS, AUTH_WEB_ORIGIN and verified Resend credentials for production.

```bash
npm install --prefix backend
npm --prefix backend run db:validate
npm --prefix backend run db:migrate:deploy
npm --prefix backend run dev
```

B4 migration `20261025235500_b4_admin_mfa` adds AdminMfaCredential and MfaLoginChallenge, and a nullable MFA verification timestamp on sessions. It does not modify production data until a privileged operator runs migrations against the correct database.

### Admin authenticator enrollment: trusted operator only

No API can self-register an Admin or disable MFA. Provision a preapproved, active, email-verified ADMIN user by approved internal identity administration. From a trusted terminal with authenticated operator access:

```bash
# Set ADMIN_MFA_USER_ID to an approved existing Admin UUID.
# Set ADMIN_MFA_OPERATOR_APPROVAL=verified-admin-identity (explicit operator gate).
npm --prefix backend run admin:mfa -- enroll
# Scan the one-time displayed otpauth URI with the Admin's authenticator.
# Set ADMIN_MFA_CODE to a current TOTP code and run:
npm --prefix backend run admin:mfa -- activate
```

Operator CLI uses the same injected application database and secret environment as the backend. Protect terminal access and never include the URI, MFA code or key in logs or commits. The secret is AES-256-GCM-encrypted at rest with per-user authenticated associated data. CLI refuses overwriting active MFA enrollment. Enrollment is not enabled until the operator proves possession of the authenticator. MFA reset after loss requires an independently reviewed recovery process; do not delete or replace active MFA credentials via public HTTP.

### Login and permissions

- `POST /api/v1/auth/login`: verified advertiser/driver login returns 201 and HttpOnly session. Password-valid enrolled Admin returns **202 with a short-lived MFA challenge ticket, no cookie**; unconfigured Admin is denied.
- `POST /api/v1/auth/mfa/verify`: validates challenge ticket and 6-digit authenticator code, enforces attempt limits and monotonic TOTP counters in a PostgreSQL transaction, then issues an MFA-verified session.
- `GET /api/v1/auth/admin-security`: requires current server-verified ADMIN plus recent-enough MFA-backed session.
- `GET /api/v1/auth/permissions`: current user's role and active business memberships from server database, no caller-supplied userId.
- `GET /api/v1/auth/permissions/businesses/:businessId`: requires active membership and returns 404 for missing/foreign business, including from Admin sessions. No admin blanket access to tenant data.
- `/auth/session`, `/auth/logout`, `/auth/logout-all` use the same central server principal validation. Authenticated mutations still require a session-bound CSRF token.

**Cross-business access is denied** even with a valid session or spoofed role header. Revoked memberships are checked fresh. Promotion from advertiser to Admin does not upgrade an existing session, and demoted Admin sessions are rejected.

Run `npm --prefix backend run check` in CI or with isolated PostgreSQL test flags. See [B4 implementation and controls](../docs/backend/B4_IMPLEMENTATION.md).

B5–B23 implement the remaining authenticated business, devices, campaigns, KYC and financial modules. Do not use a public Render URL and unrelated Vercel origin for production session cookies without verified same-site deployment.
