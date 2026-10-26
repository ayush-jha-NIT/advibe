-- B19 append-only monetary evidence; provider effects committed separately from local intent.
CREATE TYPE "RefundState" AS ENUM ('QUEUED','SUBMITTED','SUCCEEDED','NEEDS_REVIEW');
CREATE TYPE "ReconciliationState" AS ENUM ('MATCHED','MISMATCH');
CREATE TABLE "FinanceInvoiceSequence"(
 "financialYear" VARCHAR(4) NOT NULL PRIMARY KEY,
 "nextNumber" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "FinanceInvoiceSequence_positive" CHECK("nextNumber" BETWEEN 1 AND 1000000)
);
CREATE TABLE "FinanceInvoice"(
 "id" UUID NOT NULL PRIMARY KEY,"paymentOrderId" UUID NOT NULL UNIQUE,
 "businessId" UUID NOT NULL,"invoiceNumber" VARCHAR(16) NOT NULL UNIQUE,
 "financialYear" VARCHAR(4) NOT NULL,"issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "supplierName" VARCHAR(220) NOT NULL,"supplierAddress" VARCHAR(500) NOT NULL,
 "supplierGstin" CHAR(15) NOT NULL,"supplierStateCode" CHAR(2) NOT NULL,
 "recipientName" VARCHAR(220) NOT NULL,"recipientAddress" VARCHAR(500) NOT NULL,
 "recipientGstin" CHAR(15),"recipientStateCode" CHAR(2) NOT NULL,
 "placeOfSupplyCode" CHAR(2) NOT NULL,"sacCode" VARCHAR(12) NOT NULL,
 "description" VARCHAR(250) NOT NULL,"taxPolicyVersion" VARCHAR(80) NOT NULL,
 "taxMode" VARCHAR(12) NOT NULL,"subtotalPaise" BIGINT NOT NULL,
 "discountPaise" BIGINT NOT NULL,"taxablePaise" BIGINT NOT NULL,
 "cgstPaise" BIGINT NOT NULL,"sgstPaise" BIGINT NOT NULL,"igstPaise" BIGINT NOT NULL,
 "totalPaise" BIGINT NOT NULL,"createdByUserId" UUID NOT NULL,
 CONSTRAINT "FinanceInvoice_order_fkey" FOREIGN KEY("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinanceInvoice_business_fkey" FOREIGN KEY("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinanceInvoice_amount_check" CHECK(
 "subtotalPaise">=0 AND "discountPaise">=0 AND "taxablePaise">=0
 AND "cgstPaise">=0 AND "sgstPaise">=0 AND "igstPaise">=0 AND "totalPaise">0
 AND "subtotalPaise"-"discountPaise"="taxablePaise"
 AND "taxablePaise"+"cgstPaise"+"sgstPaise"+"igstPaise"="totalPaise"),
 CONSTRAINT "FinanceInvoice_tax_mode_check" CHECK(
 ("taxMode"='INTRA' AND "igstPaise"=0 AND "cgstPaise"+"sgstPaise">=0)
 OR ("taxMode"='INTER' AND "cgstPaise"=0 AND "sgstPaise"=0))
);
CREATE INDEX "FinanceInvoice_businessId_issuedAt_id_idx" ON "FinanceInvoice"("businessId","issuedAt","id");

CREATE TABLE "PaymentRefund"(
 "id" UUID NOT NULL PRIMARY KEY,"paymentOrderId" UUID NOT NULL,
 "providerRefundId" VARCHAR(100) NOT NULL UNIQUE,"amountPaise" BIGINT NOT NULL,
 "reason" VARCHAR(500) NOT NULL,"policyReference" VARCHAR(140) NOT NULL,
 "reviewedByUserId" UUID NOT NULL,"state" "RefundState" NOT NULL DEFAULT 'QUEUED',
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "succeededAt" TIMESTAMPTZ(6),
 CONSTRAINT "PaymentRefund_order_fkey" FOREIGN KEY("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentRefund_amount_check" CHECK("amountPaise">0)
);
CREATE INDEX "PaymentRefund_paymentOrderId_state_createdAt_idx" ON "PaymentRefund"("paymentOrderId","state","createdAt");
CREATE INDEX "PaymentRefund_state_createdAt_idx" ON "PaymentRefund"("state","createdAt");

CREATE TABLE "FinanceCreditNote"(
 "id" UUID NOT NULL PRIMARY KEY,"invoiceId" UUID NOT NULL,"refundId" UUID NOT NULL UNIQUE,
 "noteNumber" VARCHAR(16) NOT NULL UNIQUE,
 "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "amountPaise" BIGINT NOT NULL,"taxablePaise" BIGINT NOT NULL,
 "cgstPaise" BIGINT NOT NULL,"sgstPaise" BIGINT NOT NULL,"igstPaise" BIGINT NOT NULL,
 CONSTRAINT "FinanceCreditNote_invoice_fkey" FOREIGN KEY("invoiceId") REFERENCES "FinanceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinanceCreditNote_refund_fkey" FOREIGN KEY("refundId") REFERENCES "PaymentRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinanceCreditNote_amount_check" CHECK("amountPaise">0 AND "taxablePaise">=0
 AND "cgstPaise">=0 AND "sgstPaise">=0 AND "igstPaise">=0 AND
 "taxablePaise"+"cgstPaise"+"sgstPaise"+"igstPaise"="amountPaise")
);
CREATE INDEX "FinanceCreditNote_invoiceId_issuedAt_idx" ON "FinanceCreditNote"("invoiceId","issuedAt");

CREATE TABLE "FinanceReconciliationEvent"(
 "id" UUID NOT NULL PRIMARY KEY,
 "paymentOrderId" UUID NOT NULL,"providerOrderId" VARCHAR(90) NOT NULL,
 "state" "ReconciliationState" NOT NULL,
 "expectedPaise" BIGINT NOT NULL,"providerPaise" BIGINT NOT NULL,
 "verifiedPaymentsPaise" BIGINT NOT NULL,"confirmedRefundsPaise" BIGINT NOT NULL,
 "providerRefundsPaise" BIGINT NOT NULL,"evidenceHash" CHAR(64) NOT NULL UNIQUE,
 "checkedByUserId" UUID NOT NULL,"checkedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FinanceReconciliationEvent_order_fkey" FOREIGN KEY("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinanceReconciliationEvent_nonnegative" CHECK(
 "expectedPaise">=0 AND "providerPaise">=0 AND "verifiedPaymentsPaise">=0
 AND "confirmedRefundsPaise">=0 AND "providerRefundsPaise">=0)
);
CREATE INDEX "FinanceReconciliationEvent_paymentOrderId_checkedAt_idx" ON "FinanceReconciliationEvent"("paymentOrderId","checkedAt");
CREATE INDEX "FinanceReconciliationEvent_state_checkedAt_idx" ON "FinanceReconciliationEvent"("state","checkedAt");

CREATE TRIGGER b19_invoice_immutable BEFORE UPDATE OR DELETE ON "FinanceInvoice"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b19_credit_note_immutable BEFORE UPDATE OR DELETE ON "FinanceCreditNote"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b19_reconciliation_immutable BEFORE UPDATE OR DELETE ON "FinanceReconciliationEvent"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE FUNCTION b19_restrict_refund_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Refund ledger entries cannot be deleted'; END IF;
 IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."paymentOrderId" IS DISTINCT FROM OLD."paymentOrderId"
  OR NEW."providerRefundId" IS DISTINCT FROM OLD."providerRefundId"
  OR NEW."amountPaise" IS DISTINCT FROM OLD."amountPaise"
  OR NEW."reason" IS DISTINCT FROM OLD."reason"
  OR NEW."policyReference" IS DISTINCT FROM OLD."policyReference"
  OR NEW."reviewedByUserId" IS DISTINCT FROM OLD."reviewedByUserId"
  OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
  RAISE EXCEPTION 'Refund financial snapshot immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b19_refund_snapshot BEFORE UPDATE OR DELETE ON "PaymentRefund"
 FOR EACH ROW EXECUTE FUNCTION b19_restrict_refund_mutation();
