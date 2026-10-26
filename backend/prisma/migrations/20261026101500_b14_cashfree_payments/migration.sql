-- B14 Cashfree verified payment orders and append-only provider evidence.
CREATE TYPE "PaymentOrderState" AS ENUM ('CREATING','ACTIVE','PAID','PAID_UNALLOCATED','CANCELLED');
CREATE TYPE "PaymentAttemptState" AS ENUM ('SUCCESS','FAILED','PENDING','USER_DROPPED');
CREATE TABLE "PaymentOrder" (
 "id" UUID NOT NULL,"businessId" UUID NOT NULL,"campaignId" UUID NOT NULL,
 "quoteId" UUID NOT NULL,"reservationHoldId" UUID NOT NULL,"createdByUserId" UUID NOT NULL,
 "providerOrderId" VARCHAR(90) NOT NULL,"providerSessionId" VARCHAR(350),
 "currency" CHAR(3) NOT NULL DEFAULT 'INR',"amountPaise" BIGINT NOT NULL,
 "state" "PaymentOrderState" NOT NULL DEFAULT 'CREATING',
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 "paidAt" TIMESTAMPTZ(6),"requiresResolution" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PaymentOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PriceQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentOrder_reservationHoldId_fkey" FOREIGN KEY ("reservationHoldId") REFERENCES "ReservationHold"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentOrder_amount_check" CHECK ("amountPaise" BETWEEN 100 AND 9007199254740991),
 CONSTRAINT "PaymentOrder_currency_check" CHECK ("currency"='INR'),
 CONSTRAINT "PaymentOrder_paid_check" CHECK (("state" IN ('PAID','PAID_UNALLOCATED'))=("paidAt" IS NOT NULL)),
 CONSTRAINT "PaymentOrder_resolution_check" CHECK ("state"<>'PAID_UNALLOCATED' OR "requiresResolution"=true)
);
CREATE UNIQUE INDEX "PaymentOrder_reservationHoldId_key" ON "PaymentOrder"("reservationHoldId");
CREATE UNIQUE INDEX "PaymentOrder_providerOrderId_key" ON "PaymentOrder"("providerOrderId");
CREATE INDEX "PaymentOrder_businessId_createdAt_id_idx" ON "PaymentOrder"("businessId","createdAt","id");
CREATE INDEX "PaymentOrder_state_createdAt_idx" ON "PaymentOrder"("state","createdAt");
CREATE INDEX "PaymentOrder_requiresResolution_createdAt_idx" ON "PaymentOrder"("requiresResolution","createdAt");
CREATE TABLE "PaymentAttempt" (
 "id" UUID NOT NULL,"paymentOrderId" UUID NOT NULL,
 "providerPaymentId" VARCHAR(90) NOT NULL,"amountPaise" BIGINT NOT NULL,
 "currency" CHAR(3) NOT NULL,"status" "PaymentAttemptState" NOT NULL,
 "verifiedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PaymentAttempt_order_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentAttempt_valid_check" CHECK ("amountPaise">=0 AND "currency"='INR')
);
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentId_key" ON "PaymentAttempt"("providerPaymentId");
CREATE INDEX "PaymentAttempt_paymentOrderId_verifiedAt_idx" ON "PaymentAttempt"("paymentOrderId","verifiedAt");
CREATE TABLE "PaymentWebhookEvent" (
 "id" UUID NOT NULL,"paymentOrderId" UUID NOT NULL,
 "eventHash" CHAR(64) NOT NULL,"eventType" VARCHAR(80) NOT NULL,
 "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PaymentWebhookEvent_order_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentWebhookEvent_hash_check" CHECK ("eventHash" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventHash_key" ON "PaymentWebhookEvent"("eventHash");
CREATE INDEX "PaymentWebhookEvent_paymentOrderId_receivedAt_idx" ON "PaymentWebhookEvent"("paymentOrderId","receivedAt");
CREATE TRIGGER b14_payment_attempt_immutable BEFORE UPDATE OR DELETE ON "PaymentAttempt"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b14_payment_webhook_immutable BEFORE UPDATE OR DELETE ON "PaymentWebhookEvent"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
