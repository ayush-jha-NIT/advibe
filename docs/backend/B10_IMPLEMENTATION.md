# AdVibe B10: secure private creative ingestion, transcoding and moderation

Status: implemented in repository + isolated PostgreSQL 16 tests. The Vercel frontend remains demo-only. No production AdVibe S3 bucket, ClamAV service, FFmpeg worker, vendor moderation policy or real media pipeline has been deployed.

## Storage and processing boundaries

B10 adds PostgreSQL MediaAsset, Creative and CreativeReview tables, a new asset state machine (PENDING_UPLOAD -> UPLOADED -> PROCESSING -> READY/REJECTED), scoped business FK including a composite Creative(mediaAssetId,ownerBusinessId) constraint, size/format/digest constraints, immutable moderation rows, indexes, append-only audit and transactionally emitted outbox records.

The original file stays in encrypted, PRIVATE, versioned S3 storage with a five-minute signed upload URL. Only PNG, JPEG and MP4 are accepted, up to 100 MiB. The caller supplies a SHA-256 digest which is recomputed from version-pinned bytes by the backend worker before processing. The backend first validates private object metadata through HEAD (version ID, MIME and size). Signed upload retries cannot extend the original expiry. No raw storage paths are sent to users; no signed GET for unprocessed source media.

A separate worker, NEVER Express request handling, takes UPLOADED assets and verifies HEAD immutable version metadata, original SHA-256, byte-signature magic and declared MIME. It then calls a real command-line ClamAV scan. Missing scan tools, malware detection, scan failure, invalid file, missing FFmpeg/ffprobe or failed transcoding **fail closed** by rejecting the asset and preventing further use. FFprobe checks media dimensions, video duration <=60 seconds; FFmpeg strips audio and converts videos to H.264 MP4, or images to PNG; resulting format and file size are checked. The processed file is saved privately with versioning, checksum, dimensions, duration, scannedAt and processedAt; only after all checks can status become READY. Worker runs once per invocation and must be scheduled by infrastructure with least-privilege IAM and bounded concurrency.

The processing CLI is backend/scripts/process-creatives.ts, invoked with npm --prefix backend run creative:worker from an authorized isolated worker with CREATIVE_WORKER_ENABLED=true; install ClamAV, FFmpeg and ffprobe and maintain current antivirus signatures before production. No transcode command runs in user-facing API requests. CI integration injects deterministic fake storage and processing adapters; it proves state/permission guards, but DOES NOT pretend to run ClamAV/FFmpeg, antivirus definitions or a full codec corpus in production.

## API

- POST /api/v1/creatives/upload-intents: Advertiser OWNER/MANAGER of requested business, mandatory CSRF + Idempotency-Key. Accepts businessId, contentType, sizeBytes, sha256 and responds with a scoped private signed PUT and expiry.
- POST /api/v1/creatives/assets/:assetId/complete: authenticated business write member; version/MIME/size verified from trusted object storage, outbox publication queued. Does NOT mark media READY.
- GET /api/v1/creatives/assets/:assetId: own business member or MFA Admin; metadata/status only, no private object keys.
- POST /api/v1/creatives: OWNER/MANAGER of business; requires a READY asset belonging to the SAME business. Result starts PENDING moderation. Replays are idempotent.
- GET /api/v1/creatives and /creatives/:creativeId: business-scoped reads or MFA Admin; no raw media paths.
- GET /api/v1/admin/creatives/:creativeId/preview-url: MFA Admin only, one-minute version-locked signed GET for already READY processed object, access audited.
- POST /api/v1/admin/creatives/:creativeId/decision: MFA Admin, CSRF and Idempotency-Key, explicit reason and approved/rejected decision. Requires READY media with scan/processing evidence, emits immutable review, audit, outbox. Later decisions cannot silently overwrite prior ones.

## Production blockers and follow-up

Configure server-only CREATIVE_S3_BUCKET, CREATIVE_S3_REGION with a private SSE-encrypted versioned bucket, deny anonymous/public ACLs, narrowly scoped IAM, antivirus engine and definitions, FFmpeg runtime, worker deployment/cron/queue, quarantine and deletion/lifecycle policies, limits at CDN/edge, codec hardening, content policy and trained moderation. The database and GitHub Actions tests do not imply any live processing deployment. Fail-closed worker rejects on unavailable dependencies; transient repair/reupload and dead-letter/reconciliation should be operated via B20.

**READY** means technical media processing passed, not human creative approval. **APPROVED** is an Admin content decision, not a booking, guarantee of inventory, or device playback authorization. Actual creative placement, advertiser campaign scheduling and publishing remain B12–B16; bank or KYC data is never part of this module.
