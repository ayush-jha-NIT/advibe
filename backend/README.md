# AdVibe backend B3: Identity & authentication

B0 API contracts, B1 Express runtime, B2 Prisma/PostgreSQL and B3 authentication endpoints are implemented. Production deployment requires an AdVibe-specific Neon PostgreSQL project, a configured verified Resend sender, a 32+ character AUTH_SECRET, HTTPS and a reviewed same-site cookie domain strategy.

## Start locally

Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (32+ cryptographically random characters), `AUTH_WEB_ORIGIN`, `CORS_ORIGINS`, and email transport. Do not commit live secrets.

```bash
npm install --prefix backend
npm --prefix backend run db:validate
npm --prefix backend run db:migrate:deploy
npm --prefix backend run dev
```

Without Resend config in development, email-based signup/recovery cannot deliver messages (fail closed). For CI, the auth tests inject a fake in-memory mail sender; no fixed OTP, mock login credential or console OTP exposure exists.

### Implemented endpoints under /api/v1/auth

| Method | Route | Behavior |
| --- | --- | --- |
| POST | /register | Advertiser/driver signup, Argon2id hash, pending user, one-time emailed 6-digit code and challenge ID |
| POST | /resend-verification | Generic response, new email challenge for pending user |
| POST | /verify | Single-use bounded-attempt email challenge, activates pending user |
| POST | /login | Verified active account, Argon2id check, secure server-held session/cookie |
| GET | /session | Validates DB session, returns user ID/role/expiry and CSRF token |
| POST | /logout | CSRF-protected current session revocation |
| POST | /logout-all | CSRF-protected all-session revocation |
| POST | /forgot-password | Non-enumerating reset email with 256-bit secret |
| POST | /reset-password | Single-use reset, Argon2id rehash, invalidate all sessions |

No B3 endpoint accepts role=admin registration or bypasses verification. **Admin login returns 403 until B4 MFA is in place**. Human sessions use HTTP-only Secure `__Host-advibe_session` cookies in production; localhost uses an explicitly named nonsecure dev cookie only. CSRF protection is mandatory on authenticated writes. Public auth writes require JSON, allowed Origin and anti-abuse throttling. No session JWT or password is stored in localStorage.

## Important restrictions

The Next.js Vercel frontend still has separate demo auth and is not connected to these endpoints. This milestone must not be considered a live site launch. Configure a first-party same-site domain/proxy before using cross-origin authenticated browser flows. OTP and reset emails use Resend over server-to-server HTTPS; verify domain and provider approval in staging.

Run `npm --prefix backend run check` against a disposable migrated local PostgreSQL test DB with NODE_ENV=test and DB_TEST_ALLOWED=true. See [B3 security and test runbook](../docs/backend/B3_IMPLEMENTATION.md).

B4 implements Admin MFA, full RBAC/ownership enforcement and stronger operational session policies. B5 integrates real account profile APIs.
