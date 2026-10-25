-- B6. Only drafts, owned vehicle references and submission; B7 controls verification.
CREATE TYPE "DriverApplicationState" AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CHANGES_REQUESTED');
CREATE TYPE "DriverExperience" AS ENUM ('NEW','UNDER_ONE','ONE_TO_THREE','OVER_THREE');
CREATE TYPE "VehicleType" AS ENUM ('BIKE','AUTO','CAR');
CREATE TYPE "VehicleVerification" AS ENUM ('PENDING','UNDER_REVIEW','APPROVED','REJECTED');

CREATE TABLE "Vehicle" (
  "id" UUID NOT NULL,
  "driverUserId" UUID NOT NULL,
  "type" "VehicleType" NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "year" INTEGER NOT NULL,
  "registrationTokenHash" CHAR(64),
  "verification" "VehicleVerification" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vehicle_id_driverUserId_key" UNIQUE ("id", "driverUserId"),
  CONSTRAINT "Vehicle_year_check" CHECK ("year" BETWEEN 1990 AND 2100),
  CONSTRAINT "Vehicle_registrationTokenHash_check"
    CHECK ("registrationTokenHash" IS NULL OR "registrationTokenHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "Vehicle_driverUserId_fkey" FOREIGN KEY ("driverUserId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Vehicle_registrationTokenHash_key" ON "Vehicle"("registrationTokenHash");
CREATE INDEX "Vehicle_driverUserId_createdAt_id_idx" ON "Vehicle"("driverUserId","createdAt","id");

CREATE TABLE "DriverApplication" (
  "id" UUID NOT NULL,
  "driverUserId" UUID NOT NULL,
  "state" "DriverApplicationState" NOT NULL DEFAULT 'DRAFT',
  "completedStep" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "city" VARCHAR(100),
  "experience" "DriverExperience",
  "vehicleId" UUID,
  "vehicleCategory" "VehicleType",
  "screenChoice" VARCHAR(80),
  "agreementTemplateVersion" VARCHAR(100),
  "confirmedReadiness" BOOLEAN NOT NULL DEFAULT FALSE,
  "submittedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "DriverApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverApplication_step_check" CHECK ("completedStep" BETWEEN 0 AND 5),
  CONSTRAINT "DriverApplication_version_check" CHECK ("version" >= 0),
  CONSTRAINT "DriverApplication_submission_check"
    CHECK ((("state" = 'DRAFT') AND ("submittedAt" IS NULL)) OR
      (("state" <> 'DRAFT') AND ("submittedAt" IS NOT NULL))),
  CONSTRAINT "DriverApplication_vehicleCategory_requires_vehicle_check"
    CHECK ("vehicleId" IS NULL OR "vehicleCategory" IS NOT NULL),
  CONSTRAINT "DriverApplication_driverUserId_fkey" FOREIGN KEY ("driverUserId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DriverApplication_vehicleId_driverUserId_fkey"
    FOREIGN KEY ("vehicleId","driverUserId")
    REFERENCES "Vehicle"("id","driverUserId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DriverApplication_driverUserId_createdAt_id_idx"
  ON "DriverApplication"("driverUserId","createdAt","id");
CREATE INDEX "DriverApplication_state_submittedAt_idx"
  ON "DriverApplication"("state","submittedAt");
-- Concurrent creates cannot give a driver two simultaneous drafts.
CREATE UNIQUE INDEX "DriverApplication_one_active_draft_per_driver"
  ON "DriverApplication"("driverUserId") WHERE "state" = 'DRAFT';
