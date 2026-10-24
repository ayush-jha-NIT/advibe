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
- [ ] Parts 5–23: Remaining website, workflows, integrations and QA

**Part 3 delivers a frontend demo engine, not a backend.** Role switching is public, data is fictional and browser-local, device controls are simulated and no Cashfree checkout occurs. See [DEMO_ENGINE.md](DEMO_ENGINE.md) and [ROUTES.md](ROUTES.md).
