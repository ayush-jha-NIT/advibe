# AdVibe B17: consent-led GPS, trip evidence and qualified playback aggregation

**Scope:** B17 implements protected driver GPS consent, finite trip sessions, signed GPS and playback batches, server corroboration and tenant-scoped daily-zone aggregation. No actual audience measurement, proof of physical display or automated earnings. No live fleet deployment or legal approval is asserted. The frontend is still a demo.

## Explicit consent and privacy

Only an authenticated DRIVER may POST `/api/v1/drivers/vehicles/{vehicleId}/gps-consent` with `{"acknowledged":true,"purposeVersion":"..."}` (CSRF required). Current policy must exactly equal `GPS_CONSENT_POLICY_VERSION`; invalid/missing policy disables collection. A consent lasts no longer than 24 hours and applies only to the driver-owned vehicle. An existing grant is revoked and any active trip stopped on new consent. GET reads only the driver's own consent. POST `.../gps-consent/revoke` immediately ends active trips and **erases raw GPS for that grant**; persisted daily aggregate counts contain no individual coordinates.

`POST /api/v1/drivers/screens/{screenId}/trips/start` requires current explicit consent, paired active screen, approved driver vehicle and CSRF. At most one open trip per vehicle, enforced by a PostgreSQL partial unique index. POST `/api/v1/drivers/trips/{tripId}/stop` terminates the driver's own trip. Consent revocation and expiry invalidate ingestion independently of client-side assertions. GPS capture is never started silently by B8 pairing or B16 heartbeats.

Production capture requires **all**: `GPS_CONSENT_POLICY_VERSION`, `GPS_COLLECTION_ENABLED=true`, `GPS_PRIVACY_APPROVED=true`, and an explicit `GPS_RETENTION_REVIEWED_AT` configured after documented legal/operational signoff on D09. Test mode uses a synthetic process-local purpose policy, with an isolated local PostgreSQL database. No consent is presumed from acceptance of the driver onboarding contract.

## Signed telemetry and evidence qualifier

POST `/api/v1/devices/trip-events` retains B8 Ed25519 timestamp/nonce authentication and row-level screen locks with serializable transactions. Each batch has at most 50 canonical unique point IDs, consentGrantId and screenId. The server validates correct paired credential and active consented trip, timestamps within 120 seconds of receipt, monotonic recorded time, GPS accuracy at most 50 meters, plausible adjacent GPS speed at most 45 meters per second, and no duplicate persisted device event ID. Raw precise coordinates are accessible only to private backend operations, never advertiser reports.

POST `/api/v1/devices/playback-events` requires screenId, manifestVersion and at most 25 event records. Every accepted claimed playback requires a signed, non-expired B16 screen-specific manifest with matching approved creative/window and authorized paid B15 ACTIVE campaign, live unrevoked consented trip, a B16 PLAYING heartbeat matching the manifest within 30 seconds, and an accurate GPS point within 15 seconds inside the published location zone (accuracy buffer included). Event time and duration must lie wholly inside manifest and window bounds. PostgreSQL uniqueness on event IDs and 30-second screen buckets rejects replay, duplication or inflated claims. Only validated accepted claims increment the daily campaign/zone aggregate, **in the same transaction**.

The metric is named `qualifiedPlaybackCount`, classified `qualified_device_report_only`, method `b17-v1`. **verifiedHumanImpressions stays 0**: authenticated device claims plus GPS do not independently prove human viewership, full playback or visibility. Driver earnings and advertiser invoicing must not depend on this number without independent measurement and policy approval.

`GET /api/v1/campaigns/{campaignId}/exposures` is restricted to active advertiser business members or MFA Admin; it returns coarse zone/date/count rows only, no GPS points, trip IDs or driver identities. No zone-level report is public.

## Retention worker

A controlled separate job runs `GPS_RETENTION_SWEEPER_ENABLED=true npm run gps:purge` under backend with database credentials. It ends expired/abandoned trips and deletes GPS points older than 24 hours or tied to revoked consent, without deleting immutable playback evidence and aggregate rows. Configure an hourly scheduler and verify retention/erasure policy before production. Operators must still implement lawful data subject workflows and reviewed retention for derivative records.

## CI and safety boundaries

Fresh PostgreSQL 16 migrations and CI exercise driver authorization, consent version and CSRF, single-active-trip constraints, Ed25519 signature/nonce authentication, GPS replay and accuracy, manifest/window/heartbeat corroboration, tenant reporting, immediate raw-coordinate erasure and prior B0–B16 regressions. No actual GPS hardware, cellular network, independently auditable viewer verification, fraud detection vendor or production consent legal documents were provisioned. B18 settlement is separate.

