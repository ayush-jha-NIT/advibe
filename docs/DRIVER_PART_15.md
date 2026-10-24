# AdVibe Part 15 — Driver Dashboard, Vehicle & Screens, Assigned Ads & Daily Schedule

Part 15 replaces the Driver Portal's original placeholder dashboard and three operational paths. It remains a **browser-only frontend demonstration**: no real GPS, ad delivery logs, screen hardware control, driver employment/payroll or money is involved.

## Routes

- /driver: mobile-first dashboard with confirmed booked campaigns, sample screen counts, demo pending settlements, driver-owned notifications, today's schedule and links to Onboarding/Verification.
- /driver/vehicle: masked seeded vehicle registration, existing seeded approval state, linked screens, area metadata, sample device statuses, read-only confirmed booking drill-down.
- /driver/assigned-ads: date picker in Asia/Kolkata time, previous/next day controls, seven-day selection, filtering by assigned screen, locality or creative, and day-level screen/area counts. Requested time windows display only if a campaign actually recorded them.
- /driver/campaigns: searchable campaign cards, status filters, confirmed booking counts, linked creative and screen placement details.

All views reuse the shared fictional Part 3 database and adapt between phone and desktop. Existing driver onboarding and advertiser flows are unchanged.

## Strict assignment semantics

- A Driver assigned ad requires a confirmed booking, a non-cancelled/non-rejected eligible campaign status, a matching ID in the campaign's actual screenIds array, and a screen owned by the signed-in fictional driver through an owned vehicle.
- Advertiser targeting/plannedScreenIds and unconfirmed/reserved/cancelled bookings DO NOT create driver assignments.
- The daily schedule requires the selected date to overlap both the booking and campaign dates, and also respects recorded weekday selection when provided. Only Live and Scheduled campaigns appear in the day schedule. Paused campaigns are excluded, even when the underlying demo booking remains confirmed.
- Times, where present, are stored user preferences, never verified actual playback. The seeded Festival Week campaign has no hourly playback metadata; no timings are fabricated.
- Screen "online" status, locations and impressions are sample database properties, not hardware pings or GPS. A scheduled assignment may exist even when a sample screen's status is offline. Never imply that means media played successfully.

## Identity & permissions

- Uses the preset Driver demo identity (drv-1) and owner-filtered selectors. An unprovisioned signup cannot browse seeded driver vehicles/assignments; a message guides them to the preset demo identity.
- This is **client-side UX scoping, not production access control**. A real API must enforce driver identity and ownership over vehicles, screen assignments, campaign creative delivery, and all settlement data.
- Vehicle details and screen status are deliberately read-only. Maintenance reporting, telemetry, installs and power toggles require later modules and verified infrastructure.
- The driver can see only booking-linked creative metadata, not arbitrary unassigned advertiser campaigns.

## QA

tests/driver-operations.test.mjs covers cross-driver isolation, falsified driverId/vehicleId mismatch, confirmed booking vs planned/reserved/cancelled distinction, India-local dates and invalid date handling, weekday rules, paused schedules, campaign search/status filters and owner-specific dashboard KPIs. GitHub Actions runs ESLint, TypeScript, tests and Next.js production build.

## Upcoming stages

Part 16: driver earnings and settlement views. Part 17: maintenance, support and notifications. Parts 18–21: Admin modules. Parts 22–23: responsive/accessibility checks, end-to-end review, production boundary and deployment documentation.
