# AdVibe routing inventory

**Current status:** Part 4 homepage and eight Part 5 marketing pages implemented. Legal policy routes await reviewed source text, production auth and operational modules remain separate future stages. Portal dashboards contain fictional Part 3 demo data.

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
- /advertiser
- /advertiser/create-campaign (future six-step wizard, Parts 8–9)
- /advertiser/campaigns
- /advertiser/ad-formats
- /advertiser/locations
- /advertiser/creatives
- /advertiser/billing
- /advertiser/reports
- /advertiser/notifications
- /advertiser/support
- /advertiser/settings

Campaign detail routes will be added in Part 10.

## Driver Partner Portal

Root: /driver. Paths:
- /driver
- /driver/onboarding (future five-step wizard, Parts 13–14)
- /driver/verification
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
