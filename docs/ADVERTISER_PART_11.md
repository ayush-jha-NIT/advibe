# Part 11 — Advertiser Creatives, Ad Formats & Locations

## Completed routes

- \`/advertiser/creatives\`: advertiser-owned creative metadata library
- \`/advertiser/ad-formats\`: six-format interactive comparison, example city-specific rates and sample compatible screen counts
- \`/advertiser/locations\`: fictional inventory explorer with format/date/city/zone search, map/list views, status/eligibility and provisional selection

These replace the corresponding original Part 2 advertiser placeholders without changing public routes or the official AdVibe logo.

## Creative Library

- Search title, ID, placement, media type and review status. Owner-only data filtering.
- Persist pending **metadata** only: title, format and placement. Entries are stored in the shared fictional browser database, with audit events.
- Edit/delete available ONLY for pending creative records that are not referenced by a campaign, with checked ownership and a confirmation dialog for deletion.
- Select PNG/JPEG/GIF/MP4 file locally. The existing Part 9 guards validate file size, extension, MIME, magic bytes and dimensions; video duration is checked.
- Show ephemeral local media preview using an object URL, revoked after removal or unmount. No media bytes, file names or real documents are uploaded or persisted.
- Creative approval status is a stored fictional state, not an externally verified approval. A new metadata entry remains pending; advertiser cannot approve their own creative.
- A new frontend-only signup identity is not a provisioned advertiser, so cannot mutate seeded creative records.
- A compatible saved creative can be chosen in step 3 of the existing six-step campaign wizard. No new backend upload claim is made.

## Ad Format Catalogue

- Bike rear, Auto rear, Auto side, Car rear, Car interior and Helmet examples, with decorative illustrated mockups, category filters, search and expandable comparison table.
- Rate cards are read from the existing Part 3 fictional pricing rules. No rate is fabricated for a city without an active matching record.
- Counts show qualified demo screens for the current day only, not real availability.
- "Use this format" updates only the browser's draft planning state after confirmation when an unsaved draft already contains content, resets incompatible creative/screens and detaches a previously saved campaign record.

## Locations / Screen Planning

- Filters: placement, city, zone, locality/device ID search, start/end date and eligible-only toggle. Results are derived from linked demo locations/screens, approval status and overlapping fictional bookings.
- Distinguishes Offline, Unverified, Booked in demo, and Eligible sample screens.
- Schematic map pins are presented as an illustration, with an accessible list of screen cards and selection buttons.
- Multi-select eligible screens, bulk select eligible visible screens, remove an item, clear all and review illustrative daily base rates.
- Explicit "Use selection in wizard" transfers only eligible screen IDs, placement and dates into a local wizard draft. Existing unsaved wizard work receives a confirmation prompt before replacement. No inventory reservation, quote finalization, payment or campaign submission is performed.

## Important technical and security boundaries

Data is browser-local and entirely fictional; client role checks are not production security boundaries. Backend requirements remain:
- secure file upload storage, content moderation and format/virus scanning
- actual screen/device catalogue, coordinates, telemetry and service areas
- trusted rate-card retrieval, date-range inventory holds and atomic reservations
- server-enforced account ownership, real campaign approval and Cashfree payment verification

## QA

New tests in \`tests/advertiser-library.test.mjs\` cover owner-only filtering, metadata validation, forbidden cross-owner edits, linked-record protection, sample pricing and eligibility classification. The existing suite, ESLint, TypeScript and Next.js build run in GitHub Actions. Mobile layouts are responsive by design; real device/browser visual testing remains for Parts 22–23.
