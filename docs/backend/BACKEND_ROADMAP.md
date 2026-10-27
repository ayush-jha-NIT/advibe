# AdVibe production backend implementation roadmap (B0–B23)

The 24 frontend parts remain a browser-only demonstration. B0–B23 implemented at source/CI level (NOT an approved or deployed production launch): B22 introduces independent live API-mode portal routing, same-origin proxy, real login, MFA, service APIs and cross-portal test coverage; B21 adds audited account suspension/reactivation, server-authoritative financial reports, paginated audit and bounded CSV export; B20 adds role-scoped support, device maintenance, notification inbox and reliable leased jobs; B19 adds legally gated immutable invoices, verified partial refunds, tax credit notes and provider reconciliation; B18 adds reviewed driver earnings, frozen settlement snapshots and provider-verified payout reconciliation; B17 adds consent-led GPS trips and qualified playback aggregation; B16 adds signed screen-specific manifests, private media references and device heartbeat reports. B15 adds delivery scheduling and pause/resume; B14 adds Cashfree order creation, signed webhooks, independent payment verification and safe paid booking confirmation. B23 release engineering, backup/drill tools, deployment staging blueprint, read-only health monitoring, approval gates and handover are now implemented. External staging/production deployment, provider onboarding, real restore drill and legal/security signoffs remain pending. No production KYC provider, private S3 bucket or legal retention policy was provisioned. Production Neon, email and same-site domain configuration are not complete. Production domains, Neon and Resend provisioning are not complete. Do not confuse health endpoints with production business functionality.

| Part | Scope | Acceptance evidence |
| --- | --- | --- |
| B0 | Architecture, API contract, database blueprint, frontend map, decisions | Reviewed versioned OpenAPI, passing contract integrity tests and existing frontend CI |
| B1 | Express/TypeScript runtime, env guards, health, error middleware, CI | Server starts locally; validated env; integration tests; no demo credentials |
| B2 | Neon/Postgres, Prisma migrations, DB constraints, seed policies | Fresh migration + rollback strategy, data access and transaction tests |
| B3 | Signup/login/verification/recovery/secure sessions | Hashes, OTP provider sandbox, secure session/cookie, abuse tests |
| B4 | RBAC, ownership, Admin MFA, CSRF, throttling | Cross-tenant negative tests and audit trail |
| B5 | Advertiser businesses, profiles and public enquiry APIs | End-to-end persistence and authorization tests |
| B6 | Driver onboarding and vehicles | Five-step real state persistence, draft/resume, submission |
| B7 | Private KYC documents, agreements, human/provider review | Signed upload, consent, retention and decision tests |
| B8 | Device provisioning and secure pairing | Device identity, revocation, signed manifests, telemetry contract |
| B9 | Cities, zones, geo inventory | Zone CRUD guard, spatial index/query tests |
| B10 | Creative media ingestion/transcoding/moderation | Validated private media, malware/codec tests |
| B11 | Versioned pricing, quotes, tax/discount policy | Exact-paise quote snapshots and expiry tests |
| B12 | Campaign creation, reviews, lifecycle | Server state machine and owner checks |
| B13 | Inventory holds and booking confirmations | Race tests, overlap prevention, hold TTL, idempotency |
| B14 | Cashfree order creation, payments, verified webhooks | Provider sandbox E2E, replay/reconciliation protection |
| B15 | Delivery scheduling, activation/pauses (implemented) | Playback window and device schedule tests |
| B16 | Player gateway, signed playlists and heartbeat ingestion (implemented) | Device simulator, authentication and replay test |
| B17 | Trips, consent-led GPS, qualified playback aggregation (implemented; viewer verification pending) | Accuracy, privacy and event-consistency tests |
| B18 | Earnings ledger, beneficiaries and payouts (implemented; live provider onboarding gated) | Ledger integrity, payout sandbox, reconciliation |
| B19 | Taxes/invoices/refunds/financial reconciliation (implemented; production tax signoff gated) | Verified finance artifacts and accounting tests |
| B20 | Support, maintenance, notifications and jobs (implemented; external scheduler not deployed) | Role-scoped helpdesk and resilient queue tests |
| B21 | Admin reports, users and audit (implemented; operator policy review required) | Correct aggregates, audited decisions, secure export tests |
| B22 | Frontend service migration and cross-portal integration (API mode integrated; production provider signoffs gated) | Demo vs API mode clearly separated; full E2E tests |
| B23 | Production release, monitoring, backups and handover (repository controls implemented, external cutover blocked) | CI gate + independent staging/pilot signoffs, encrypted backup/restore drill and legal/security/deployment checks |

Required workflow per part: implement -> unit/contract/integration/security tests -> lint/typecheck/build -> GitHub Actions green -> deploy staging where appropriate -> audit actual runtime behavior. B23 must not be declared production-ready from CI alone.
