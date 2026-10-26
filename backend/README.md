# AdVibe Backend B8: device provisioning and secure pairing

B0–B8 are implemented in repository and CI; the deployed frontend is **still in demo mode**, and no production AdVibe Neon database, hardware vendor or physical-screen installation has been provisioned.

Start with backend/.env.example: private pooled DATABASE_URL and direct DIRECT_URL; AUTH_SECRET; MFA_ENCRYPTION_KEY; verified CORS_ORIGINS, Resend and Turnstile credentials; legally approved KYC private storage/scan/legal policy. B8 additionally supports DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64: separate Ed25519 private PKCS8 DER in base64url, stored **only in server secrets management**, with the public key pinned into approved hardware firmware.

Local commands:
- npm install --prefix backend
- npm --prefix backend run db:validate
- npm --prefix backend run db:migrate:deploy
- npm --prefix backend run check (only against disposable localhost PostgreSQL, NODE_ENV=test and DB_TEST_ALLOWED=true)
- npm --prefix backend run dev

Migration 20261026040000_b8_device_identity creates Screen, DeviceCredential, DevicePairingChallenge, DeviceRequestNonce, DeviceHeartbeat and DeviceManifestVersion plus constraints and indexes.

B8 implements Admin-only screen creation, public-key pairing challenges, signed pairing proof, immediate credential revocation and rotation, owner-scoped screen inspection, device-signed heartbeats and short-lived signed **EMPTY** manifests. This is deliberately not ad playback. See docs/backend/B8_IMPLEMENTATION.md for routes, exact signature canonicalization, security limits and hardware/legal prerequisites. Never expose the Ed25519 private key or claim verified physical installation from a database PAIRED status.

B9 is geo inventory; B15–B16 are scheduling/playback. B22 migrates frontend demo services to real APIs. All external production credentials and device integrations require separate deployment and review.
