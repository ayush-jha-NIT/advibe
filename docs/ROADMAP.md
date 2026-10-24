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
- [ ] Parts 8–23: Campaign wizard, remaining advertiser modules, driver/admin workflows, integrations and mobile QA

**Part 3 delivers a frontend demo engine, not a backend.** Role switching is public, data is fictional and browser-local, device controls are simulated and no Cashfree checkout occurs. See [DEMO_ENGINE.md](DEMO_ENGINE.md) and [ROUTES.md](ROUTES.md).

**Authentication boundary:** Part 6 is a sessionStorage demo, not secure login. Demo OTP 123456 and preset credentials are intentionally visible. Real identity verification, email/SMS, sessions, password resets, rate limiting and server-side RBAC require the backend.

**Part 7:** dashboard statistics and charts only summarize fictional, owner-scoped campaign data; there is no verified reach, time-series, production accounting or billing. The campaign wizard and detail pages are reserved for later phases.
