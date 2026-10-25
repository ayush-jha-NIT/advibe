# AdVibe B7: private KYC, agreement consent and independently reviewed decisions

## Delivered in repository (NOT a live KYC provider)

KYC metadata is stored in PostgreSQL; binary documents stay in a private S3-compatible bucket with **bucket versioning and server-side encryption**. No Aadhaar, government ID number, raw plate or bank account fields are exposed in API responses. Server IAM signs five-minute private PUT URLs and one-minute Admin-only GET URLs. Documents are owner-scoped by PostgreSQL composite foreign keys (applicationId,driverUserId). Private storage keys, full scans and KYC document contents are never returned by a normal listing endpoint or logged.

New migration 20261026030000_b7_private_kyc introduces DriverDocument, KycScanEvent, DriverAgreement, DriverApplicationReview, enums, indexes, composite FK, immutable review rows, scanned/accepted metadata and retentionUntil. Tests apply all forward migrations to disposable PostgreSQL.

## Endpoints

- POST /api/v1/drivers/documents/upload-intents: DRIVER session + CSRF + Idempotency-Key; requires a submitted/changes-requested owned application, restricted kind (licence/registration/insurance/other), MIME (PDF/JPEG/PNG), 1 to 10 MiB. Creates pending upload and returns a five-minute private signed PUT. Fail closed when policy/storage unavailable.
- POST /api/v1/drivers/documents/{documentId}/complete: authenticated owner, required CSRF. HEAD-checks private object size/MIME and mandatory bucket versionId; marks UPLOADED without claiming an identity verification.
- GET /api/v1/drivers/applications/{applicationId}/documents: private metadata/status list only, owner verified.
- POST /api/v1/webhooks/kyc/document-scan: **server-to-server** HMAC SHA-256 notification, canonical timestamp + event ID + document ID + SHA + immutable storage version + verdict. Rejects unsigned requests, stale timestamps, reused events, invalid document state or wrong version. A trusted scanner integration is required in production. Signed scan results mark SCAN_CLEAN or SCAN_REJECTED, not VERIFIED.
- POST /api/v1/drivers/applications/{applicationId}/accept-agreement: requires separately explicit agreement and privacy consents, matches legal-reviewed configured template version and exact document SHA-256 and published privacy version. Records immutable acceptance receipt and HMAC-IP fingerprint. Draft B6 step 4 alone **never counts as acceptance**.
- GET /api/v1/admin/driver-applications and GET /api/v1/admin/driver-applications/{applicationId}: Admin MFA session only, submitted evidence/review summaries, never private object keys.
- GET /api/v1/admin/driver-documents/{documentId}/download-url: Admin MFA only; returns short-lived version-locked signed GET; access is audited.
- POST /api/v1/admin/driver-documents/{documentId}/decision: Admin MFA + CSRF, requires independently scanned evidence; approval only for clean scan with upload link expired and unchanged S3 version, human reason and audit trail. A rejected scan can only be rejected.
- POST /api/v1/admin/driver-applications/{applicationId}/decision: Admin MFA + CSRF + Idempotency-Key. Records review APPROVED/REJECTED/CHANGES_REQUESTED, immutably stores evidence references and emits audit/outbox event. Approval requires current legal acceptance and VERIFIED licence, registration and insurance evidence. Rejects stale/duplicate review. Application APPROVED is **not** vehicle approval or device installation.
- POST /api/v1/drivers/applications/{applicationId}/reopen: owner resumes a CHANGES_REQUESTED draft, retaining prior evidence and audit history. Future re-submission runs B6 validations.

## Fail-closed external requirements

B7 does **not** configure or provision live KYC provider, legal templates, S3 bucket, scanner or retention policy. Configure private KYC_S3_BUCKET, KYC_S3_REGION, secure AWS workload credentials, KYC_SCAN_SECRET of >=32 random characters, KYC_RETENTION_DAYS 1..365, DRIVER_AGREEMENT_VERSION, DRIVER_AGREEMENT_SHA256 and DRIVER_PRIVACY_VERSION. Missing policy means no uploads/consent/review approval. Bucket must be private, deny public ACLs, have enforced encryption and versioning, narrow IAM and a *legally approved lifecycle deletion policy*. Tests use an injected fake storage adapter and signed scanner notifications, never pretend to validate real Aadhaar or insurer credentials.

The scan callback is a cryptographically authenticated **claim from a configured trusted scanner**, not an internally implemented antivirus scanner or independent government document validation. The business must select a compliant identity/document vendor and define real scan and reviewer SOPs. Production approval needs a reviewed agreement/privacy document served to users matching its SHA. Backend retentionUntil by itself does not delete physical objects; configure bucket object lifecycle and implement automated deletion/reconciliation in B20. Review local laws, minimization, incident response, security monitoring and real data retention before collecting identifiable documents.

## Tests and boundaries

CI verifies signed scan authentication/replay, cross-driver document isolation, Admin MFA, CSRF, provider-vs-browser access, wrong/private object version or MIME, locked/replayed review, incomplete evidence approval denial, immutable legal acceptance, idempotency and PostgreSQL consistency. Root Next.js demo lint/typecheck/build and Chromium smoke stay separate release gates. B8 implements device provisioning; B22 replaces frontend demos. No live person, vehicle or KYC is automatically approved from frontend flags.
