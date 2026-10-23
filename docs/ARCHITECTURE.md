# AdVibe frontend architecture

## Technology boundaries

- Next.js App Router for routing, layouts and server-rendered content.
- Interactive forms and portal tools use client components only where needed.
- Typed domain models and adapters isolate demo repositories from future backend APIs.
- Browser persistence holds non-sensitive demo state only.
- Cashfree Checkout is a frontend integration. Secure order creation and authoritative payment verification belong to the backend.
- Hardware diagnostics, screen controls, telemetry, location pings, SMS/OTP, KYC and real payouts are not active in the initial demo.

## Planned route groups

- Public marketing pages at /, /about, /pricing and other public routes
- Authentication screens at /login, /signup and /verify
- Advertiser workspace under /advertiser/*
- Driver partner workspace under /driver/*
- Admin workspace under /admin/*

Only the root placeholder is implemented in Part 0. Routes will be added during their designated roadmap parts, not as dead-end links.

## Planned source folders

- src/app/ : route groups and page layouts
- src/components/ : shared UI primitives and portal navigation
- src/features/ : campaign, driver, inventory, payment, settlement and support modules
- src/data/ : shared demo seed records
- src/services/ : replaceable repositories and adapters
- src/lib/ : utilities and calculations
- src/types/ : domain types and contracts

## Fundamental domain invariants

- Inventory allocation prevents conflicting reservations.
- Creative *file format* is distinct from physical advertising placement.
- Pricing uses a single rule engine with clear units and validity dates.
- An advertiser payment never automatically marks a campaign live.
- Admin review and driver verification change the same records the portals read.
- Payout details are masked and sensitive banking credentials never enter localStorage.
