# AdVibe frontend architecture

## Implemented foundation (Parts 0–3)

- Next.js 16 App Router and TypeScript for route groups, layouts and typed components.
- CSS role tokens in globals.css: public orange, admin purple, advertiser/driver blue.
- Official source artwork at public/brand/advibe-logo.png and icon.png.
- src/config/navigation.ts is the single source for portal routes, labels, navigation descriptions and search suggestions.
- src/app/(site) provides public pages with a shared public shell.
- src/app/(auth) provides auth route placeholders with consistent public navigation.
- src/app/(portals)/admin, advertiser, driver wrap their own content with PortalShell. Each portal has active navigation, search, user menu and responsive drawer.
- src/app/design-system preserves the Part 1 UI showcase independently of the site layout.
- src/types/domain.ts + src/data/demo-seed.ts define fictional linked records.
- src/services/demo-store.ts persists sanitized demo data in browser storage (not for secrets), and src/services/demo-selectors.ts defines cross-portal views.
- src/lib/demo-rules.ts handles date, allocation, pricing, campaign and driver-approval rules; tests run in CI.
- The three portal dashboards provide live cross-portal demo data previews, while individual business modules remain placeholders.
- src/components/shared contains placeholder pages until each business feature is implemented.

See ROUTES.md for full path inventory and status.

## Planned application technology boundaries

- Interactive features will become React client components only where interactivity is needed.
- Typed domain models and replaceable service adapters will isolate browser demo repositories from production backend APIs (Part 3).
- Browser persistence is for non-sensitive frontend demo records only.
- Cashfree Checkout uses frontend SDK, but backend endpoints must create orders and verify authoritative payment status; no Cashfree secret in client code.
- Actual screen diagnostics/control, device telemetry, GPS reports, SMS/OTP, KYC decisions, and real payouts require production integrations.
- No production authentication/authorization exists. All portals remain navigable demos; frontend role checks are not an access control.

## Planned source folder architecture

- src/app/: pages and route layouts
- src/components/: shared UI primitives and navigation shells
- src/config/: canonical navigation and static configuration
- src/features/: business modules and portal features
- src/data/: demo fixtures
- src/services/: replaceable repositories and adapters
- src/lib/: utilities, calculations, shared theme
- src/types/: typed domain contracts

## Fundamental domain invariants for future phases

- Inventory allocation must prevent conflicting bookings.
- Creative file format is distinct from physical screen format and placement.
- Pricing uses one engine with explicit units, taxes and validity.
- Advertiser payment success cannot automatically make a campaign live.
- Admin review and driver verification propagate to shared records.
- Credentials, KYC artifacts and full bank details must never be persisted in browser localStorage.
