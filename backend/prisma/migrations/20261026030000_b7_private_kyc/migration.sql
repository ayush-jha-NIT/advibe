-- B7 confidential documents, independent verified scan events and append-only decisions.
CREATE TYPE "KycDocumentKind" AS ENUM ('LICENCE','REGISTRATION','INSURANCE','OTHER');
CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING_UPLOAD','UPLOADED','SCAN_CLEAN','SCAN_REJECTED','VERIFIED','REJECTED');
CREATE TYPE "DriverReviewDecision" AS ENUM ('APPROVED','REJECTED','CHANGES_REQUESTED');
ALTER TABLE "DriverApplication" ADD CONSTRAINT "DriverApplication_id_driverUserId_key" UNIQUE ("id","driverUserId");
CREATE TABLE "DriverDocument" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "driverUserId" UUID NOT NULL,
  "kind" "KycDocumentKind" NOT NULL,
  "contentType" VARCHAR(60) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" VARCHAR(350) NOT NULL,
  "storageVersionId" VARCHAR(200),
  "sha256" CHAR(64),
  "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "uploadExpiresAt" TIMESTAMPTZ(6) NOT NULL,
  "uploadedAt" TIMESTAMPTZ(6),
  "scannedAt" TIMESTAMPTZ(6),
  "reviewedAt" TIMESTAMPTZ(6),
  "reviewedByUserId" UUID,
  "retentionUntil" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverDocument_size_check" CHECK ("sizeBytes" BETWEEN 1 AND 10485760),
  CONSTRAINT "DriverDocument_application_fkey" FOREIGN KEY ("applicationId","driverUserId") REFERENCES "DriverApplication"("id","driverUserId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DriverDocument_reviewer_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DriverDocument_uploaded_check" CHECK ("status"='PENDING_UPLOAD' OR ("uploadedAt" IS NOT NULL AND "storageVersionId" IS NOT NULL)),
  CONSTRAINT "DriverDocument_scan_check" CHECK ("status" IN ('PENDING_UPLOAD','UPLOADED') OR ("scannedAt" IS NOT NULL AND "sha256" IS NOT NULL)),
  CONSTRAINT "DriverDocument_review_check" CHECK ("status" NOT IN ('VERIFIED','REJECTED') OR ("reviewedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL))
);
CREATE UNIQUE INDEX "DriverDocument_storageKey_key" ON "DriverDocument"("storageKey");
CREATE INDEX "DriverDocument_applicationId_kind_status_idx" ON "DriverDocument"("applicationId","kind","status");
CREATE INDEX "DriverDocument_retentionUntil_idx" ON "DriverDocument"("retentionUntil");
CREATE INDEX "DriverDocument_driverUserId_createdAt_idx" ON "DriverDocument"("driverUserId","createdAt");
CREATE TABLE "KycScanEvent" (
  "id" UUID NOT NULL, "providerEventId" VARCHAR(100) NOT NULL, "documentId" UUID NOT NULL,
  "verdict" VARCHAR(30) NOT NULL, "digest" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KycScanEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KycScanEvent_document_fkey" FOREIGN KEY ("documentId") REFERENCES "DriverDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KycScanEvent_providerEventId_key" ON "KycScanEvent"("providerEventId");
CREATE INDEX "KycScanEvent_documentId_createdAt_idx" ON "KycScanEvent"("documentId","createdAt");
CREATE TABLE "DriverAgreement" (
  "id" UUID NOT NULL, "applicationId" UUID NOT NULL, "driverUserId" UUID NOT NULL,
  "templateVersion" VARCHAR(100) NOT NULL, "templateSha256" CHAR(64) NOT NULL,
  "privacyVersion" VARCHAR(100) NOT NULL, "acceptedIpHash" CHAR(64) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverAgreement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverAgreement_application_fkey" FOREIGN KEY ("applicationId","driverUserId") REFERENCES "DriverApplication"("id","driverUserId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DriverAgreement_applicationId_templateVersion_templateSha256_key" ON "DriverAgreement"("applicationId","templateVersion","templateSha256");
CREATE INDEX "DriverAgreement_driverUserId_acceptedAt_idx" ON "DriverAgreement"("driverUserId","acceptedAt");
CREATE TABLE "DriverApplicationReview" (
  "id" UUID NOT NULL, "applicationId" UUID NOT NULL, "adminUserId" UUID NOT NULL,
  "decision" "DriverReviewDecision" NOT NULL, "reason" VARCHAR(2000), "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverApplicationReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverApplicationReview_application_fkey" FOREIGN KEY ("applicationId") REFERENCES "DriverApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DriverApplicationReview_admin_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DriverApplicationReview_applicationId_createdAt_idx" ON "DriverApplicationReview"("applicationId","createdAt");
CREATE INDEX "DriverApplicationReview_adminUserId_createdAt_idx" ON "DriverApplicationReview"("adminUserId","createdAt");
