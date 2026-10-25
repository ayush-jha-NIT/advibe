-- B3: atomic PostgreSQL-backed rate counters, shared across API instances.
CREATE TABLE "AuthThrottle" (
    "scope" VARCHAR(128) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("scope"),
    CONSTRAINT "AuthThrottle_nonnegative_hits_check" CHECK ("hits" >= 0)
);
CREATE INDEX "AuthThrottle_resetAt_idx" ON "AuthThrottle"("resetAt");

-- Expiry lookup is used by future cleanup jobs; existing constraints preserved.
CREATE INDEX "OtpChallenge_purpose_consumedAt_expiresAt_idx"
  ON "OtpChallenge"("purpose", "consumedAt", "expiresAt");
