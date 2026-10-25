# AdVibe backend B7: private KYC and agreement review

B0–B7 have repository implementations. The Next.js frontend remains a demo, and no production Neon, KYC scanner vendor, private storage bucket or legally approved retention policy has been connected.

Node 22+, PostgreSQL 16+, private pooled DATABASE_URL, unpooled DIRECT_URL, AUTH_SECRET, MFA_ENCRYPTION_KEY, verified Resend and Turnstile configuration remain required. Apply migration 20261026030000_b7_private_kyc to disposable staging first.

B7 additional private environment values:
- KYC_S3_BUCKET / KYC_S3_REGION: encrypted, private, versioned S3 bucket with least-privilege server-only IAM.
- KYC_SCAN_SECRET: separate >=32-character secret shared only with the trusted scanner callback.
- KYC_RETENTION_DAYS: legally approved document retention days, 1..365.
- DRIVER_AGREEMENT_VERSION and DRIVER_AGREEMENT_SHA256: reviewed/published agreement identifier and exact SHA-256.
- DRIVER_PRIVACY_VERSION: reviewed/published privacy notice version.

No live uploads or approvals are available when policy values/storage are missing. Never store raw government IDs in application tables, frontend localStorage, Cloudinary public URLs, logs or Git.

Run npm install --prefix backend; npm --prefix backend run db:migrate:deploy; npm --prefix backend run check against disposable local test PostgreSQL only (NODE_ENV=test, DB_TEST_ALLOWED=true). For development run npm --prefix backend run dev after provisioning the local database. GitHub Actions does this in a fresh PostgreSQL 16 service container.

Important B7 routes:
- POST /api/v1/drivers/documents/upload-intents
- POST /api/v1/drivers/documents/:documentId/complete
- GET /api/v1/drivers/applications/:applicationId/documents
- POST /api/v1/drivers/applications/:applicationId/accept-agreement
- POST /api/v1/drivers/applications/:applicationId/reopen
- POST /api/v1/webhooks/kyc/document-scan (HMAC-signed provider-only)
- GET /api/v1/admin/driver-applications
- GET /api/v1/admin/driver-applications/:applicationId
- GET /api/v1/admin/driver-documents/:documentId/download-url
- POST /api/v1/admin/driver-documents/:documentId/decision
- POST /api/v1/admin/driver-applications/:applicationId/decision

Only an enrolled MFA-authenticated Admin may review confidential evidence. A clean scan still needs human document approval, and application approval requires all three specified documents plus legally reviewed agreement acceptance. Submission/approval is not proof of live KYC compliance or device activation.

See docs/backend/B7_IMPLEMENTATION.md for boundaries, S3 lifecycle, verified scanner requirements and tests. Next: B8 device provisioning with separate hardware identity. B22 eventually integrates the real frontend.
