-- B13: transactional, exclusive full-screen calendar-day inventory holds.
CREATE TYPE "ReservationHoldState" AS ENUM ('HELD','EXPIRED','RELEASED','CONFIRMED');
CREATE TABLE "ReservationHold" (
 "id" UUID NOT NULL,"businessId" UUID NOT NULL,"campaignId" UUID NOT NULL,
 "quoteId" UUID NOT NULL,"createdByUserId" UUID NOT NULL,
 "state" "ReservationHoldState" NOT NULL DEFAULT 'HELD',
 "expiresAt" TIMESTAMPTZ(6) NOT NULL,"releasedAt" TIMESTAMPTZ(6),
 "confirmedAt" TIMESTAMPTZ(6),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "ReservationHold_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ReservationHold_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ReservationHold_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ReservationHold_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PriceQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ReservationHold_expiry_check" CHECK ("expiresAt">"createdAt"),
 CONSTRAINT "ReservationHold_released_check" CHECK ("state"<>'RELEASED' OR "releasedAt" IS NOT NULL),
 CONSTRAINT "ReservationHold_confirmed_check" CHECK (("state"='CONFIRMED')=("confirmedAt" IS NOT NULL))
);
CREATE INDEX "ReservationHold_businessId_createdAt_id_idx" ON "ReservationHold"("businessId","createdAt","id");
CREATE INDEX "ReservationHold_campaignId_createdAt_id_idx" ON "ReservationHold"("campaignId","createdAt","id");
CREATE INDEX "ReservationHold_state_expiresAt_idx" ON "ReservationHold"("state","expiresAt");
CREATE TABLE "ReservationHoldItem" (
 "id" UUID NOT NULL,"holdId" UUID NOT NULL,"screenId" UUID NOT NULL,
 "serviceDate" DATE NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ReservationHoldItem_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ReservationHoldItem_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "ReservationHold"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ReservationHoldItem_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReservationHoldItem_holdId_screenId_serviceDate_key" ON "ReservationHoldItem"("holdId","screenId","serviceDate");
CREATE INDEX "ReservationHoldItem_screenId_serviceDate_idx" ON "ReservationHoldItem"("screenId","serviceDate");
CREATE TABLE "InventorySlot" (
 "screenId" UUID NOT NULL,"serviceDate" DATE NOT NULL,"holdId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "InventorySlot_pkey" PRIMARY KEY ("screenId","serviceDate"),
 CONSTRAINT "InventorySlot_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "InventorySlot_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "ReservationHold"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventorySlot_holdId_idx" ON "InventorySlot"("holdId");
-- Historical allocation evidence is immutable even after active capacity is released.
CREATE TRIGGER b13_hold_items_immutable BEFORE UPDATE OR DELETE ON "ReservationHoldItem"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
-- Fail closed at DB boundary: a CONFIRMED hold must keep all its allocations.
CREATE OR REPLACE FUNCTION b13_guard_slot_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "ReservationHold" h WHERE h."id"=OLD."holdId" AND h."state"='CONFIRMED') THEN
  RAISE EXCEPTION 'Cannot release capacity of a confirmed booking';
 END IF;
 RETURN OLD;
END; $$;
CREATE TRIGGER b13_no_delete_confirmed BEFORE DELETE ON "InventorySlot"
 FOR EACH ROW EXECUTE FUNCTION b13_guard_slot_delete();
