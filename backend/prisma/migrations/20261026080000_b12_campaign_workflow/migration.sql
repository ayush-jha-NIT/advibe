-- B12 campaigns. No booking, inventory hold, payment or live scheduling state.
CREATE TYPE "CampaignState" AS ENUM ('DRAFT','SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED','CANCELLED');
CREATE TYPE "CampaignDecision" AS ENUM ('APPROVED','REJECTED','CHANGES_REQUESTED');
CREATE UNIQUE INDEX "Creative_id_ownerBusinessId_key" ON "Creative"("id","ownerBusinessId");
CREATE TABLE "Campaign" (
 "id" UUID NOT NULL,"ownerBusinessId" UUID NOT NULL,"createdByUserId" UUID NOT NULL,
 "title" VARCHAR(180) NOT NULL,"creativeId" UUID NOT NULL,
 "startDate" DATE NOT NULL,"endDate" DATE NOT NULL,"weekdays" INTEGER[] NOT NULL,
 "startMinute" SMALLINT NOT NULL DEFAULT 0,"endMinute" SMALLINT NOT NULL DEFAULT 1440,
 "status" "CampaignState" NOT NULL DEFAULT 'DRAFT',"revision" INTEGER NOT NULL DEFAULT 1,
 "submissionNumber" INTEGER NOT NULL DEFAULT 0,
 "submittedAt" TIMESTAMPTZ(6),"reviewedAt" TIMESTAMPTZ(6),
 "reviewedByUserId" UUID,"reviewReason" VARCHAR(1000),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Campaign_business_fkey" FOREIGN KEY ("ownerBusinessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Campaign_creative_owner_fkey" FOREIGN KEY ("creativeId","ownerBusinessId") REFERENCES "Creative"("id","ownerBusinessId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Campaign_title_check" CHECK (length(trim("title"))>0),
 CONSTRAINT "Campaign_dates_check" CHECK ("endDate">="startDate"),
 CONSTRAINT "Campaign_minutes_check" CHECK ("startMinute" BETWEEN 0 AND 1439 AND "endMinute" BETWEEN 1 AND 1440 AND "endMinute">"startMinute"),
 CONSTRAINT "Campaign_weekdays_check" CHECK (
  cardinality("weekdays") BETWEEN 1 AND 7 AND
  "weekdays" <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]),
 CONSTRAINT "Campaign_revision_check" CHECK ("revision">=1 AND "submissionNumber">=0),
 CONSTRAINT "Campaign_submitted_check" CHECK (("status"='DRAFT' AND "submissionNumber"=0 AND "submittedAt" IS NULL) OR
  ("status"<>'DRAFT' AND "submissionNumber">0 AND "submittedAt" IS NOT NULL)),
 CONSTRAINT "Campaign_reviewed_check" CHECK (
  ("status" IN ('APPROVED','REJECTED','CHANGES_REQUESTED') AND "reviewedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL)
  OR ("status" IN ('DRAFT','SUBMITTED','CANCELLED') AND "reviewedAt" IS NULL AND "reviewedByUserId" IS NULL))
);
CREATE INDEX "Campaign_ownerBusinessId_createdAt_id_idx" ON "Campaign"("ownerBusinessId","createdAt","id");
CREATE INDEX "Campaign_status_submittedAt_id_idx" ON "Campaign"("status","submittedAt","id");
CREATE TABLE "CampaignSubmission" (
 "id" UUID NOT NULL,"campaignId" UUID NOT NULL,"number" INTEGER NOT NULL,
 "campaignRevision" INTEGER NOT NULL,"snapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CampaignSubmission_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CampaignSubmission_number_check" CHECK ("number">=1 AND "campaignRevision">=1),
 CONSTRAINT "CampaignSubmission_campaign_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignSubmission_campaignId_number_key" ON "CampaignSubmission"("campaignId","number");
CREATE TABLE "CampaignReview" (
 "id" UUID NOT NULL,"campaignId" UUID NOT NULL,"submissionNumber" INTEGER NOT NULL,
 "adminUserId" UUID NOT NULL,"decision" "CampaignDecision" NOT NULL,
 "reason" VARCHAR(1000) NOT NULL,"snapshotHash" CHAR(64) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CampaignReview_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CampaignReview_submission_check" CHECK ("submissionNumber">=1),
 CONSTRAINT "CampaignReview_reason_check" CHECK (length(trim("reason"))>=10),
 CONSTRAINT "CampaignReview_hash_check" CHECK ("snapshotHash" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "CampaignReview_submission_fkey" FOREIGN KEY ("campaignId","submissionNumber") REFERENCES "CampaignSubmission"("campaignId","number") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignReview_campaignId_submissionNumber_key" ON "CampaignReview"("campaignId","submissionNumber");
CREATE INDEX "CampaignReview_adminUserId_createdAt_idx" ON "CampaignReview"("adminUserId","createdAt");
CREATE TRIGGER b12_submission_immutable BEFORE UPDATE OR DELETE ON "CampaignSubmission"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b12_review_immutable BEFORE UPDATE OR DELETE ON "CampaignReview"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
