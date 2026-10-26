CREATE TYPE "SupportCategory" AS ENUM ('GENERAL','BILLING','DEVICE');
CREATE TYPE "SupportStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE "TicketMessageVisibility" AS ENUM ('PUBLIC','INTERNAL');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED');
CREATE TYPE "NotificationKind" AS ENUM ('SUPPORT','MAINTENANCE');
CREATE TYPE "JobState" AS ENUM ('PENDING','LEASED','COMPLETED','DEAD');
CREATE TABLE "SupportTicket" (
 "id" UUID NOT NULL PRIMARY KEY,"createdByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "businessId" UUID REFERENCES "Business"("id") ON DELETE RESTRICT,
 "screenId" UUID REFERENCES "Screen"("id") ON DELETE RESTRICT,
 "category" "SupportCategory" NOT NULL,"status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
 "subject" VARCHAR(160) NOT NULL,"description" VARCHAR(2000) NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,"assignedToUserId" UUID REFERENCES "User"("id") ON DELETE RESTRICT,
 "resolvedAt" TIMESTAMPTZ(6),"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportTicket_version_check" CHECK ("version">=1),
 CONSTRAINT "SupportTicket_scope_check" CHECK (NOT ("businessId" IS NOT NULL AND "screenId" IS NOT NULL))
);
CREATE INDEX "SupportTicket_createdByUserId_createdAt_id_idx" ON "SupportTicket"("createdByUserId","createdAt","id");
CREATE INDEX "SupportTicket_businessId_createdAt_id_idx" ON "SupportTicket"("businessId","createdAt","id");
CREATE INDEX "SupportTicket_status_createdAt_id_idx" ON "SupportTicket"("status","createdAt","id");
CREATE TABLE "SupportMessage" (
 "id" UUID NOT NULL PRIMARY KEY,"ticketId" UUID NOT NULL REFERENCES "SupportTicket"("id") ON DELETE RESTRICT,
 "authorUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "visibility" "TicketMessageVisibility" NOT NULL DEFAULT 'PUBLIC',
 "body" VARCHAR(2000) NOT NULL,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SupportMessage_ticketId_createdAt_id_idx" ON "SupportMessage"("ticketId","createdAt","id");
CREATE TABLE "ScreenMaintenance"(
 "id" UUID NOT NULL PRIMARY KEY,"ticketId" UUID NOT NULL UNIQUE REFERENCES "SupportTicket"("id") ON DELETE RESTRICT,
 "screenId" UUID NOT NULL REFERENCES "Screen"("id") ON DELETE RESTRICT,
 "openedByUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "state" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
 "resolutionNote" VARCHAR(1500),"openedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "resolvedAt" TIMESTAMPTZ(6)
);
CREATE INDEX "ScreenMaintenance_screenId_state_idx" ON "ScreenMaintenance"("screenId","state");
CREATE UNIQUE INDEX "b20_one_active_maintenance_per_screen" ON "ScreenMaintenance"("screenId") WHERE "state" <> 'RESOLVED';
CREATE TABLE "UserNotification" (
 "id" UUID NOT NULL PRIMARY KEY,
 "recipientUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "ticketId" UUID NOT NULL REFERENCES "SupportTicket"("id") ON DELETE RESTRICT,
 "kind" "NotificationKind" NOT NULL,"dedupeKey" VARCHAR(160) NOT NULL UNIQUE,
 "title" VARCHAR(120) NOT NULL,"body" VARCHAR(300) NOT NULL,
 "readAt" TIMESTAMPTZ(6),"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UserNotification_recipientUserId_createdAt_id_idx" ON "UserNotification"("recipientUserId","createdAt","id");
CREATE INDEX "UserNotification_recipientUserId_readAt_createdAt_idx" ON "UserNotification"("recipientUserId","readAt","createdAt");
CREATE TABLE "DurableJob"(
 "id" UUID NOT NULL PRIMARY KEY,"dedupeKey" VARCHAR(160) NOT NULL UNIQUE,
 "recipientUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "ticketId" UUID NOT NULL REFERENCES "SupportTicket"("id") ON DELETE RESTRICT,
 "kind" "NotificationKind" NOT NULL,"title" VARCHAR(120) NOT NULL,"body" VARCHAR(300) NOT NULL,
 "state" "JobState" NOT NULL DEFAULT 'PENDING',"attempts" INTEGER NOT NULL DEFAULT 0,
 "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"leaseToken" UUID,
 "leaseUntil" TIMESTAMPTZ(6),"lastError" VARCHAR(160),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMPTZ(6),
 CONSTRAINT "DurableJob_attempts_check" CHECK("attempts" BETWEEN 0 AND 5)
);
CREATE INDEX "DurableJob_state_availableAt_leaseUntil_idx" ON "DurableJob"("state","availableAt","leaseUntil");
CREATE TRIGGER b20_message_immutable BEFORE UPDATE OR DELETE ON "SupportMessage"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b20_notification_no_delete BEFORE DELETE ON "UserNotification"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
