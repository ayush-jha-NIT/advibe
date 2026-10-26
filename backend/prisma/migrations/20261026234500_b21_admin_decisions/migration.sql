-- B21 audited account decisions are append-only and cannot grant admin role.
CREATE TABLE "AccountStatusDecision" (
 "id" UUID NOT NULL PRIMARY KEY,
 "subjectUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "administratorUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "previousStatus" "AccountStatus" NOT NULL,
 "newStatus" "AccountStatus" NOT NULL,
 "reason" VARCHAR(500) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AccountStatusDecision_transition_check" CHECK (
  ("previousStatus"='ACTIVE' AND "newStatus"='SUSPENDED')
  OR ("previousStatus"='SUSPENDED' AND "newStatus"='ACTIVE')),
 CONSTRAINT "AccountStatusDecision_distinct_check" CHECK ("subjectUserId"<>"administratorUserId"),
 CONSTRAINT "AccountStatusDecision_reason_check" CHECK(char_length(trim("reason")) BETWEEN 20 AND 500)
);
CREATE INDEX "AccountStatusDecision_subjectUserId_createdAt_id_idx"
 ON "AccountStatusDecision"("subjectUserId","createdAt","id");
CREATE INDEX "AccountStatusDecision_administratorUserId_createdAt_id_idx"
 ON "AccountStatusDecision"("administratorUserId","createdAt","id");
CREATE TRIGGER b21_decision_immutable BEFORE UPDATE OR DELETE ON "AccountStatusDecision"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE INDEX "AuditEvent_createdAt_id_idx" ON "AuditEvent"("createdAt","id");
CREATE INDEX "AuditEvent_action_createdAt_id_idx" ON "AuditEvent"("action","createdAt","id");
