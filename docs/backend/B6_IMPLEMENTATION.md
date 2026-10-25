# AdVibe backend B6: driver onboarding and private vehicles

B6 is implemented against isolated PostgreSQL in CI. B3–B5 sessions, CSRF, roles and audit infrastructure are reused. The Vercel frontend remains a browser demo; production Neon is not provisioned.

## Driver-facing endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | /api/v1/drivers/me | Own driver profile, no bank or KYC data |
| POST | /api/v1/drivers/applications | Create private DRAFT; CSRF + Idempotency-Key |
| GET | /api/v1/drivers/applications | Cursor-paginated own applications |
| GET | /api/v1/drivers/applications/{applicationId} | Resume own saved draft |
| PATCH | /api/v1/drivers/applications/{applicationId} | Save exactly one validated step and expectedVersion |
| POST | /api/v1/drivers/applications/{applicationId}/submit | Submit complete draft, idempotently; CSRF required |
| GET | /api/v1/drivers/me/vehicles | Cursor-paginated own vehicles |
| POST | /api/v1/drivers/me/vehicles | Register pending vehicle; CSRF + Idempotency-Key |

## Five-step onboarding

1. Driver's operating city and experience.
2. Vehicle ID and category, cross-checked against an actually owned vehicle.
3. Proposed screen placement choice. Not hardware approval.
4. Agreement template version. This is only a draft reference, NOT legal acceptance.
5. confirmedReadiness=true, a self-attestation, NOT KYC/device verification.

Every save enforces sequential steps, a current expectedVersion, atomic PostgreSQL version increment and SERIALIZABLE transaction. A stale edit returns 409 rather than silently overwriting another browser tab. A submitted application is locked against B6 edits. The submit route rechecks the saved fields and vehicle ownership, atomically writes SUBMITTED/submittedAt and emits an append-only audit plus durable outbox event. There is no self-approval.

## Authoritative relational guarantees

Migration 20261026020000_b6_driver_onboarding introduces Vehicle, DriverApplication, their enums, owner indexes, and compound FK (vehicleId,driverUserId). The FK rejects cross-driver vehicle associations even through direct SQL; a partial unique index allows **one active draft per driver** at a time. CHECK constraints keep completedStep 0–5, version nonnegative and submittedAt consistent with state.

Vehicles are pending verification by default. Optional provider-issued opaque registration tokens beginning veh_tok_ are HMAC-hashed before being stored; raw registration plates, RC scans, Aadhaar, driving licenses and bank information are never collected by B6. Vehicle registration and application create/submit use scoped transactional idempotency records. Same key and different input returns 409. Same key and same input returns the original resource, not duplicate writes.

B7 will implement private KYC documents, reviewed driver agreements, identity evidence and independent Admin review; no approved vehicle, signed contract, guaranteed earnings, device provisioning or tracking is claimed by B6.

## CI and deployment boundary

GitHub Actions provisions fresh disposable PostgreSQL 16, applies B2–B6 migrations, and tests draft/resume/step sequence, optimistic concurrency, ownership, version conflicts, idempotent retries, foreign vehicle and cross-account denial, incomplete submit, after-submit locking, role/CSRF guards, list pagination, audit/outbox and direct SQL FK constraints. Existing frontend lint/typecheck/build and Chromium smoke are still required.

Production requires dedicated Neon staging and production infrastructure, approved verified mail + CAPTCHA, same-site cookie domain and legal/privacy review. Do not enable live driver onboarding or collect private government documents until B7 storage/consent/review is complete.
