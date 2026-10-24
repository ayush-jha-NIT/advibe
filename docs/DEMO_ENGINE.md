# Part 3: Shared frontend demo data engine

**Not a production backend.** All records are fictional. Every browser has its own dataset in localStorage, versioned under \`advibe:demo:v1\`. Reloading keeps edits. Multiple roles in one browser operate on the same persisted dataset. Other browsers/devices do not share data. A separate signed-in role is not established.

## Domain contracts
\`src/types/domain.ts\`: accounts, campaigns, creatives, bookings, locations, zones (location.zone), vehicles, screens, rates, payments, driver applications, settlements, notifications, support tickets and audit events.

\`src/data/demo-seed.ts\`: deterministic connected data and three sample actors. **Only fake names and masked registration numbers.** No Aadhaar, licence details, account numbers, passwords, keys or uploaded document blobs.

## Data access
\`src/services/demo-store.ts\`: Zustand immutable updates, versioned JSON persistence, manual hydration after mount, browser-tab storage synchronization, reset via demo admin. Mutations enforce basic demo role/owner checks and produce shared notices/audit events.

\`src/services/demo-selectors.ts\`: one owner-aware read path; campaign-to-screen, screen-to-campaign, driver-to-campaign, advertiser/driver/admin summary selectors.

\`src/services/demo-repository.ts\`: async readonly adapter interface for eventual API substitution.

**Critical caveat:** Any user can switch roles through the existing demo portal menu. Data is present in a client-side bundle and localStorage; these checks are UX demonstrations, not access controls. A production backend must authenticate the actor, authorize every request, validate ownership, and return only permitted records.

## Pure business rules
\`src/lib/demo-rules.ts\`:
- Validate ISO calendar dates, inclusive days, maximum 366-day demo duration.
- Reject overlapping screen allocations (inclusive boundaries), offline screens, unverified drivers and creative/physical-placement mismatch.
- Quote in *integer paise*, explicitly INR per screen **per day**, using one city/placement rate valid for the full campaign. Apply whole-percent discount before 18% GST, rounding paise.
- Guard campaign status transitions. Admin approval does not mean payment or launch; scheduling requires a paid flag in the **demo** and confirmed screen bookings; go-live checks both.
- Require all five onboarding steps and reviewed documents + device setup before demo approval.
- Provide a role-aware filtering and action matrix, never to be reused as security on a real server.

Current driver earnings are seeded settlement records, not verified actual GPS-derived ad delivery. Device status changes are simulation only.

## Payment provider boundary
\`src/services/cashfree-contract.ts\` specifies a future order-creation and payment-verification interface. Part 3 does **not** call Cashfree, accept payment, or process payouts. Payment state in demo data is deliberately fictional. Production must create Cashfree orders on the backend and verify signed webhooks / authoritative status server-side before updating orders and granting campaign activation.

## How to test

\`\`\`bash
npm run test:demo
npm run lint
npm run typecheck
npm run build
\`\`\`

Dashboard preview interactions:
1. Advertiser > Create demo draft > Submit draft.
2. Admin > Advance next campaign review. If a creative is pending, request changes rather than approve.
3. Admin > Toggle scr-2 maintenance/online.
4. Driver > See scr-2 status and new notice, mark it read.
5. Admin > Reset demo data restores original fixtures.

These are **foundation previews**; the screenshot-accurate module pages, real creation wizards, payment forms, admin reviews, telemetry and mobile QA arrive in their later roadmap stages.

## Production upgrade
Replace demo repository functions with authenticated HTTPS API clients, move ownership and transition validation server-side within transactional DB operations, enforce unique allocation/exclusion constraints, derive payment status from the gateway, and derive driver payouts from verified delivery logs.
