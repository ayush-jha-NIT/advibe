# Part 7 — Advertiser Dashboard and Campaign Directory

## Implemented paths

- \`/advertiser\`: overview with total, live, sample-impression and demo-payment KPIs; bar chart of stored campaign impressions (NOT a fabricated daily trend), status donut, recent campaign links, in-review/draft counts, recent notifications, quick actions.
- \`/advertiser/campaigns\`: search by title/ID/objective/status, bucket/status tabs, creation-date range, sortable columns via explicit sort select, paginated responsive cards on phones and horizontally scrollable table on desktop, detail dialog, export of filtered records to a UTF-8 CSV, and demo draft submission with existing store restrictions.

## Architecture

- \`src/features/advertiser/analytics.ts\`: pure selectors and CSV helper. Never mutates the source array, clamps pagination, and neutralizes spreadsheet formulas when exporting.
- \`src/features/advertiser/shared.tsx\`: shared banners, status badges, hydrated data hook and empty states.
- \`src/features/advertiser/dashboard.tsx\`: Recharts visualization of the **real stored demo rows**. Impressions are displayed by campaign rather than inventing a day-by-day series.
- \`src/features/advertiser/campaign-list.tsx\`: responsive directory and interactions.
- \`tests/advertiser-analytics.test.mjs\`: ownership, totals, search, status grouping, date filters, sorting, pagination, chart inputs and CSV injection testing.

## Security and limits

The preset advertiser demo identity maps to the fictional record owner \`adv-1\`. Newly signed-up frontend-only demo identities have **no seed records**; this avoids exposing preset campaign content through their ordinary UI. The browser has no trusted identity and all data remain local. It is NOT a production security boundary. Do not use screenshots as evidence of real-world delivery, views, payments or impressions.

The **Create Campaign** CTA currently leads to the Part 8 wizard placeholder. Part 10 will implement full campaign details and controls. CSV export is locally generated only. Draft submission updates the Part 3 browser dataset and shows an Admin review notification; no real campaign is booked. The preset account has one existing draft to test.

Payments and analytics remain illustrative data. Real payment verification must occur on the backend through Cashfree. Comprehensive device/mobile browser testing is scheduled for the QA phases.

## QA

Run \`npm run lint\`, \`npm run typecheck\`, \`npm run test:demo\`, and \`npm run build\`. The source uses responsive Tailwind layouts, native controls, an accessible dialog, and horizontal table scrolling.
