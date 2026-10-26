# AdVibe B12: campaign drafts and approval workflows

Status: code and isolated PostgreSQL integration tests, **NOT deployed as live booking or payment workflows**. The public Vercel frontend continues to use browser-local demo data. B13–B23 payment, booking, screen capacity and actual ad playback are still pending.

## PostgreSQL changes

Migration `20261026080000_b12_campaign_workflow` creates Campaign, CampaignSubmission and CampaignReview. Campaign links to Business and Creative via a **composite foreign key** (creativeId, ownerBusinessId), preventing direct database writes from attaching another business's creative. The campaign row records status, optimistic revision, submissionNumber, selected weekdays and a local-day time window in integer minutes. Date/weekday/time input is strictly validated.

CampaignSubmission records contain a frozen JSON snapshot of the campaign, creative ID, source and processed SHA-256 checksums, processed object version, selected dates, weekdays, time window and **NOT_BOOKED** status. CampaignReview binds the Admin's decision, reason, submission number and SHA-256 of that immutable snapshot. Both immutable evidence tables are protected by PostgreSQL **append-only** triggers; the event log records corresponding append-only AuditEvent and outbox publications in the same serializable transaction.

## Advertiser workflow

- `POST /api/v1/campaigns`: create draft for an owned/managed, active advertiser business and a Creative from that same business; requires Idempotency-Key, current business membership, session CSRF and trusted Origin. Draft may reference a creative awaiting B10 moderation, but cannot submit until approved.
- `PATCH /api/v1/campaigns/:campaignId`: requires expectedRevision, current OWNER/MANAGER membership and status DRAFT or CHANGES_REQUESTED. Only those states can be edited. Each change increments revision, with stale edits rejected as 409.
- `POST /api/v1/campaigns/:campaignId/submit`: requires Idempotency-Key and an empty JSON object body. Atomically verifies membership, validates future start dates (0–180 days), 1–60 calendar-day schedule, and an **APPROVED creative with READY, scanned/transcoded media evidence**. Only then creates an immutable submission snapshot and status SUBMITTED. Submitted campaigns cannot be edited.
- `GET /api/v1/campaigns`, `GET /api/v1/campaigns/:campaignId`, `GET /api/v1/campaigns/:campaignId/submissions`: admin or currently authorized business member, never cross-tenant data. Listing supports optional status, businessId, cursor and bounded limit. No raw KYC/private storage keys are returned.

## Admin moderation

- `POST /api/v1/admin/campaigns/:campaignId/decision`: active session with Admin MFA, CSRF, Idempotency-Key and expectedRevision. An Admin may approve, reject or request changes on the currently SUBMITTED campaign; decisions commit once per submission and are captured as immutable reviews with an audit/outbox event. Approval rechecks B10 creative and verified processed media.
- `GET /api/v1/admin/campaigns/:campaignId/reviews`: Admin-only immutable review history.
- CHANGES_REQUESTED can return to SUBMITTED **only after a new revision has been edited**. Every resubmission creates its own append-only evidence row. APPROVED and REJECTED are terminal B12 decisions; previously reviewed creative, submission evidence and reasons cannot be overwritten.
- B12 does not claim that Admin review is physical installation verification, available screen capacity, quote acceptance, tax compliance or approved playback. Even an APPROVED campaign remains **NOT_BOOKED**, paymentStatus=unpaid. Existing B11 quote campaignId is a provisional UUID with no booking relationship; B13 implements actual holds/constraints. The B12 user-visible state subset is DRAFT, SUBMITTED, CHANGES_REQUESTED, APPROVED, REJECTED, while later deployment/scheduling states belong to B13–B19.

## Acceptance and operational constraints

CI provisions fresh PostgreSQL 16, migrates forward, then runs authorization tests covering cross-business creative FK, missing approval, session/CSRF/MFA denial, idempotency conflicts, draft optimistic revisions, submitted immutability, request-changes/resubmit/approve flow, duplicate Admin decision rejection, signed evidence hashing, append-only review/submission triggers and regression suites B0–B11. Frontend tests, Next.js production build and Chromium release smoke remain mandatory.

Production activation still needs configured database, approved business policies, actual private creative storage/ClamAV/FFmpeg worker, moderation process, production domains and legal/compliance sign-off. Campaign approval never automatically sells or schedules an advertisement.
