# AdVibe Frontend

Mobile-first frontend for AdVibe's Public Website, Advertiser Portal, Driver Partner Portal and Admin Portal.

**Current status:** Part 0 foundation only. Portal pages, login flows, shared demo data and Cashfree integration have **not** been implemented yet.

## Tech foundation

- Next.js 16 App Router, React 19, strict TypeScript
- Tailwind CSS 4 and ESLint flat config
- shadcn/ui-compatible project aliases (components are added in Part 1)
- Planned: React Hook Form + Zod, Zustand, Recharts, Motion, Lucide, interactive maps

## Local setup

Requires Node.js 20.9+ (Node 22 recommended) and npm.

~~~bash
git clone https://github.com/ayush-jha-NIT/advibe.git
cd advibe
npm install
cp .env.example .env.local
npm run dev
~~~

Open http://localhost:3000.

## Validation

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

The GitHub Actions workflow runs these checks on pushes and pull requests.

## Design and implementation plan

See [Roadmap](docs/ROADMAP.md), [Architecture](docs/ARCHITECTURE.md) and [Brand rules](docs/BRAND.md).

## Important boundaries

This is a **frontend project**. Browser demo storage does not provide real authentication, cross-device synchronization, financial settlement, identity verification or device telemetry. Cashfree will be used for payments after a secure backend integration exists; no Cashfree secret must be exposed in frontend code.

**Branding:** Use only the supplied "AdVibe Megaphone Brand Logo.png" for logo assets. The actual logo is introduced in Part 1; the Part 0 starter view intentionally shows no substitute logo.
