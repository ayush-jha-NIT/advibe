# AdVibe Backend B16: signed player playlists and device heartbeat gateway

B16 is source code and PostgreSQL CI functionality, not production hardware deployment or verified ad exposure. B16 builds on B8's Ed25519-paired device credential and B14/B15's paid, immutable confirmed screen-day deliveries.

## Player authorization

`GET /api/v1/devices/manifest` requires X-Device-ID (credential UUID), X-Device-Timestamp (Unix milliseconds within 120 seconds), X-Device-Nonce, and a valid Ed25519 X-Device-Signature over the B8 canonical method/path/body envelope. Cookies and human bearer tokens are rejected. A PostgreSQL unique credential/nonce record and screen row lock serialize issuance with pause and revocation; credentials and screen state are re-verified inside a SERIALIZABLE transaction. Replay returns 409. Old rotated/revoked device keys cannot fetch fresh playlists.

A fresh manifest is signed with DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64 (independent of device pairing). Signature is base64url Ed25519 over the JSON serialization of exactly `{screenId,version,expiresAt,entries}`. Version increases monotonically per screen. Expiry is at most 45 seconds, further bounded by the earliest active playback window. Firmware must pin the server's public manifest key, verify signature, reject lower versions, enforce UTC window bounds and expiry using a trusted clock, drop expired files and re-poll. A manifest has no verified impression status. Time-limited object access is not DRM.

Entries are generated ONLY from matching B15 ACTIVE screen windows, independently validated again against the confirmed B14 booking, SUCCESS payment attempt, immutable quote, approved campaign and processed creative, published location, approved vehicle/driver and unrevoked screen. The processed asset is accessed through a 60-second private S3 version-specific presigned HTTPS URL, never public buckets or upload/source keys. Each entry carries campaignId, creativeId, SHA-256, MIME type, mediaUrl, startAt and endAt. Unexpected signing/media/entitlement errors produce a fresh signed empty manifest, never a partially authorized playlist. Entries are capped at 25. PostgreSQL stores immutable signed manifest versions.

**Important:** previously cached manifests cannot be cryptographically revoked while a device is offline. B16 bounds the window to at most 45 seconds and requires the player to discard ads when disconnected, expired or outside the signed UTC window. Immediate stop requires connectivity and a newly fetched empty manifest, plus separate physical firmware certification and hardware operational safeguards. Devices do not receive or use the operator's private signing key.

Production positive playlists additionally require `DEVICE_PLAYBACK_ENABLED=true` and `DEVICE_FLEET_APPROVED=true`. Absent these gates the backend returns signed empty manifests. Private S3 bucket/versioning and operational signing-key provisioning must be completed before any physical device can be enabled.

## Heartbeats and diagnostics

`POST /api/v1/devices/heartbeat` retains B8 anti-replay signatures, device event uniqueness and 120-second observedAt skew. Optional `manifestVersion` and `playbackState` (`IDLE`, `PLAYING`, `ERROR`) are appended to immutable DeviceHeartbeat rows. Reports referencing a manifest must match the screen and observedAt expiry; `PLAYING` further requires a nonempty unexpired signed-manifest record and an active scheduled delivery. A device claim is not verified proof of display, ad viewability, GPS route, trip, impression, finance accrual, or driver earning. B17 validates exposures independently.

`GET /api/v1/admin/devices/{screenId}/player-status` requires a fresh MFA-authenticated Admin session and exposes the most recent authenticated heartbeat, firmware, reported playback state and manifest version, with `verifiedImpressions: 0`. It never exposes the paired key, private media credentials, or an advertiser's data.

## Verification and operational boundary

B16 integrates real PostgreSQL 16 migrations and a deterministic Ed25519 device simulator with a private-media signing adapter. CI checks valid/invalid signatures, replay, screen isolation, paid activation, playlist SHA-256/signature, pause/resume, revocation, append-only heartbeat and data diagnostics, plus all B0–B15 regression suites, frontend build and Chromium smoke.

It does not make real S3 media, device-firmware, mobile-network, or Cashfree merchant integration claims. Hardware supplier approval, secure clock and pinned key delivery, fleet attestation, secure-element key management, independent firmware telemetry validation, real signed media edge tests and production security review remain required before pilot. B17 consent-led GPS and independently validated exposure accounting must not be inferred from B16 heartbeat reports.
