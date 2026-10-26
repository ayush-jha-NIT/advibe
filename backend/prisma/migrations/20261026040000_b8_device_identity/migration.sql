-- B8: device identity, pair challenge, nonce/replay and empty signed manifest records.
CREATE TYPE "ScreenPlacement" AS ENUM ('BIKE_REAR','AUTO_REAR','AUTO_SIDE','CAR_REAR','CAR_INTERIOR','HELMET');
CREATE TYPE "ScreenState" AS ENUM ('UNPAIRED','PAIRED','REVOKED');
CREATE TABLE "Screen" (
 "id" UUID NOT NULL, "vehicleId" UUID NOT NULL, "placement" "ScreenPlacement" NOT NULL,
 "state" "ScreenState" NOT NULL DEFAULT 'UNPAIRED',
 "installationReference" VARCHAR(120) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "Screen_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Screen_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Screen_vehicleId_state_idx" ON "Screen"("vehicleId","state");
CREATE TABLE "DeviceCredential" (
 "id" UUID NOT NULL,"screenId" UUID NOT NULL,"publicKeySpki" VARCHAR(256) NOT NULL,
 "fingerprint" CHAR(64) NOT NULL,"pairedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "revokedAt" TIMESTAMPTZ(6),"updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "DeviceCredential_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceCredential_screenId_key" UNIQUE ("screenId"),
 CONSTRAINT "DeviceCredential_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DeviceCredential_fingerprint_check" CHECK ("fingerprint" ~ '^[a-f0-9]{64}$')
);
CREATE INDEX "DeviceCredential_fingerprint_idx" ON "DeviceCredential"("fingerprint");
CREATE TABLE "DevicePairingChallenge" (
 "id" UUID NOT NULL,"screenId" UUID NOT NULL,"adminUserId" UUID NOT NULL,
 "publicKeySpki" VARCHAR(256) NOT NULL,"nonce" VARCHAR(64) NOT NULL,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL,"consumedAt" TIMESTAMPTZ(6),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DevicePairingChallenge_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DevicePairingChallenge_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DevicePairingChallenge_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "DevicePairingChallenge_screenId_consumedAt_expiresAt_idx"
 ON "DevicePairingChallenge"("screenId","consumedAt","expiresAt");
CREATE INDEX "DevicePairingChallenge_expiresAt_idx" ON "DevicePairingChallenge"("expiresAt");
CREATE TABLE "DeviceRequestNonce" (
 "id" UUID NOT NULL,"credentialId" UUID NOT NULL,"nonce" VARCHAR(64) NOT NULL,
 "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DeviceRequestNonce_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceRequestNonce_credentialId_nonce_key" UNIQUE ("credentialId","nonce"),
 CONSTRAINT "DeviceRequestNonce_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "DeviceCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DeviceRequestNonce_receivedAt_idx" ON "DeviceRequestNonce"("receivedAt");
CREATE TABLE "DeviceHeartbeat" (
 "id" UUID NOT NULL,"credentialId" UUID NOT NULL,"deviceEventId" VARCHAR(128) NOT NULL,
 "observedAt" TIMESTAMPTZ(6) NOT NULL,"receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "firmwareVersion" VARCHAR(100) NOT NULL,
 CONSTRAINT "DeviceHeartbeat_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceHeartbeat_credentialId_deviceEventId_key" UNIQUE ("credentialId","deviceEventId"),
 CONSTRAINT "DeviceHeartbeat_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "DeviceCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DeviceHeartbeat_credentialId_receivedAt_idx" ON "DeviceHeartbeat"("credentialId","receivedAt");
CREATE TABLE "DeviceManifestVersion" (
 "id" UUID NOT NULL,"screenId" UUID NOT NULL,"version" INTEGER NOT NULL,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL,"entries" JSONB NOT NULL,"signature" VARCHAR(128) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DeviceManifestVersion_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceManifestVersion_screenId_version_key" UNIQUE ("screenId","version"),
 CONSTRAINT "DeviceManifestVersion_version_check" CHECK ("version" >= 1),
 CONSTRAINT "DeviceManifestVersion_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
