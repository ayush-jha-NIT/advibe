
-- B15: immutable screen-day delivery windows and guarded activation.
CREATE TYPE "DeliveryState" AS ENUM ('SCHEDULED','ACTIVE','PAUSED','COMPLETED');
CREATE TABLE "DeliveryPlan"(
 "id" UUID NOT NULL,"reservationHoldId" UUID NOT NULL,"paymentOrderId" UUID NOT NULL,
 "campaignId" UUID NOT NULL,"businessId" UUID NOT NULL,
 "state" "DeliveryState" NOT NULL DEFAULT 'SCHEDULED',
 "revision" INTEGER NOT NULL DEFAULT 1,
 "activatedAt" TIMESTAMPTZ(6) NOT NULL,"pausedAt" TIMESTAMPTZ(6),
 "resumedAt" TIMESTAMPTZ(6),"completedAt" TIMESTAMPTZ(6),
 "pauseReason" VARCHAR(1000),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "DeliveryPlan_pkey" PRIMARY KEY("id"),
 CONSTRAINT "DeliveryPlan_reservationHoldId_fkey" FOREIGN KEY("reservationHoldId") REFERENCES "ReservationHold"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryPlan_paymentOrderId_fkey" FOREIGN KEY("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryPlan_campaignId_fkey" FOREIGN KEY("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryPlan_businessId_fkey" FOREIGN KEY("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryPlan_revision_check" CHECK("revision">=1),
 CONSTRAINT "DeliveryPlan_completed_check" CHECK("state"<>'COMPLETED' OR "completedAt" IS NOT NULL),
 CONSTRAINT "DeliveryPlan_paused_check" CHECK("state"<>'PAUSED' OR "pausedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "DeliveryPlan_reservationHoldId_key" ON "DeliveryPlan"("reservationHoldId");
CREATE UNIQUE INDEX "DeliveryPlan_paymentOrderId_key" ON "DeliveryPlan"("paymentOrderId");
CREATE INDEX "DeliveryPlan_campaignId_state_idx" ON "DeliveryPlan"("campaignId","state");
CREATE INDEX "DeliveryPlan_businessId_createdAt_idx" ON "DeliveryPlan"("businessId","createdAt");
CREATE INDEX "DeliveryPlan_state_updatedAt_idx" ON "DeliveryPlan"("state","updatedAt");
CREATE TABLE "DeliveryWindow" (
 "id" UUID NOT NULL,"planId" UUID NOT NULL,"holdId" UUID NOT NULL,
 "screenId" UUID NOT NULL,"serviceDate" DATE NOT NULL,
 "startsAt" TIMESTAMPTZ(6) NOT NULL,"endsAt" TIMESTAMPTZ(6) NOT NULL,
 "cityTimeZone" VARCHAR(100) NOT NULL,
 CONSTRAINT "DeliveryWindow_pkey" PRIMARY KEY("id"),
 CONSTRAINT "DeliveryWindow_planId_fkey" FOREIGN KEY("planId") REFERENCES "DeliveryPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryWindow_item_fkey" FOREIGN KEY("holdId","screenId","serviceDate") REFERENCES "ReservationHoldItem"("holdId","screenId","serviceDate") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeliveryWindow_duration_check" CHECK("startsAt"<"endsAt")
);
CREATE UNIQUE INDEX "DeliveryWindow_planId_screenId_serviceDate_key" ON "DeliveryWindow"("planId","screenId","serviceDate");
CREATE INDEX "DeliveryWindow_screenId_startsAt_endsAt_idx" ON "DeliveryWindow"("screenId","startsAt","endsAt");
CREATE INDEX "DeliveryWindow_planId_startsAt_idx" ON "DeliveryWindow"("planId","startsAt");
CREATE FUNCTION b15_validate_plan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM "ReservationHold" h
  JOIN "PaymentOrder" o ON o."reservationHoldId"=h."id"
  JOIN "PriceQuote" q ON q."id"=h."quoteId"
  JOIN "Campaign" c ON c."id"=h."campaignId"
  WHERE h."id"=NEW."reservationHoldId" AND h."state"='CONFIRMED'
    AND h."businessId"=NEW."businessId" AND h."campaignId"=NEW."campaignId"
    AND o."id"=NEW."paymentOrderId" AND o."state"='PAID' AND NOT o."requiresResolution"
    AND o."paidAt" IS NOT NULL AND o."quoteId"=q."id"
    AND o."businessId"=h."businessId" AND o."campaignId"=c."id"
    AND o."currency"='INR' AND o."amountPaise"=q."totalPaise"
    AND c."status"='APPROVED'
    AND EXISTS (SELECT 1 FROM "PaymentAttempt" a
      WHERE a."paymentOrderId"=o."id" AND a."status"='SUCCESS'
        AND a."amountPaise"=o."amountPaise" AND a."currency"='INR')
 ) THEN RAISE EXCEPTION 'B15 verified paid booking is required'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER b15_plan_paid BEFORE INSERT ON "DeliveryPlan"
 FOR EACH ROW EXECUTE FUNCTION b15_validate_plan();
CREATE FUNCTION b15_window_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM "DeliveryPlan" p JOIN "InventorySlot" s
   ON s."holdId"=p."reservationHoldId"
   AND s."screenId"=NEW."screenId" AND s."serviceDate"=NEW."serviceDate"
  WHERE p."id"=NEW."planId" AND p."reservationHoldId"=NEW."holdId"
 ) THEN RAISE EXCEPTION 'B15 confirmed screen-day required'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER b15_window_allocated BEFORE INSERT ON "DeliveryWindow"
 FOR EACH ROW EXECUTE FUNCTION b15_window_capacity();
CREATE TRIGGER b15_windows_immutable BEFORE UPDATE OR DELETE ON "DeliveryWindow"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
