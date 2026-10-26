# B20: helpdesk, screen maintenance, in-app notifications and leased jobs

## Implemented

B20 is an Express/Prisma backend implementation; B22 will replace demo-mode frontend services. Support routes are authenticated by existing B3/B4 cookie, verified account role, CSRF and the same MFA enforcement required for Admin. Requests with body mutations reject cross-site origins and invalid JSON.

### Support API

- `POST /api/v1/support/tickets` uses a valid `Idempotency-Key` and accepts category (`GENERAL`, `BILLING`, `DEVICE`), short subject, description, and role-bound scope. DRIVER device cases require their own paired screen; ADVERTISER tickets require a business where their membership remains active (OWNER/MANAGER). Foreign business IDs and driver screens are rejected. Tickets never become public.
- `GET /api/v1/support/tickets`, `GET /api/v1/support/tickets/{ticketId}` show at most 50 ticket records per page; Admin sees all tickets, drivers their own, advertisers their own or those of active membership businesses. Body and messages are access-scoped. Internal Admin notes are not shown to drivers or advertisers.
- `POST /api/v1/support/tickets/{ticketId}/messages` is idempotent, append-only and only accepts a participant or Admin. Admin-only `INTERNAL` notes do not notify or appear to ordinary users.
- `PATCH /api/v1/admin/support/tickets/{ticketId}` enforces documented state transitions `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` with an expected integer version, Admin audit trail and queued notification. Closed tickets are never silently reopened. A ticket needing further service requires a new ticket.
- `POST /api/v1/admin/support/tickets/{ticketId}/maintenance` opens one active maintenance case for a driver-owned DEVICE ticket's screen and is idempotent. `PATCH /api/v1/admin/maintenance/{caseId}` advances `OPEN` → `IN_PROGRESS` → `RESOLVED` with a required resolution note, optimistic expected state and Admin audit. `GET /api/v1/maintenance` scopes records by owner or Admin. PostgreSQL unique partial index prevents simultaneous active maintenance on the same screen.

### Notification API and jobs

- `GET /api/v1/notifications` returns only the authenticated user's in-app notifications, paginated and with unread count. `POST /api/v1/notifications/{notificationId}/read` is own-notification-only, CSRF-protected, repeat-safe. No API exposes arbitrary users' notifications.
- Ticket opening, public messages, state transitions and maintenance updates enqueue small notices atomically with the audited DB change. Only generic status text is enqueued; ticket descriptions, internal notes, bank data and private KYC are not copied into notices.
- `DurableJob` has unique event/recipient keys, states `PENDING`, `LEASED`, `COMPLETED`, `DEAD`, bounded attempts, a lease UUID, an expiry and retry schedule. Workers use PostgreSQL `FOR UPDATE SKIP LOCKED`. A crashed lease can be reclaimed; the stale token cannot issue a notification. A unique notification delivery key and transactional completion make retries duplicate-safe. Five unsuccessful attempts go to the dead-letter state.
- `GET /api/v1/admin/jobs` shows bounded queue health to MFA Admin. `POST /api/v1/admin/jobs/{jobId}/retry` is an explicit, audited Admin-only replay of a dead letter (not of in-flight work).

Run the worker through a separate trusted scheduler:

```sh
B20_JOBS_ENABLED=true npm --prefix backend run support:dispatch
```

Run cadence and deployment must be configured separately; the server does not spawn a background process. Worker failures return nonzero exit code. Dispatch currently writes durable *in-app* notifications only. Email, Web Push, SMS providers and recipient preference/consent handling are outside B20.

### Operational limits and security

No automatic device disabling, playlist modification, inventory release, or pausing customer campaigns is triggered by a maintenance ticket. An authorized operator must use B15 delivery controls and account for campaign service. The support API is not a remote screen control plane. Tickets and messages have bounded lengths; documents, KYC, passwords and payment credentials should not be pasted into ticket descriptions. Data retention, notification retention, SLA/escalation policies, real support staffing, and incident reporting need operational signoff.

## CI evidence

The PostgreSQL integration suite validates tenant isolation, DRIVER screen ownership, unauthenticated/CSRF/role denial, internal-note hiding, message idempotency, unique maintenance, ordered state transitions, optimistic versions, leases across competing workers, crash recovery, duplicate notification prevention, bounded retry/dead letter and Admin manual requeue. CI also re-runs all previous backend B0–B19 suites, frontend contract/lint/types/build and Chromium browser checks.

**Production status:** code and CI only, pending B22 frontend migration and B23 staging/pilot procedures.
