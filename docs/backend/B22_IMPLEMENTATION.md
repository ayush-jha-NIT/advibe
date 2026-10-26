# B22: Live API-mode frontend and cross-portal integration

## What changed

B22 establishes an **explicit, fail-closed** live API mode for the existing AdVibe Next.js frontend. Demo mode is unchanged by default. A separate responsive live portal UI is rendered for ADMIN, ADVERTISER and DRIVER when `NEXT_PUBLIC_DEMO_MODE=false`. Unlike the previous local Zustand demonstration, the live portal uses signed backend sessions, Admin MFA and server-enforced authorization. It does not read browser-local example campaigns, fake cash, sample reach or sample users.

B0–B21 Express API services remain authoritative. B22 does not replicate payments, verification, device playback or security logic inside Next.js. Existing demo pages still work when demo mode is true.

### Server-only backend transport

- `GET/POST/PATCH/PUT/DELETE /api/backend/[...path]` maps same-origin browser requests to `ADVIBE_BACKEND_ORIGIN/api/v1/...` through a **server-side** Next.js relay. `ADVIBE_BACKEND_ORIGIN` is not a `NEXT_PUBLIC_` secret. Its value must be one clean HTTPS origin in production; loopback HTTP is permitted only outside production.
- The relay denies arbitrary hosts, query path smuggling, unexpected segments/methods, device ingest/webhooks, oversized JSON bodies, unapproved content types, cross-site writes, redirects and oversized/unexpected upstream output. Only the relevant cookie, CSRF token, idempotency key and JSON headers are forwarded; no generic caller-supplied authentication headers or target URLs are accepted.
- `Set-Cookie` is returned with the backend's HttpOnly/SameSite/Secure properties intact. Response bodies are `no-store`; frontend code does not use local/session storage for credentials. The browser never needs direct access to the backend origin.
- Frontend and backend must use consistent origins: configure the Express `CORS_ORIGINS` to include the **actual HTTPS frontend origin**, or write operations correctly fail. When the backend is missing or unhealthy the UI shows a service error instead of demo content.
- *Security note:* the proxy does not itself make a deployment production-approved. Configure a trusted HTTPS backend, session cookie domain rules, rate limits and independent infrastructure tests before using live customer information.

### Role separation and authentication

- Live login uses `POST /auth/login`; verified DRIVER/ADVERTISER accounts receive secure session cookies. Admin receives a temporary login ticket, completes `POST /auth/mfa/verify` with their authenticator code, and only then gets an authenticated session. Passwords, MFA tickets and codes are never saved to localStorage/sessionStorage.
- `GET /auth/session` is checked before rendering every authenticated role shell. Missing, expired, suspended, or wrong-role sessions do not render data; they direct the person to secure login. Logout revokes the authenticated session using the backend CSRF token.
- API signup, verification, password-reset request and emailed token reset use the B3 endpoints; signup doesn't grant Admin role and the backend controls verification.
- Each role's existing Next.js route family uses the API shell only when demo mode is explicitly disabled. No fictional UI components leak into live portal content. The original demo navigation and screens remain untouched behind the other mode.

### Live screens

- **Admin**: PostgreSQL operational/finance aggregates (not claimed profit), verified user roster with audited suspend/reactivate, redacted immutable audit history and CSV, real helpdesk, notifications, approved screen/location/pricing/campaign and settlements records. Unsupported privileged operations display an explicit message instead of simulated completion.
- **Advertiser**: owned campaign list and detail, server-backed create-draft form (business, creative, schedule, weekdays), creatives, payment records, analytics, public inventory, own support and notifications, business settings. Campaign drafts are not automatically funded or broadcast.
- **Driver**: enrolled profile/application, vehicles, assigned ad schedule, reviewed earnings in exact paise, settlements, support/maintenance and notifications. No fabricated impressions, trips or transfers.
- All three portal shells provide responsive navigation, real API error states, bounded record views, page cursors, session sign-out and private request handling. Notifications support authenticated mark-read; support tickets support creation and public replies. Status-changing actions use backend role permission, CSRF and request idempotency.

Some complex workflows still require dedicated production UX or providers: staged creative direct-media uploads, private KYC/document upload, Tax/CA reviewed invoices and refund controls, verified payments, approved payout beneficiaries, consent-led raw GPS/device ingestion, physical screen pairing, and delivery incident automation. B22 intentionally **does not** bypass B7/B14/B17/B18/B19 legal/provider approvals or call these production-ready without testing.

### CI acceptance evidence

CI now runs **four parallel/conditional jobs**:
1. Demo-mode frontend lint, typechecking, entire test suite, OpenAPI contracts and production build;
2. B0–B21 PostgreSQL backend integration/security suite;
3. Existing Chromium demo-mode release smoke;
4. A distinct `NEXT_PUBLIC_DEMO_MODE=false` production build, API relay policy tests and Chromium browser simulation of full login+Admin MFA/user status moderation, advertiser campaign draft creation and driver earnings/notification acknowledgements.

Browser simulations intercept the network with deterministic **mock API** responses. They verify frontend behavior and request contracts, *not* live Cashfree, production Neon, device hardware or real money. The PostgreSQL-backed Express CI covers backend behavior separately. B23 must include true staging E2E against a controlled backend and signed approvals.

### Configuration

Default `.env.example` is **demo mode**:
```dotenv
NEXT_PUBLIC_DEMO_MODE=true
```

Opt-in API mode requires the server build and deployment to use:
```dotenv
NEXT_PUBLIC_DEMO_MODE=false
ADVIBE_BACKEND_ORIGIN=https://your-actual-backend.example.com
```

Express must have the exact frontend origin in `CORS_ORIGINS`, trusted HTTPS proxy/cookie settings and real database/auth/notification credentials. Build mode is bundled by Next.js: changing `NEXT_PUBLIC_DEMO_MODE` generally requires rebuilding/redeploying frontend.

**Production status:** B22 code and CI tested. B23 infrastructure, backups, monitoring, privacy and release gates remain pending; no real payment or driver bank transfers were activated in this milestone.
