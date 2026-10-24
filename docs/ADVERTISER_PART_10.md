# Part 10 — Advertiser Campaign Details & Management

## Routes & navigation

- /advertiser/campaigns/[id] shows details for campaigns owned by the current seeded demo advertiser account; unknown or other-advertiser IDs show a generic unavailable state.
- The campaign directory and dashboard link directly to each detail page. The existing six-step wizard remains the editing path for Draft and Changes Requested campaigns.

## Details

- Overview: objective, business, industry, creation date, scheduled dates, weekday selection, requested plays per day, quote metadata and fictional impression count.
- Creative: owner-matched creative record, type/placement/review status. No actual image or video is stored in the demo database, so no fictitious media playback is shown.
- Locations & Screens: merged provisional/assigned screen IDs, demo location and device status, and active demo booking reference where present. No live GPS or map tracking is implied.
- Review History: recorded campaign audit events sorted newest first. Seeded campaigns without history display a **current-state snapshot with no invented transitions**.
- Billing: actual stored fictional payment entries and optional wizard quote estimate, without generating invoices or claiming any charge, reversal or refund.

## State management and lifecycle

The shared Zustand demo store now exposes \`manageCampaign(actor,id,action)\` for pause/resume/cancel:
- Pause is allowed only for Live campaigns, and changes the local status only.
- Resume is allowed for Paused campaigns only when paid demo flag, selected screens and confirmed demo bookings agree.
- Advertiser cancellation is permitted only for Draft, Submitted, Changes Requested, Approved, Scheduled or Paused (not Live, Completed or Rejected), consistent with the existing transition graph.
- Cancellation cancels demo bookings belonging to that campaign, writes an audit event and creates status notices for the advertiser and affected demo drivers.
- All actions check ownership and the current state; the user confirms through a modal before mutation.
- A paid status stays paid on cancellation, because **Cashfree refunds have not been implemented**.
- No physical playback, screen devices, provider sessions, booking engines or external user accounts are modified.

The existing admin approval flow stays separate. Browser-local role checks are **not production authorization**; a real backend must revalidate identity, ownership, allowed lifecycle transitions, payment status and allocations atomically.

## QA

Tests cover role scoping, record relationships, audit fallback, allowed state actions, pause/resume preconditions and warning wording. CI runs ESLint, TypeScript, demo tests and Next.js production build. Physical-phone testing remains scheduled for Parts 22–23.
