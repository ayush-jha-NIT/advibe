# AdVibe frontend roadmap

Client-approved visual reference set: 59 screenshots across Public, Admin, Advertiser and Driver Partner portals.

| Parts | Stage | Scope |
|---|---|---|
| 0–3 | Foundation | Repository, design system, layouts, typed demo records |
| 4–6 | Public Website | Landing animation, marketing pages, auth |
| 7–12 | Advertiser | Dashboard, six-step campaign wizard, creatives, billing |
| 13–17 | Driver | Five-step onboarding, vehicle, delivery, earnings, maintenance |
| 18–21 | Admin | Approvals, operations, inventory, finance, analytics and users |
| 22–23 | QA and delivery | Cross-portal checks, mobile reliability, CI, Vercel handoff |

## Current progress

- [x] Part 0: Repository initialization, toolchain and GitHub CI
- [x] Part 1: Approved logo, brand tokens and interactive UI components
- [x] Part 2: Public/portal shells, mobile navigation, route placeholders, menu search
- [x] Part 3: Shared demo repositories, Zustand persistence, business rules, linked domain records, tests and role-aware data
- [x] Part 4: Mobile-first landing page, animated hero, advertiser/driver CTAs, formats and city explorer
- [x] Part 5: Public pages, creative formats, cities, pricing calculator, support search, email contact
- [x] Part 6: Responsive demo login, role signup, OTP, recovery and local session access gates
- [x] Part 7: Advertiser dashboard and My Campaigns listing, KPIs, visualizations, filtering, CSV and allowed demo draft submissions
- [x] Part 8: Six-step advertiser campaign wizard with persistent drafts, media preview, screen targeting, weekday quote and review submission
- [x] Part 9: Wizard creative-file inspection, zone targeting, schedule warnings, mobile step controls and regression tests
- [x] Part 10: Advertiser-owned campaign detail pages, metadata tabs, audit timeline, demo pause/resume/cancel and linked billing records
- [x] Part 11: Creative metadata library, ad-format comparison and sample-screen location explorer linked to the wizard
- [x] Part 12: Advertiser billing ledger, non-tax statement previews, reports, notification center, demo profile/preferences and support tickets
- [x] Part 13: Driver onboarding steps 1–3, sample profile and vehicle details, mock KYC readiness, session persistence and validation
- [x] Part 14: Driver onboarding steps 4–5 (mock screen installation, payout-readiness, agreement), guarded demo submission and verification preview
- [x] Part 15: Driver dashboard, vehicle and screen inventory, confirmed assigned campaigns, and IST daily scheduling
- [x] Part 16: Driver sample earnings, status-filtered payout ledger, monthly breakdown and CSV
- [x] Part 17: Driver maintenance reports, support, notifications, read-only profile, activity/trips boundaries
- [x] Part 18: Admin dashboard, campaign reviews and creative metadata approvals
- [x] Part 19: Admin driver verification and screen/location inventory
- [x] Part 20: Admin sample pricing, bookings, payments and driver settlements
- [x] Part 21: Admin reports, accounts, tickets, notifications, settings and audit
- [x] Part 22: Cross-portal navigation, mobile focus/accessibility fixes, contrast, route regression checks and QA checklist
- [x] Part 23 (frontend release engineering): Automated Chromium cross-portal smoke, static release checks, HTTPS health probe, Vercel handoff and manual QA checklist. Live deploy/physical-device sign-off remain pending.

**Part 3 delivers a frontend demo engine, not a backend.** Role switching is public, data is fictional and browser-local, device controls are simulated and no Cashfree checkout occurs. See [DEMO_ENGINE.md](DEMO_ENGINE.md) and [ROUTES.md](ROUTES.md).

**Authentication boundary:** Part 6 is a sessionStorage demo, not secure login. Demo OTP 123456 and preset credentials are intentionally visible. Real identity verification, email/SMS, sessions, password resets, rate limiting and server-side RBAC require the backend.

**Part 7:** dashboard statistics and charts only summarize fictional, owner-scoped campaign data; there is no verified reach, time-series, production accounting or billing. The campaign wizard and detail pages are reserved for later phases.

