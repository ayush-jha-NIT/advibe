-- B10 confidential source media + attested processing + immutable moderation decisions.
CREATE TYPE "CreativeAssetState" AS ENUM ('PENDING_UPLOAD','UPLOADED','PROCESSING','READY','REJECTED');
CREATE TYPE "CreativeApproval" AS ENUM ('PENDING','UNDER_REVIEW','APPROVED','REJECTED');
CREATE TABLE "MediaAsset" (
 "id" UUID NOT NULL, "businessId" UUID NOT NULL, "uploaderUserId" UUID NOT NULL,
 "state" "CreativeAssetState" NOT NULL DEFAULT 'PENDING_UPLOAD',
 "mimeType" VARCHAR(80) NOT NULL, "expectedBytes" INTEGER NOT NULL,
 "expectedSha256" CHAR(64) NOT NULL, "sourceKey" VARCHAR(350) NOT NULL,
 "sourceVersionId" VARCHAR(200), "uploadExpiresAt" TIMESTAMPTZ(6) NOT NULL,
 "uploadedAt" TIMESTAMPTZ(6),"scannedAt" TIMESTAMPTZ(6),
 "processedAt" TIMESTAMPTZ(6),"sourceSha256" CHAR(64),
 "processedKey" VARCHAR(350), "processedVersionId" VARCHAR(200),
 "processedSha256" CHAR(64), "processedMimeType" VARCHAR(80),
 "width" INTEGER,"height" INTEGER,"durationMs" INTEGER,
 "failureCode" VARCHAR(100), "processAttempts" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "MediaAsset_id_businessId_key" UNIQUE ("id","businessId"),
 CONSTRAINT "MediaAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "MediaAsset_expectedBytes_check" CHECK ("expectedBytes" BETWEEN 1 AND 104857600),
 CONSTRAINT "MediaAsset_expectedSha256_check" CHECK ("expectedSha256" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "MediaAsset_sourceSha256_check" CHECK ("sourceSha256" IS NULL OR "sourceSha256" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "MediaAsset_processedSha256_check" CHECK ("processedSha256" IS NULL OR "processedSha256" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "MediaAsset_processing_complete_check" CHECK ("state" <> 'READY' OR (
  "uploadedAt" IS NOT NULL AND "scannedAt" IS NOT NULL AND "processedAt" IS NOT NULL AND
  "sourceSha256" IS NOT NULL AND "sourceSha256"="expectedSha256" AND "processedKey" IS NOT NULL AND
  "processedVersionId" IS NOT NULL AND "processedSha256" IS NOT NULL AND
  "processedMimeType" IS NOT NULL AND "width" > 0 AND "height" > 0)),
 CONSTRAINT "MediaAsset_upload_check" CHECK ("state"='PENDING_UPLOAD' OR
  ("uploadedAt" IS NOT NULL AND "sourceVersionId" IS NOT NULL)),
 CONSTRAINT "MediaAsset_processed_dimensions_check" CHECK (
  ("width" IS NULL OR "width" BETWEEN 1 AND 8192) AND
  ("height" IS NULL OR "height" BETWEEN 1 AND 8192) AND
  ("durationMs" IS NULL OR "durationMs" BETWEEN 1 AND 600000)),
 CONSTRAINT "MediaAsset_processAttempts_check" CHECK ("processAttempts" BETWEEN 0 AND 10)
);
CREATE UNIQUE INDEX "MediaAsset_sourceKey_key" ON "MediaAsset"("sourceKey");
CREATE UNIQUE INDEX "MediaAsset_processedKey_key" ON "MediaAsset"("processedKey");
CREATE INDEX "MediaAsset_businessId_state_createdAt_id_idx" ON "MediaAsset"("businessId","state","createdAt","id");
CREATE INDEX "MediaAsset_state_uploadedAt_idx" ON "MediaAsset"("state","uploadedAt");
CREATE TABLE "Creative" (
 "id" UUID NOT NULL,"ownerBusinessId" UUID NOT NULL,
 "title" VARCHAR(180) NOT NULL,"placement" "ScreenPlacement" NOT NULL,
 "mediaAssetId" UUID NOT NULL,
 "approval" "CreativeApproval" NOT NULL DEFAULT 'PENDING',
 "reviewedByUserId" UUID,"reviewedAt" TIMESTAMPTZ(6),
 "reviewReason" VARCHAR(1000),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "Creative_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Creative_business_fkey" FOREIGN KEY ("ownerBusinessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Creative_asset_business_fkey" FOREIGN KEY ("mediaAssetId","ownerBusinessId") REFERENCES "MediaAsset"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Creative_review_check" CHECK (
  ("approval" IN ('PENDING','UNDER_REVIEW') AND "reviewedByUserId" IS NULL AND "reviewedAt" IS NULL)
  OR ("approval" IN ('APPROVED','REJECTED') AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL))
);
CREATE INDEX "Creative_ownerBusinessId_createdAt_id_idx" ON "Creative"("ownerBusinessId","createdAt","id");
CREATE INDEX "Creative_approval_createdAt_idx" ON "Creative"("approval","createdAt");
CREATE TABLE "CreativeReview" (
 "id" UUID NOT NULL, "creativeId" UUID NOT NULL,"adminUserId" UUID NOT NULL,
 "decision" "CreativeApproval" NOT NULL,"reason" VARCHAR(1000) NOT NULL,
 "sourceSha256" CHAR(64) NOT NULL,"processedSha256" CHAR(64) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CreativeReview_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CreativeReview_creative_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CreativeReview_decision_check" CHECK ("decision" IN ('APPROVED','REJECTED'))
);
CREATE INDEX "CreativeReview_creativeId_createdAt_idx" ON "CreativeReview"("creativeId","createdAt");
