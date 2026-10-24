# AdVibe routing inventory

**Current status:** Part 4 homepage and eight Part 5 marketing pages implemented. Legal policy routes await reviewed source text, production auth and operational modules remain separate future stages. Advertiser dashboard and campaign directory are implemented in Part 7, using fictional browser-local campaign data.

## Public website

| URL | Approved screenshot concept | Implementation phase |
| --- | --- | --- |
| / | Landing/home + public navigation | Completed in Part 4 |
| /for-advertisers | Advertiser marketing page | Completed in Part 5 |
| /for-drivers | Driver marketing page | Completed in Part 5 |
| /ad-formats | Public ad formats | Completed in Part 5 |
| /locations | Public locations | Completed in Part 5 |
| /pricing | Cost calculator and formats | Completed in Part 5 |
| /about | About AdVibe | Completed in Part 5 |
| /contact | Support contacts and enquiry | Completed in Part 5 |
| /help-center | Public FAQ/help hub | Completed in Part 5 |
| /privacy | Privacy | Part 5 |
| /terms | Terms | Part 5 |
| /login | Auth login, password and OTP | Part 6 demo implemented |
| /signup | Advertiser/driver registration | Part 6 demo implemented |
| /verify | Email/phone account verification | Part 6 demo implemented |
| /forgot-password | Password recovery | Part 6 demo implemented |
| /reset-password | Password reset | Part 6 demo implemented |
| /design-system | Part 1 interactive UI specimen | Complete |

## Admin Portal

Root: /admin. Routes for Dashboard, Campaigns, Advertisers, Driver Partners, Screens & Devices, Locations & Zones, Ad Formats & Rules, Pricing & Commercial, Approvals, Bookings & Schedule, Payments & Refunds, Driver Settlements, Reports & Analytics, Users & Roles, Notifications, Support & Disputes, Settings.

Implemented paths:
- /admin
- /admin/campaigns
- /admin/advertisers
- /admin/drivers
- /admin/screens
- /admin/locations
- /admin/ad-formats
- /admin/pricing
- /admin/approvals
- /admin/bookings
- /admin/payments
- /admin/settlements
- /admin/analytics
- /admin/users
- /admin/notifications
- /admin/support
- /admin/settings

Review and monitoring detail URLs will be introduced with the respective admin modules (Parts 18–21), not filled with nonfunctional fake controls now.

## Advertiser Portal

Root: /advertiser. Paths:
- /advertiser (Part 7 interactive dashboard)
- /advertiser/create-campaign (Part 8 wizard, refined in Part 9 for media, targeting, scheduling and phones)
- /advertiser/campaigns (Part 7 responsive filterable listing)
- /advertiser/ad-formats (Part 11 interactive format catalogue)
- /advertiser/locations (Part 11 sample inventory and wizard prefill)
- /advertiser/creatives (Part 11 creative metadata library)
- /advertiser/billing (Part 12 demo ledger, checkout boundary, sample statement)
- /advertiser/reports (Part 12 fictional campaign aggregates and CSV)
- /advertiser/notifications (Part 12 account-owned read-state controls)
- /advertiser/support (Part 12 local support ticket form and FAQs)
- /advertiser/settings (Part 12 demo profile and local UI preferences)

Campaign detail route /advertiser/campaigns/[id] is implemented in Part 10 with owner-scoped demo record details, local audit history, billing metadata and permitted status actions. No real device or payment operations are issued.

## Driver Partner Portal

Root: /driver. Paths:
- /driver
- /driver/onboarding (Parts 13–14 full five-step responsive demo wizard, review and submission)
- /driver/verification (Part 14 independent sample request vs seeded application status)
- /driver/vehicle
- /driver/assigned-ads
- /driver/campaigns
- /driver/earnings
- /driver/payouts
- /driver/delivery
- /driver/trips
- /driver/maintenance
- /driver/notifications
- /driver/support
- /driver/profile

## Shared layout behavior

