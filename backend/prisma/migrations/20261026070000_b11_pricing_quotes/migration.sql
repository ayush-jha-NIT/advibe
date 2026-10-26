-- B11: immutable rate revisions, tax/discount policies, quote snapshot ledger.
CREATE TYPE "DiscountKind" AS ENUM ('PERCENT_BPS','FIXED_PAISE');
CREATE TABLE "RateRule" (
 "id" UUID NOT NULL, "cityId" UUID NOT NULL, "placement" "ScreenPlacement" NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RateRule_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RateRule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RateRule_cityId_placement_key" ON "RateRule"("cityId","placement");
CREATE TABLE "RateRevision" (
 "id" UUID NOT NULL, "ruleId" UUID NOT NULL, "version" INTEGER NOT NULL,
 "ratePaisePerScreenDay" INTEGER NOT NULL,"active" BOOLEAN NOT NULL,
 "validFrom" DATE NOT NULL,"validTo" DATE NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdByUserId" UUID NOT NULL,
 CONSTRAINT "RateRevision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RateRevision_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RateRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RateRevision_positive_version" CHECK ("version" >= 1),
 CONSTRAINT "RateRevision_rate_check" CHECK ("ratePaisePerScreenDay" BETWEEN 0 AND 1000000000),
 CONSTRAINT "RateRevision_valid_dates" CHECK ("validTo" >= "validFrom")
);
CREATE UNIQUE INDEX "RateRevision_ruleId_version_key" ON "RateRevision"("ruleId","version");
CREATE INDEX "RateRevision_ruleId_version_idx" ON "RateRevision"("ruleId","version");
CREATE TABLE "TaxPolicy" (
 "id" UUID NOT NULL,"version" VARCHAR(80) NOT NULL,
 "taxBps" INTEGER NOT NULL,"sourceReference" VARCHAR(180) NOT NULL,"active" BOOLEAN NOT NULL,
 "validFrom" DATE NOT NULL,"validTo" DATE NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdByUserId" UUID NOT NULL,
 CONSTRAINT "TaxPolicy_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "TaxPolicy_tax_check" CHECK ("taxBps" BETWEEN 0 AND 10000),
 CONSTRAINT "TaxPolicy_valid_dates" CHECK ("validTo" >= "validFrom"),
 CONSTRAINT "TaxPolicy_version_check" CHECK (length(trim("version")) >= 3)
);
CREATE UNIQUE INDEX "TaxPolicy_version_key" ON "TaxPolicy"("version");
CREATE INDEX "TaxPolicy_active_validFrom_validTo_idx" ON "TaxPolicy"("active","validFrom","validTo");
CREATE TABLE "DiscountPolicy" (
 "id" UUID NOT NULL,"code" VARCHAR(40) NOT NULL,"version" INTEGER NOT NULL,
 "kind" "DiscountKind" NOT NULL,"value" INTEGER NOT NULL,
 "active" BOOLEAN NOT NULL,"validFrom" DATE NOT NULL,"validTo" DATE NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdByUserId" UUID NOT NULL,
 CONSTRAINT "DiscountPolicy_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DiscountPolicy_value_check" CHECK ("value" BETWEEN 0 AND 1000000000),
 CONSTRAINT "DiscountPolicy_bps_check" CHECK ("kind" <> 'PERCENT_BPS' OR "value" <= 10000),
 CONSTRAINT "DiscountPolicy_version_check" CHECK ("version" >= 1),
 CONSTRAINT "DiscountPolicy_valid_dates" CHECK ("validTo" >= "validFrom"),
 CONSTRAINT "DiscountPolicy_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$')
);
CREATE UNIQUE INDEX "DiscountPolicy_code_version_key" ON "DiscountPolicy"("code","version");
CREATE INDEX "DiscountPolicy_code_active_validFrom_validTo_idx" ON "DiscountPolicy"("code","active","validFrom","validTo");
CREATE TABLE "PriceQuote" (
 "id" UUID NOT NULL, "businessId" UUID NOT NULL,"requestedByUserId" UUID NOT NULL,
 "campaignId" UUID NOT NULL,"currency" CHAR(3) NOT NULL DEFAULT 'INR',
 "version" INTEGER NOT NULL DEFAULT 1,"subtotalPaise" BIGINT NOT NULL,
 "discountPaise" BIGINT NOT NULL,"taxablePaise" BIGINT NOT NULL,
 "taxPaise" BIGINT NOT NULL,"totalPaise" BIGINT NOT NULL,
 "taxPolicyVersion" VARCHAR(80) NOT NULL,"discountCode" VARCHAR(40),
 "discountVersion" INTEGER,
 "startDate" DATE NOT NULL,"endDate" DATE NOT NULL,
 "selectedWeekdays" INTEGER[] NOT NULL,"screenIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
 "pricingSnapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "PriceQuote_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PriceQuote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PriceQuote_amount_checks" CHECK (
  "subtotalPaise" >= 0 AND "discountPaise" >= 0 AND
  "discountPaise" <= "subtotalPaise" AND "taxablePaise" = "subtotalPaise"-"discountPaise" AND
  "taxPaise" >= 0 AND "totalPaise" = "taxablePaise"+"taxPaise" AND
  "totalPaise" <= 9007199254740991),
 CONSTRAINT "PriceQuote_version_check" CHECK ("version"=1 AND "currency"='INR'),
 CONSTRAINT "PriceQuote_date_check" CHECK ("endDate">="startDate" AND "expiresAt">"createdAt"),
 CONSTRAINT "PriceQuote_weekdays_check" CHECK (
  cardinality("selectedWeekdays") BETWEEN 1 AND 7 AND
  "selectedWeekdays" <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]),
 CONSTRAINT "PriceQuote_screen_count_check" CHECK (cardinality("screenIds") BETWEEN 1 AND 100),
 CONSTRAINT "PriceQuote_discount_policy_check" CHECK (("discountCode" IS NULL)=("discountVersion" IS NULL))
);
CREATE INDEX "PriceQuote_businessId_createdAt_id_idx" ON "PriceQuote"("businessId","createdAt","id");
CREATE INDEX "PriceQuote_expiresAt_idx" ON "PriceQuote"("expiresAt");
-- These records represent evidence of an offered price, never silently editable catalog rows.
CREATE OR REPLACE FUNCTION b11_reject_immutable_mutations() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'B11 snapshot/policy rows are append only'; END; $$;
CREATE TRIGGER b11_rate_revision_immutable BEFORE UPDATE OR DELETE ON "RateRevision"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b11_tax_immutable BEFORE UPDATE OR DELETE ON "TaxPolicy"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b11_discount_immutable BEFORE UPDATE OR DELETE ON "DiscountPolicy"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b11_quote_immutable BEFORE UPDATE OR DELETE ON "PriceQuote"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
