# AdVibe Frontend

Responsive four-portal frontend for AdVibe: Public Website, Advertiser Portal, Driver Partner Portal and Admin Portal.

## Status

**Part 2 complete:** Official approved logo; role-aware UI component library; responsive public navbar/footer; admin, advertiser and driver navigation shells; live route switching, mobile drawer and navigation search.

**Not implemented:** Real login/authorization, OTP, campaign wizard, Cashfree payment processing, payouts, KYC, device/vehicle telemetry or interconnected demo data. These are planned for later parts. Current portal routes are honest placeholders, not fully built dashboards.

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

- / : Public website shell preview
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
npm run build
~~~

CI executes these on pushes and pull requests.

## Implementation references

- [Roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Brand rules](docs/BRAND.md)

The supplied megaphone artwork is the sole approved AdVibe logo. Cashfree requires backend order creation and verification; secret keys must never enter NEXT_PUBLIC environment variables.
