# AdVibe Frontend Handover

## Source

GitHub: https://github.com/ayush-jha-NIT/advibe
Branch: main
Scope: approved 24-part frontend demo roadmap.
Technology: Next.js 16, React 19, TypeScript, Tailwind 4, Zustand, Recharts, Zod, Node tests and Playwright Chromium.

Brand logo: public/brand/advibe-logo.png. Design tokens: src/app/globals.css.

## Development

~~~bash
git clone https://github.com/ayush-jha-NIT/advibe.git
cd advibe
npm install
cp .env.example .env.local
npm run dev
~~~

Open http://localhost:3000. Node 22 recommended.

Verification:
~~~bash
npm run check
npx playwright install chromium
npm run start -- --port 3100
# Another terminal
BASE_URL=http://localhost:3100 npm run test:browser
~~~

## Public sample login details, not real credentials

- Advertiser: advertiser@demo.advibe.test
- Driver: driver@demo.advibe.test
- Admin: admin@demo.advibe.test
- Common sample password: AdVibe@123
- Demonstration OTP: 123456

These identities are intentionally fictional and cannot secure a live service.

## Source organization

- src/app/(site): public pages and legal preview notices
- src/app/(auth): demo login/signup/verification/recovery
- src/app/(portals): Advertiser, Driver and Admin routes
- src/components/layout: navigation and page shells
- src/components/ui: reusable brand UI components
- src/features: individual portal feature modules and rules
- src/data/demo-seed.ts: fictional seed records
- src/services/demo-store.ts: browser-local shared store
- src/types/domain.ts, src/lib/demo-rules.ts: typed model and shared validation
- tests: domain, routes, accessibility and release guards
- scripts/release-smoke.mjs: Chromium built-app smoke tests
- scripts/deployment-health.mjs: HTTPS deployment read-only health check
- docs/ROADMAP.md: completed implementation parts

The shared demo engine persists in localStorage, and mock role sessions in sessionStorage. Only one browser's fictional records are linked between portals. There is no backend, secure credential store or network synchronization. No real OTPs, Cashfree transactions, bank payouts, KYC, playback or GPS can occur.

The Admin reset restores seeded fictional records and clears local demo changes. Avoid entering real credentials, identity documents or bank data.

## Acceptance

Read PART_23_RELEASE.md for release checks, manual QA and Vercel handoff. Read PRODUCTION_READINESS.md for actual production blockers.

Code delivery is separate from a Vercel deployment. None of the currently connected Vercel project lists returned an AdVibe project during preparation, so no deployment URL or production status is asserted.
