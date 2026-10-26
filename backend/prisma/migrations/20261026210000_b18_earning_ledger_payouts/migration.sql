-- B18: all monetary amounts are immutable BIGINT paise, not mutable device-reported reach.
CREATE TYPE "SettlementState" AS ENUM ('READY','PAYOUT_PENDING','PAID','NEEDS_REVIEW');
CREATE TYPE "PayoutState" AS ENUM ('QUEUED','SUBMITTED','PAID','NEEDS_REVIEW');
CREATE TYPE "BeneficiaryState" AS ENUM ('VERIFIED','REJECTED');
CREATE TYPE "DriverLedgerKind" AS ENUM ('EARNING','PAYOUT');

CREATE TABLE "EarningPolicy" (
 "id" UUID NOT NULL PRIMARY KEY,
 "version" VARCHAR(80) NOT NULL UNIQUE,
 "paisePerReviewedEvent" BIGINT NOT NULL,
 "activatedByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "EarningPolicy_positive_check" CHECK ("paisePerReviewedEvent" BETWEEN 1 AND 10000000)
);
CREATE TABLE "DriverSettlement" (
 "id" UUID NOT NULL PRIMARY KEY,
 "driverUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL,
 "grossPaise" BIGINT NOT NULL,
 "state" "SettlementState" NOT NULL DEFAULT 'READY',
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "paidAt" TIMESTAMPTZ(6),
 CONSTRAINT "DriverSettlement_period_check" CHECK ("periodEnd">="periodStart"),
 CONSTRAINT "DriverSettlement_amount_check" CHECK ("grossPaise">0)
);
CREATE UNIQUE INDEX "DriverSettlement_driverUserId_periodStart_periodEnd_key" ON "DriverSettlement"("driverUserId","periodStart","periodEnd");
CREATE INDEX "DriverSettlement_driverUserId_state_createdAt_idx" ON "DriverSettlement"("driverUserId","state","createdAt");

CREATE TABLE "DriverEarning" (
 "id" UUID NOT NULL PRIMARY KEY,
 "driverUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "sourceProofId" UUID NOT NULL UNIQUE REFERENCES "PlaybackProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "policyId" UUID NOT NULL REFERENCES "EarningPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "reviewedByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "evidenceReference" VARCHAR(140) NOT NULL,
 "amountPaise" BIGINT NOT NULL,
 "settlementId" UUID REFERENCES "DriverSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DriverEarning_amount_check" CHECK("amountPaise">0)
);
CREATE INDEX "DriverEarning_driverUserId_settlementId_createdAt_idx" ON "DriverEarning"("driverUserId","settlementId","createdAt");
CREATE INDEX "DriverEarning_settlementId_idx" ON "DriverEarning"("settlementId");

CREATE TABLE "PayoutBeneficiary" (
 "id" UUID NOT NULL PRIMARY KEY,
 "driverUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "provider" VARCHAR(32) NOT NULL,
 "providerToken" VARCHAR(160) NOT NULL,
 "state" "BeneficiaryState" NOT NULL,
 "verifiedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PayoutBeneficiary_provider_check" CHECK("provider"='cashfree')
);
CREATE UNIQUE INDEX "PayoutBeneficiary_driverUserId_provider_providerToken_key" ON "PayoutBeneficiary"("driverUserId","provider","providerToken");
CREATE INDEX "PayoutBeneficiary_driverUserId_state_idx" ON "PayoutBeneficiary"("driverUserId","state");

CREATE TABLE "DriverPayout" (
 "id" UUID NOT NULL PRIMARY KEY,
 "settlementId" UUID NOT NULL UNIQUE REFERENCES "DriverSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "beneficiaryId" UUID NOT NULL REFERENCES "PayoutBeneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "providerReference" VARCHAR(100) NOT NULL UNIQUE,
 "amountPaise" BIGINT NOT NULL,
 "state" "PayoutState" NOT NULL DEFAULT 'QUEUED',
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "paidAt" TIMESTAMPTZ(6),
 CONSTRAINT "DriverPayout_amount_check" CHECK("amountPaise">0)
);
CREATE INDEX "DriverPayout_state_createdAt_idx" ON "DriverPayout"("state","createdAt");

