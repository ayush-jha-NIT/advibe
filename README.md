# AdVibe Frontend

Responsive four-portal frontend for AdVibe: Public Website, Advertiser Portal, Driver Partner Portal and Admin Portal.

## Status

**Parts 0–11 complete:** Official approved logo; role-aware UI component library; responsive public navbar/footer; admin, advertiser and driver navigation shells; live route switching, mobile drawer and navigation search.

**Part 3 adds:** typed fictional data for accounts, campaigns, creatives, screens, vehicles, locations, bookings, payments and settlements; owner-aware selectors; persisted Zustand store; pricing and availability validations; and cross-portal interactive dashboard previews.

**Part 4 adds:** The mobile-first landing page, 9.6-second CSS/SVG cinematic animation, role-specific signup CTAs, format cards, campaign walkthrough and illustrative interactive city explorer.

**Part 5 adds:** Eight responsive marketing pages (advertisers, drivers, ad formats, locations, pricing, about, contact and help), demo format selection, city filtering, FAQs, price estimator and email-client enquiry preparation. These do not provide live inventory, binding prices or contact API submissions.

**Part 6 adds:** Responsive demo login, advertiser and driver signup, mock six-digit OTP, password recovery screens, role-based browser-session preview gates and sign-out. Demo credentials and OTP are intentionally public; signup does not create a server account or save entered passwords.

**Part 7 adds:** A responsive advertiser dashboard with owner-scoped KPIs and Recharts charts; a mobile card/desktop table campaign directory with search, status tabs, date filters, sorting, pagination, a record-details modal, CSV export, and demo draft submission.

**Part 8 adds:** Six-step advertiser campaign wizard, local creative preview, provisional location/screen selection, date and weekday schedule checks, integer-paise price and 18% illustrative GST, persistent local draft/resume, and submit-for-Admin-review only. No Cashfree checkout, file transfer or screen reservation occurs.

**Part 9 adds:** Browser-only image/video file header and metadata checks, city/zone/ID targeting filters, bulk screen selection with stale inventory warnings, weekday presets and delivery-day feedback, future-date safeguards, and compact mobile wizard step controls.

**Part 10 adds:** Dedicated advertiser campaign detail pages with Overview, Creative, Locations & Screens, Review History and Billing sections; actionable demo pause/resume/cancel with lifecycle validation, local audit entries and affected-driver notifications on demo booking cancellation.

**Part 11 adds:** Interactive Advertiser Creative Library with metadata-only create/edit/delete, local file validation and previews; Ad Formats comparison with applicable fictional rate cards; Locations exploration with status/date filters, schematic map, screen selections and intentional wizard prefill. All operations remain role-scoped client-side demonstrations.

**Not implemented:** Real backend login/authorization, live OTP, production creative uploads and moderation, Cashfree payments, actual payouts, KYC or device telemetry. Many operational module routes remain placeholders. Demo role switching is not security; no real personal or payment data should be stored here.

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
- /for-advertisers, /for-drivers, /ad-formats, /locations, /pricing, /about, /contact, /help-center : Part 5 public pages
- /design-system : Part 1 component showcase
- /advertiser/campaigns : Part 7 campaign directory
- /advertiser/create-campaign : Part 8 six-step wizard refined in Part 9
- /admin : Admin shell
- /advertiser : Advertiser shell
- /driver : Driver Partner shell
- /login, /signup, /verify, /forgot-password, /reset-password : Interactive demonstration-only account flows

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
- [Part 5 public page notes](docs/PUBLIC_PART_5.md)
- [Part 6 demo authentication and limitations](docs/AUTH_PART_6.md)

The supplied megaphone artwork is the sole approved AdVibe logo. Cashfree requires backend order creation and verification; secret keys must never enter NEXT_PUBLIC environment variables.

- [Part 7 advertiser UI and data boundaries](docs/ADVERTISER_PART_7.md)

- [Part 8 six-step advertiser wizard and data safety](docs/ADVERTISER_PART_8.md)

- [Part 9 wizard reliability and mobile UX](docs/ADVERTISER_PART_9.md)

- [Part 10 campaign details, lifecycle rules and limitations](docs/ADVERTISER_PART_10.md)

- [Part 11 creative library, formats and locations](docs/ADVERTISER_PART_11.md)
