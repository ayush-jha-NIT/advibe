# AdVibe Backend B15: Delivery scheduling, activation and pause/resume

B15 implements backend-only delivery planning. Next.js remains in demo mode. No screen receives playable ad media in B15; signed device playlists and heartbeat-based playback acknowledgements belong to B16.

A B14 PAID, confirmed reservation is necessary but does not automatically activate advertising. An MFA-verified Admin activates an individual hold. Within a SERIALIZABLE transaction, screen locks protect retained screen-day inventory. The backend checks current confirmed hold, successful provider-verified payment attempt and exact INR quote, no payment resolution flags, approved reviewed campaign, approved processed creative, matched quote dates/screens, approved driver and vehicle, paired unrevoked device, and published location. PostgreSQL independently rejects delivery plan insertion without paid booking evidence, and enforces a single immutable window per hold/screen/day.

Each DeliveryWindow freezes a local time interval resolved against that screen city's IANA time zone, rejecting ambiguous/skipped daylight-savings times. Plans move between SCHEDULED, ACTIVE, PAUSED and COMPLETED. Pause/resume are CSRF-protected, Idempotency-Key protected, authorization-scoped and optimistic revision-checked. Pause never releases paid capacity or issues a refund. Resuming rechecks eligibility and the immutable schedule.

**API paths** under /api/v1:
- POST /admin/reservations/holds/{holdId}/delivery/activate, body {}
- GET /reservations/holds/{holdId}/delivery
- POST /reservations/holds/{holdId}/delivery/pause, {expectedRevision,reason}
- POST /reservations/holds/{holdId}/delivery/resume, {expectedRevision}
- GET /admin/screens/{screenId}/delivery (operator inspection, not a player endpoint)

Run `DELIVERY_TICK_ENABLED=true npm run delivery:tick` in the backend from an external authenticated controlled scheduler at least once per minute. The bounded reconciliation worker advances windows and pauses plans when eligibility is revoked. State transitions write audit and outbox records transactionally. B16 must not use admin schedule responses as device manifests; signatures, device authentication and manifest expiry are still pending.

PostgreSQL CI coverage includes paid activation, exact tenant isolation, admin MFA through middleware, CSRF, duplicate Idempotency-Key, revision conflicts, pause/resume, revoked device fail-closed, append-only windows, date conversions and all B14 regressions. Cashfree sandbox and production live payments were not executed.