CREATE TABLE "DriverLedgerEntry" (
 "id" UUID NOT NULL PRIMARY KEY,
 "driverUserId" UUID NOT NULL,
 "kind" "DriverLedgerKind" NOT NULL,
 "amountPaise" BIGINT NOT NULL,
 "earningId" UUID UNIQUE REFERENCES "DriverEarning"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "payoutId" UUID UNIQUE REFERENCES "DriverPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DriverLedgerEntry_positive_check" CHECK("amountPaise">0),
 CONSTRAINT "DriverLedgerEntry_source_check" CHECK(
   ("kind"='EARNING' AND "earningId" IS NOT NULL AND "payoutId" IS NULL)
   OR ("kind"='PAYOUT' AND "payoutId" IS NOT NULL AND "earningId" IS NULL))
);
CREATE INDEX "DriverLedgerEntry_driverUserId_createdAt_id_idx" ON "DriverLedgerEntry"("driverUserId","createdAt","id");

CREATE TABLE "PayoutWebhookEvent" (
 "id" UUID NOT NULL PRIMARY KEY,
 "payoutId" UUID NOT NULL REFERENCES "DriverPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "eventHash" CHAR(64) NOT NULL UNIQUE,
 "eventType" VARCHAR(64) NOT NULL,
 "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PayoutWebhookEvent_payoutId_receivedAt_idx" ON "PayoutWebhookEvent"("payoutId","receivedAt");

CREATE TRIGGER b18_earning_policy_immutable BEFORE UPDATE OR DELETE ON "EarningPolicy"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b18_ledger_immutable BEFORE UPDATE OR DELETE ON "DriverLedgerEntry"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b18_webhook_immutable BEFORE UPDATE OR DELETE ON "PayoutWebhookEvent"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();

CREATE FUNCTION b18_restrict_earning_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Driver earnings cannot be deleted'; END IF;
 IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."driverUserId" IS DISTINCT FROM OLD."driverUserId"
 OR NEW."sourceProofId" IS DISTINCT FROM OLD."sourceProofId" OR NEW."policyId" IS DISTINCT FROM OLD."policyId"
 OR NEW."reviewedByUserId" IS DISTINCT FROM OLD."reviewedByUserId"
 OR NEW."evidenceReference" IS DISTINCT FROM OLD."evidenceReference"
 OR NEW."amountPaise" IS DISTINCT FROM OLD."amountPaise"
 OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
 OR (OLD."settlementId" IS NOT NULL AND NEW."settlementId" IS DISTINCT FROM OLD."settlementId") THEN
 RAISE EXCEPTION 'Driver earning immutable except first settlement assignment';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b18_earning_snapshot BEFORE UPDATE OR DELETE ON "DriverEarning"
 FOR EACH ROW EXECUTE FUNCTION b18_restrict_earning_mutation();

CREATE FUNCTION b18_restrict_financial_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Financial records cannot be deleted'; END IF;
 IF TG_TABLE_NAME='DriverSettlement' THEN
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."driverUserId" IS DISTINCT FROM OLD."driverUserId"
   OR NEW."periodStart" IS DISTINCT FROM OLD."periodStart"
   OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd"
   OR NEW."grossPaise" IS DISTINCT FROM OLD."grossPaise"
   OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
   THEN RAISE EXCEPTION 'Settlement financial snapshot immutable'; END IF;
 ELSE
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."settlementId" IS DISTINCT FROM OLD."settlementId"
   OR NEW."beneficiaryId" IS DISTINCT FROM OLD."beneficiaryId"
   OR NEW."providerReference" IS DISTINCT FROM OLD."providerReference"
   OR NEW."amountPaise" IS DISTINCT FROM OLD."amountPaise"
   OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
   THEN RAISE EXCEPTION 'Payout financial snapshot immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b18_settlement_snapshot BEFORE UPDATE OR DELETE ON "DriverSettlement"
 FOR EACH ROW EXECUTE FUNCTION b18_restrict_financial_mutation();
CREATE TRIGGER b18_payout_snapshot BEFORE UPDATE OR DELETE ON "DriverPayout"
 FOR EACH ROW EXECUTE FUNCTION b18_restrict_financial_mutation();
