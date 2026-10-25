-- B5 accounts, non-deletable business ownership and consent-backed public enquiries.
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'CLOSED');
ALTER TABLE "User" ADD COLUMN "city" VARCHAR(100);
ALTER TABLE "Business"
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
CREATE INDEX "Business_archivedAt_createdAt_idx" ON "Business"("archivedAt", "createdAt");
CREATE TABLE "Enquiry" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(120) NOT NULL,
  "message" VARCHAR(1500) NOT NULL,
  "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
  "consentAt" TIMESTAMPTZ(6) NOT NULL,
  "captchaVerifiedAt" TIMESTAMPTZ(6) NOT NULL,
  "submitterHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Enquiry_email_normalized_check" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "Enquiry_submitterHash_check" CHECK (btrim("submitterHash") ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "Enquiry_required_consent_check" CHECK ("consentAt" <= "createdAt" + INTERVAL '5 minutes'),
  CONSTRAINT "Enquiry_captcha_verified_check" CHECK ("captchaVerifiedAt" <= "createdAt" + INTERVAL '5 minutes')
);
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status","createdAt");
CREATE INDEX "Enquiry_createdAt_idx" ON "Enquiry"("createdAt");
