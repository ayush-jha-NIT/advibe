# AdVibe Backend B4: roles, tenant ownership and Admin MFA

Status: implemented in repository and tested with disposable PostgreSQL. External production Neon, Resend and a same-site frontend API domain are NOT configured.

## Admin MFA with strict enrollment boundary

Admin self-signup remains prohibited. The existing B3 password login flow returns HTTP 202 and a five-minute high-entropy ticket only when the Admin has an active separately enrolled TOTP credential. It never creates a session before second-factor completion; Admin accounts without active MFA return 403.

The restricted operator command `npm --prefix backend run admin:mfa -- enroll` requires explicit operator approval and an already-active verified Admin user. The generated TOTP secret is displayed **once on a trusted terminal** for scanner enrollment, stored as AES-256-GCM ciphertext with the Admin's UUID as authenticated associated data, and activated only after proof of code possession with `-- activate`. The 32-byte MFA_ENCRYPTION_KEY must remain separate from AUTH_SECRET and stored only in secrets management. No public enrollment/recovery/reset API exists in B4.

RFC 6238 TOTP uses HMAC-SHA1, six digits, 30-second step and ±1 allowed clock skew. To reject replay across sessions, the last accepted step is persisted in the credential row and advanced conditionally in the same database transaction that consumes the login ticket and creates the session. The MFA ticket hash, attempt count, consumption and expiry are PostgreSQL-backed. Rate limits apply per origin IP/challenge; no password or OTP is ever logged or stored in plaintext. Admin sessions carry mfaVerifiedAt and are checked against current credential activation. Password-only Admin login never produces a cookie.

## Roles and tenant ownership

`resolvePrincipal` rechecks DB session revocation, expiry, account status, email verification, current role and Admin MFA on **every** protected request. `requireRole` refuses other roles regardless of caller-supplied headers. `requireBusinessMembership` requires an active (nonrevoked) membership for the authenticated user in the requested business, even for Admins. Missing or foreign business IDs both return 404 to prevent tenant enumeration.

Read-only B4 inspection endpoints are `GET /api/v1/auth/permissions`, `GET /api/v1/auth/permissions/businesses/{businessId}`, and `GET /api/v1/auth/admin-security`. Future B5–B21 data mutations MUST use this common authorization before touching their repositories; a list query must additionally be membership-scoped. Business-owner memberships never inherit an Admin override by default. Tests cover two unrelated tenants, forged headers, revoked memberships and promotion/demotion with existing cookies.

Existing B3 logout uses a session-bound HMAC CSRF token. CORS and Fetch Metadata checks block untrusted public auth mutations. This is not a substitute for all B5–B21 endpoint-level permissions, because those endpoints do not exist yet. Admin authorization and per-business security are verified at the B4 boundaries actually implemented, not claimed for future modules.

## Audit and deployment

Successful Admin MFA login produces an append-only auth.admin_mfa_login AuditEvent. B3 account verification, ordinary login and password reset already record immutable audit events. A post-incident credential recovery/reset must be operator-approved and separately audited, and must revoke sessions. No insecure public self-service MFA reset path is exposed.

Apply migrations with a privileged direct connection, preferably on staging first, using `npm --prefix backend run db:migrate:deploy`. Keep the runtime pooled DB credential least-privileged. Operate a verified HTTPS same-site domain setup with appropriate Secure HttpOnly cookie semantics. Do not claim this is a deployed production authentication service until AdVibe Neon provisioned and Resend verified.

## CI verification

Disposable PostgreSQL 16 integration tests cover RFC test TOTP vector, AES-GCM confidentiality/authenticated user binding, activation and replay, password-only Admin denial, ticket expiry/attempts, MFA-backed session issuance, fresh role checks, cross-business 404, forged role headers and membership revocation. Existing frontend typecheck, demo tests, OpenAPI contract and browser smoke remain required to pass.

## Remaining work

B5: authenticated advertiser profiles/business CRUD and enquiries, with authorization middleware reused on every read/write. B6–B21: driver, devices, media, inventory and finance services with their own transaction and policy tests. B22: frontend authentication/data-client migration. B23: production domains, verified mail, Neon project, backups, rollout and operational security approval.
