# AdVibe Backend B10: private creative ingestion and moderation

B0–B10 source and isolated PostgreSQL tests are implemented. The Vercel frontend remains a demo; dedicated AdVibe production Neon, private creative media storage and processing worker are NOT deployed.

Run npm install --prefix backend and npm --prefix backend run db:migrate:deploy against a provisioned PostgreSQL instance. Fresh CI migrations run through 20261026060000_b10_creative_media. For a disposable localhost test database with NODE_ENV=test and DB_TEST_ALLOWED=true use npm --prefix backend run check.

Private creative upload pipeline requires:
- CREATIVE_S3_BUCKET and CREATIVE_S3_REGION: private encrypted versioned S3, least privilege IAM
- CREATIVE_WORKER_ENABLED=true in dedicated scheduled worker only
- Patched ClamAV (clamscan + current signatures), FFmpeg and ffprobe installed in worker container
- Source files checked by actual SHA-256 and magic/metadata/codec; never expose unreviewed files publicly
- Legal content moderation policy, retention/lifecycle strategy, rate limits and queue monitoring for production

Worker entry point: npm --prefix backend run creative:worker. The web server never runs FFmpeg or ClamAV. This source code does not deploy either binary.

Authenticated B10 routes:
POST /api/v1/creatives/upload-intents
POST /api/v1/creatives/assets/:assetId/complete
GET /api/v1/creatives/assets/:assetId
POST/GET /api/v1/creatives
GET /api/v1/creatives/:creativeId
GET /api/v1/admin/creatives/:creativeId/preview-url
POST /api/v1/admin/creatives/:creativeId/decision

All writable business routes use current database membership, strict CSRF/origin rules and idempotent creation. Only processed READY assets from the same business can be used in a PENDING creative; only MFA Admins can inspect processed asset via short-lived private URL and record moderation decisions. No ad is scheduled or served.

See docs/backend/B10_IMPLEMENTATION.md for state-machine, worker runtime and security/privacy boundaries. Next B11: exact-paise pricing and quote snapshots. Production payments/scheduling and frontend integration remain B12–B22.
