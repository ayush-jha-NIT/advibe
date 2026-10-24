# AdVibe Frontend

Responsive four-portal frontend for AdVibe: Public Website, Advertiser Portal, Driver Partner Portal and Admin Portal.

## Status

**Parts 0–4 complete:** Official approved logo; role-aware UI component library; responsive public navbar/footer; admin, advertiser and driver navigation shells; live route switching, mobile drawer and navigation search.

**Part 3 adds:** typed fictional data for accounts, campaigns, creatives, screens, vehicles, locations, bookings, payments and settlements; owner-aware selectors; persisted Zustand store; pricing and availability validations; and cross-portal interactive dashboard previews.

**Part 4 adds:** The mobile-first landing page, 9.6-second CSS/SVG cinematic animation, role-specific signup CTAs, format cards, campaign walkthrough and illustrative interactive city explorer.

**Not implemented:** Real login/authorization, OTP, campaign wizard, Cashfree payments, actual payouts, KYC or device telemetry. Module routes remain labeled placeholders. Demo role switching is not security; no real personal or payment data should be stored here.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, ESLint.

## Local setup

Requires Node.js 20.9+ (Node 22 recommended).

~~~bash
git clone https://github.com/ayush-jha-NIT/advibe.git
cd advibe
npm install
cp .env.example .env.local
npm run dev
~~~

Open http://localhost:3000.

## Route previews

- / : Implemented public landing page
- /design-system : Part 1 component showcase
- /admin : Admin shell
- /advertiser : Advertiser shell
- /driver : Driver Partner shell
- /login and /signup : Authentication placeholders

Full route map: [docs/ROUTES.md](docs/ROUTES.md)

## Verification

~~~bash
npm run lint
npm run typecheck
npm run test:demo
npm run build
~~~

CI executes these on pushes and pull requests.

## Implementation references

- [Roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Demo data engine and payment boundaries](docs/DEMO_ENGINE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Brand rules](docs/BRAND.md)
- [Landing implementation notes](docs/LANDING.md)

The supplied megaphone artwork is the sole approved AdVibe logo. Cashfree requires backend order creation and verification; secret keys must never enter NEXT_PUBLIC environment variables.
