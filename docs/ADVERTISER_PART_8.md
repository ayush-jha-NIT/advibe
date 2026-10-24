# Part 8 — Advertiser Campaign Creation

**Demo frontend only.** The six-step campaign wizard is implemented at /advertiser/create-campaign?step=1 through ?step=6:

1. Campaign/business details and objective
2. Vehicle placement (bike, auto, car, helmet)
3. Saved creative selection or local image/video preview with metadata
4. Provisional screen/zone selection with a schematic map/list switch
5. Start/end dates, weekdays, delivery hours and requested plays/day
6. Line-by-line screen-day pricing estimate, illustrative 18% GST, optional budget cap and explicit consent

## Data integrity

- The form saves non-sensitive fields in a per-demo-account browser-local Zustand store; a draft campaign record is saved to the shared Part 3 dataset with plannedScreenIds, separate from screenIds, which are only confirmed actual assignments. Nothing reserves inventory.
- Save Draft creates or updates an advertiser-owned draft. Browser refresh retains its fields. The ?campaign=ID query resumes an editable saved campaign. Drafts can also be resumed from My Campaigns.
- Submit for Review revalidates every step and availability, creates or updates one shared demo campaign record with status=submitted, paymentStatus=unpaid, screenIds=[], a pricing estimate, and an Admin notification. It is not a payment or booking request.
- Placement must match any selected screen and selected existing creative. New creative metadata is saved as pending, while file bytes are never uploaded or persisted.
- Eligible device checks consider verified driver/vehicle, online screen, date conflicts, active placement and city rate cards. Invalid plans and duplicate screen selection cannot submit.
- Quote uses integer paise; daily rate is per screen times only selected weekdays within the campaign date range, 18% illustrative GST. Requested plays/day are a display target, not a guaranteed cadence nor a rate multiplier.
- Approved creative/inventory and authoritative Cashfree payment are required downstream before real scheduling or launch.

## Limitations and later phases

- This frontend does not process real customer contact, card payments, secure uploads, audience targeting, live GPS, creative approval or inventory reservation.
- The seeded demo account (advertiser@demo.advibe.test) can save/submit. New frontend-only signup identities are not provisioned in the shared data store, so editing is disabled until production provisioning exists.
- Local file preview disappears on reload: only non-sensitive creative metadata stays in browser storage.
- Production will require server-issued quotes, transactional booking inventory, backend Cashfree create-order and verification, authenticated storage/media validation, account ownership enforcement, and scheduling audit trails.
- Full campaign details/creative library are in later modules; mobile-device visual QA remains in Part 22/23.