- Public header: approved logo, primary nav + grouped dropdowns, login/signup CTA, compact mobile drawer; public footer with working route links.
- Three portal shells: dark-navy branded sidebar, distinct purple/blue active accents, top header, navigation-only search, notification preview, role switcher, desktop sidebar collapse.
- Mobile: accessible menu trigger, overlay close, Escape support, body-scroll lock, vertically scrolling sidebar, search below compact toolbar.
- Screens below tablet width use single-column layouts. Shell content can horizontally shrink without causing document-wide overflow. Individual future data tables must implement their own intentional scrolling.
- Search searches **navigation descriptions and labels only** until real data is available.
- Portal switching is **demonstration only**. Part 6 adds browser-session role gates and sign-out, which are UX aids, **not authorization or identity security**. Production sessions and server-side checks do not exist.
- Unknown /admin/[section], /advertiser/[section], /driver/[section] slugs return Next.js 404 (not generic success placeholders).

## Source mapping

- src/config/navigation.ts: canonical nav items and routes
- src/components/layout/public-shell.tsx: public site header/mobile nav/footer
- src/components/layout/portal-shell.tsx: three portal layouts + interactions
- src/components/shared/section-placeholder.tsx: future module placeholders
- src/components/shared/public-placeholder.tsx: planned marketing/auth placeholder
- src/app/(site): public routes + layout
- src/app/(auth): authentication route placeholders + layout
- src/app/(portals): admin, advertiser, driver route groups

## Later-phase upgrade path

Replace each placeholder route with its actual feature page. Keep the route paths stable and source menu definitions from src/config/navigation.ts. Production backend integration must implement real session verification, HTTP-only cookies and server-side role and ownership checks. Client role gates do not secure any data.

## Part 7 advertiser access and boundaries

The /advertiser homepage and /advertiser/campaigns use selectors scoped to the preset demo advertiser account (adv-1). Users registering new demonstration identities see an empty account, not the preset advertiser's campaigns. Data is browser-local and is not a security boundary. A real backend must enforce ownership. The creation wizard now has six steps and draft/resume support (Part 8). Full campaign details and real tracking belong to later phases.

## Part 11 advertiser submodules

The ad-format comparison, screen/location planner and creative library are implemented. Display numbers come from shared seeded demo data and browser-local changes. Users can explicitly copy provisional format, date and eligible screen IDs into their wizard draft after confirming replacement. Media files are inspected locally and previews are not stored or uploaded. Admin review, real creative delivery, GPS, payment and booking are not connected.

## Part 12 advertiser account modules

The billing, reports, notifications, support and settings pages are implemented. They use sample browser-local records, and none should be confused with a real payment, official tax invoice, device telemetry, authenticated account update, or external support ticket. The Cashfree checkout button is deliberately unavailable pending trusted backend integration. See docs/ADVERTISER_PART_12.md.

## Part 13 driver onboarding

The driver landing dashboard links to /driver/onboarding. The first three onboarding previews collect only sample alias, operating city, driving experience/availability, generic vehicle category/model/year/ownership, and three boolean placeholder document-readiness states. They validate each step and persist the allowlisted draft in sessionStorage. No personal KYC identifiers or file bytes are requested. Approval of seeded demo driver and vehicle records remains unchanged, and real KYC, device installation, agreement, banking and submission are reserved for Part 14 and server integrations.

## Part 14 driver screen and payout demo

All five onboarding steps are interactive. Step 4 chooses a display type appropriate for the sample vehicle and confirms illustrative installation/power checks. Step 5 chooses weekly/monthly example payout frequency and requires explicit example agreement/consent acknowledgements; it never accepts account numbers, UPI IDs, IFSC, real identity documents or device tokens. Review submits an isolated, browser-local fictional driver review record and Admin notice. The existing seeded driver and vehicle approvals are unaffected. The separate /driver/verification route distinguishes the demo review request from existing sample verification. See docs/DRIVER_PART_14.md.
