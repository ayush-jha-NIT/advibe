-- B4: admin MFA challenge state and replay-resistant TOTP secret records.
ALTER TABLE "Session" ADD COLUMN "mfaVerifiedAt" TIMESTAMPTZ(6);
CREATE TABLE "AdminMfaCredential" (
  "userId" UUID NOT NULL,
  "secretCipher" VARCHAR(500) NOT NULL,
  "enabledAt" TIMESTAMPTZ(6),
  "lastUsedStep" BIGINT NOT NULL DEFAULT -1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "AdminMfaCredential_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "AdminMfaCredential_step_check" CHECK ("lastUsedStep" >= -1)
);
CREATE TABLE "MfaLoginChallenge" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "consumedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaLoginChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaLoginChallenge_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5),
  CONSTRAINT "MfaLoginChallenge_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "MfaLoginChallenge_userId_consumedAt_expiresAt_idx"
  ON "MfaLoginChallenge"("userId", "consumedAt", "expiresAt");
CREATE INDEX "MfaLoginChallenge_expiresAt_idx" ON "MfaLoginChallenge"("expiresAt");
ALTER TABLE "AdminMfaCredential" ADD CONSTRAINT "AdminMfaCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MfaLoginChallenge" ADD CONSTRAINT "MfaLoginChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
