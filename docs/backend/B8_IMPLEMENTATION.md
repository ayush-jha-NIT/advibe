# AdVibe Backend B8: device provisioning and cryptographic pairing

Implementation status: committed source + isolated PostgreSQL CI testing only. **Not real device deployment or physical installation certification.** The hardware supplier, installation regulations, firmware images, attestation root, network configuration and operational fleet monitoring remain open D01/D03 architecture decisions.

## Security model

An already MFA-authenticated Admin creates a screen tied to a vehicle with an APPROVED B7 driver application; screen placement is cross-checked against BIKE/AUTO/CAR. This merely registers an intended installation with an installer reference; no ad inventory or live playback becomes available. The screen begins UNPAIRED. The Admin supplies a preverified Ed25519 SPKI public key from a trusted offline installer process, then obtains a five-minute pairing challenge. **Do not approve a key solely because a device emailed or submitted it.** Manufacturer attestation and installer enrollment checks are external prerequisites.

The device signs the exact JSON tuple ["advibe-pair-v1",challengeId,screenId,nonce] using its private key. Verification never accepts browser cookies or human JWTs. PostgreSQL atomically consumes the one-time challenge, moves screen to PAIRED and creates/rotates DeviceCredential. The private key is never transferred to the server. Credential fingerprint is SHA-256 of canonical public SPKI DER.

All device API calls require Ed25519 signature headers X-Device-ID (credential UUID), X-Device-Timestamp (Unix milliseconds), X-Device-Nonce (22–64 base64url chars) and X-Device-Signature (base64url of 64-byte signature). Canonical signed data is **UTF-8 JSON.stringify(["advibe-device-v1",UPPERCASE_METHOD,REQUEST_PATH,DECIMAL_MILLISECONDS,NONCE,SHA256_HEX_OF_JSON.stringify(BODY_OR_EMPTY_OBJECT)])**. Device requests never authenticate using session cookies or bearer tokens. Clock skew is limited to ±120 seconds. Every successfully processed nonce is uniquely persisted per credential inside the same serializable transaction as heartbeat processing or manifest read; duplicates and duplicate heartbeat event IDs are rejected even after nonce changes. Credentials are rechecked against revocation within the transaction, not just when initially resolving the signature. Dev/CI keys are generated inside test processes, never checked into Git.

An Admin can revoke a paired credential; subsequent signed requests fail immediately. Re-enrollment requires a fresh Admin-issued challenge with a newly offline-verified Ed25519 public key. Events are append-only for audit and request replay forensics. PostgreSQL indexes/unique constraints enforce single credential per screen, one-time pairing, request nonces and device event IDs.

## B8 endpoints

| Method | Route | Meaning |
| --- | --- | --- |
| POST | /api/v1/admin/devices/screens | MFA Admin and CSRF; idempotent screen provisioning tied to approved driver |
| POST | /api/v1/admin/devices/pairing-challenges | MFA Admin and CSRF; idempotent five-minute key-bound challenge |
| POST | /api/v1/devices/pair | Unauthenticated challenge proof with device private-key signature; no browser cookies |
| POST | /api/v1/admin/devices/{screenId}/revoke | MFA Admin and CSRF; immediate server revocation |
| GET | /api/v1/screens | Admin or owning driver, never advertiser inventory discovery |
| GET | /api/v1/screens/{screenId} | Admin or owning driver metadata, no credentials |
| POST | /api/v1/admin/devices/{screenId}/manifests/empty | MFA Admin and CSRF issues five-minute empty manifest, version monotonically incrementing |
| GET | /api/v1/devices/manifest | Device signature required, never serves unapproved creatives |
| POST | /api/v1/devices/heartbeat | Device signature required, anti-replay; stores firmware version and device event |

Signed manifest is an Ed25519 signature by a **separate server key** over JSON.stringify({screenId,version,expiresAt,entries:[]}). Firmware must pin/verify the manufacturer's provisioned corresponding trusted public key, independently of the HTTP connection. DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64 is required to issue a manifest; without it, issuance fails closed. Empty manifest is intentional: actual ad creatives, manifest policies, rotations and device playback authorization belong to B15/B16.

## Operational boundaries

B8 does **not** prove the device is genuine, installed in a vehicle, safe for traffic, displaying ads or GPS-capable. A screen may be PAIRED while vehicle verification remains PENDING. No public ad inventory should treat PAIRED as ONLINE or approved. Production use requires hardware vendor integration, firmware secret storage/secure element, key pinning, test rigs and installer audit, installation inspection and lifecycle policies, rate limiting at the edge, physical security, nonce archival/cleanup and independent penetration testing.

CI runs fresh PostgreSQL 16 migrations and tests Admin MFA, owner scope, approved driver requirement, placement compatibility, challenge expiry/replay, Ed25519 proof, wrong key, revoked/rotated credentials, signed and duplicate heartbeat denial, signed zero-entry manifest verification, and existing B0–B7 regression suites, plus frontend build and Chromium smoke. CI does not simulate firmware hardware or production telemetry.

## Next phases

B9 city/zone inventory and B15–B16 live device scheduling/player gateway remain unimplemented. The Vercel UI is still intentionally demo-only and B22 will integrate real APIs.
