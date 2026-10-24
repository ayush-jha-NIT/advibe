# AdVibe Part 9 — Campaign Wizard Refinements

Builds on Part 8 (6-step advertiser campaign creation). This is a **frontend demonstration**, not a backend implementation or an inventory/booking/payment service.

## 1. Creative file inspection and accessibility

- Restrict preview to PNG, JPG/JPEG, GIF and MP4 only, matching MIME and extension.
- Reject empty media, files larger than 10 MiB, renamed files with incompatible magic signatures, images/videos smaller than 320 × 320 or larger than 4096 px, and videos outside 1–60 seconds.
- Read image dimensions / MP4 metadata in-browser using a temporary Blob URL, revoke it after checking. A separate ephemeral URL handles the visual preview.
- Show validation, file size, pixel size and video duration feedback; disable changing detected format while a file is selected; support removing a selection.
- Never persist media bytes or real filenames. After refreshing, only title/type metadata remains; the wizard clearly distinguishes this from a production upload. Media may be submitted as pending metadata without an uploaded file, exactly as in Part 8, but actual delivery requires a verified upload.

**These are browser UX checks only.** A real upload service must independently validate signatures, decode files, scan media, enforce supported creative specs and handle moderation.

## 2. Location targeting

- City + zone + locality / screen ID search filter.
- Select all filtered eligible screens, clear selections, preserve existing selections across filter changes.
- Warn about previously selected screens that have become offline, booked, unverified or incompatible, with an explicit button to remove them.
- Step 4 rechecks eligibility for the chosen placement and dates, not only ID / placement membership.
- Map-layout pins are arranged inside the schematic panel instead of flowing beyond the viewport.
- A selection never reserves inventory, changes confirmed assignments or creates a booking.

## 3. Schedule and price validation

- On the device, show local current date as the minimum start date and prevent past-date submissions on navigation and in the shared store's final submission validation.
- Offer Every day / Weekdays / Weekends presets and count actual included delivery dates (not just calendar days).
- Explain zero matching weekdays, invalid date range and overnight / reversed times before submission.
- Existing integer-paise screen-day quote + illustrative 18% GST remains unchanged. Requested play count is not multiplied into the quote.
- Screen/device availability and full-date rate validity are rechecked at the existing steps and final submission.

## 4. Phone-first wizard experience

- Compact six-step select / progress indicator on small screens; full stepper preserved on tablet and desktop.
- Sticky action area near the bottom of small phone viewports.
- Errors receive focus for keyboard / assistive-technology users.
- Respect reduced-motion preferences when scrolling between steps.
- Confirm before clearing unsaved form fields.

## 5. Tests and production handoff

Pure helpers have regression tests under tests/creative-guards.test.mjs and tests/wizard-targeting.test.mjs; existing schedule tests remain. GitHub Actions verifies ESLint, TypeScript, automated tests and Next.js production build.

**Still pending:** Real credential-backed advertiser accounts, upload storage / CDN, media moderation, confirmed pricing, concurrent inventory reservations, Cashfree backend order and webhook verification, vehicle telemetry, all-device visual QA and production security review.