**Part 9:** The wizard checks local preview media headers and dimensions, detects stale/incompatible screen targets, rechecks future dates, and has compact phone navigation. These are frontend demo safeguards, not production asset validation or reservation.

**Part 10:** Details show only stored campaign metrics, creative metadata, demo screen assignments, real recorded audit entries in the local dataset, and demo payment records. Cancellation does not refund Cashfree; pause/resume do not send hardware commands. Owner check is a local demo UI rule, not server authorization.

**Part 11:** The library saves only creative metadata, never file contents. Format pricing and location availability use fictional demo records; adding targets to the wizard is only a provisional planning action. Backend asset storage, moderation, live device inventory, reliable location maps and real booking are still required.

**Part 12:** Billing and statements come only from fictional existing payments, with no Cashfree gateway activation, charge, refund or valid tax invoice. Profile and notifications remain browser-local; tickets do not reach customer service. Reports contain only stored demo totals, not actual delivery metrics.

**Part 13:** Driver onboarding is an explicitly fictional session-only preview. No government IDs, legal names, phone numbers, actual vehicle registration details, bank information or documents are accepted or stored. Steps 4–5 and production KYC verification require trusted backends. The seeded driver and vehicle approval are never overwritten by onboarding preview.

**Part 14:** The five-step wizard now validates sample placement and payout/consent readiness. A final submission creates a separate driverPreviewApplications record and Admin notice, not a KYC approval. Real banking credentials and document uploads are never collected, and seeded approved driver/vehicle/screen records remain intact.

**Part 15:** The dashboard, vehicle/screens, assigned ads and campaign pages derive sample data from driver-owned screens and confirmed bookings. The calendar uses Asia/Kolkata civil dates and stored campaign weekday/time preferences. No GPS, actual ad playback, driver trips, physical screen controls or telemetry are claimed. Existing driver and advertiser state mutations remain unchanged.

**Part 16:** Settlement analytics use only the driver-owned fictional ledger and integer-paise amounts. There are no bank transactions, payout timestamps, verified earnings or tax documentation.

**Part 17:** Driver issue reports must reference driver-owned screens. Both maintenance and support create browser-local tickets and Admin notices, not repairs/helpdesk dispatch. Notifications are owner-scoped; profile documents are read-only. Trips/activity show explicit missing telemetry rather than fabricated playback/GPS.

**Parts 18–21:** All Admin navigation routes now lead to dedicated views and operations. Actions are protected by seeded demo role/transition guards, create local audit records and notices, and never claim real money movement, KYC, hardware telemetry or production user access control. See docs/ADMIN_PART_18.md through docs/ADMIN_PART_21.md.

**Part 22:** Shared public and portal drawers trap keyboard focus and restore it, portal search ID collisions are removed, route main landmarks and skip links are improved, misleading preview copy is corrected, orange CTAs have more legible navy labels, and accessibility/route tests are added. See docs/PART_22_QA.md. Real browser/device accessibility testing remains Part 23.

**Part 23 handoff:** The approved 24-part frontend-demo roadmap is code-complete and CI-gated, with an actual Chromium browser test of the built app. No matching AdVibe Vercel project was found under the currently connected accounts when checked, so production URL, deployment and physical-device manual sign-off cannot be marked verified. Production backend, KYC, payments, devices, legal terms and account security remain launch blockers. See docs/PART_23_RELEASE.md and docs/PRODUCTION_READINESS.md.

## Production backend roadmap (separate workstream)

- [x] **B0**: Architecture, versioned OpenAPI contract, PostgreSQL/Prisma design, frontend-to-API mapping, security/transaction invariants, decision register and automated contract tests. **Design only; no executable backend.**
- [ ] **B1–B23**: Production backend runtime through secure launch. Implement sequentially following [Backend roadmap](backend/BACKEND_ROADMAP.md). These are NOT included in the 24 completed frontend parts.

Current B0 contract: [contracts/openapi.v1.json](../contracts/openapi.v1.json). See [B0 architecture](backend/B0_ARCHITECTURE.md) and [B0 database](backend/B0_DATABASE.md). Real authentication, file storage, payment gateway, KYC and devices remain future implementation work.
