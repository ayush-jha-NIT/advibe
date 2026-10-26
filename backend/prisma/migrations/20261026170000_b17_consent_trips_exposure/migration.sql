-- B17: opt-in, revocable trip telemetry and bounded privacy-preserving exposure aggregates.
CREATE TABLE "GpsConsent" (
 "id" UUID NOT NULL PRIMARY KEY,"driverUserId" UUID NOT NULL,"vehicleId" UUID NOT NULL,
 "purposeVersion" VARCHAR(100) NOT NULL,
 "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL,"revokedAt" TIMESTAMPTZ(6),
 CONSTRAINT "GpsConsent_driverUserId_fkey" FOREIGN KEY("driverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "GpsConsent_vehicle_owner_fkey" FOREIGN KEY("vehicleId","driverUserId") REFERENCES "Vehicle"("id","driverUserId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "GpsConsent_period_check" CHECK("expiresAt">"grantedAt"),
 CONSTRAINT "GpsConsent_revoked_check" CHECK("revokedAt" IS NULL OR "revokedAt">="grantedAt")
);
CREATE INDEX "GpsConsent_vehicleId_revokedAt_expiresAt_idx" ON "GpsConsent"("vehicleId","revokedAt","expiresAt");
CREATE INDEX "GpsConsent_driverUserId_grantedAt_idx" ON "GpsConsent"("driverUserId","grantedAt");
CREATE TABLE "TripSession" (
 "id" UUID NOT NULL PRIMARY KEY,"vehicleId" UUID NOT NULL,"screenId" UUID NOT NULL,
 "consentGrantId" UUID NOT NULL,"startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "endedAt" TIMESTAMPTZ(6),
 CONSTRAINT "TripSession_vehicleId_fkey" FOREIGN KEY("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "TripSession_screenId_fkey" FOREIGN KEY("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "TripSession_consentGrantId_fkey" FOREIGN KEY("consentGrantId") REFERENCES "GpsConsent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "TripSession_time_check" CHECK("endedAt" IS NULL OR "endedAt">="startedAt")
);
CREATE UNIQUE INDEX "b17_one_active_trip_per_vehicle" ON "TripSession"("vehicleId") WHERE "endedAt" IS NULL;
CREATE INDEX "TripSession_vehicleId_startedAt_idx" ON "TripSession"("vehicleId","startedAt");
CREATE INDEX "TripSession_screenId_startedAt_idx" ON "TripSession"("screenId","startedAt");
CREATE TABLE "GpsSample" (
 "id" UUID NOT NULL PRIMARY KEY,"tripId" UUID NOT NULL,"credentialId" UUID NOT NULL,
 "eventId" VARCHAR(128) NOT NULL,"observedAt" TIMESTAMPTZ(6) NOT NULL,
 "latitude" DOUBLE PRECISION NOT NULL,"longitude" DOUBLE PRECISION NOT NULL,
 "accuracyMeters" DOUBLE PRECISION NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GpsSample_tripId_fkey" FOREIGN KEY("tripId") REFERENCES "TripSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "GpsSample_credentialId_fkey" FOREIGN KEY("credentialId") REFERENCES "DeviceCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "GpsSample_position_check" CHECK("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180),
 CONSTRAINT "GpsSample_accuracy_check" CHECK("accuracyMeters">=0 AND "accuracyMeters"<=100)
);
CREATE UNIQUE INDEX "GpsSample_credentialId_eventId_key" ON "GpsSample"("credentialId","eventId");
CREATE INDEX "GpsSample_tripId_observedAt_idx" ON "GpsSample"("tripId","observedAt");
CREATE INDEX "GpsSample_createdAt_idx" ON "GpsSample"("createdAt");
CREATE TABLE "PlaybackProof" (
 "id" UUID NOT NULL PRIMARY KEY,"tripId" UUID NOT NULL,"credentialId" UUID NOT NULL,
 "screenId" UUID NOT NULL,"campaignId" UUID NOT NULL,"creativeId" UUID NOT NULL,
 "zoneId" UUID NOT NULL,"manifestVersion" INTEGER NOT NULL,
 "eventId" VARCHAR(128) NOT NULL,"playedAt" TIMESTAMPTZ(6) NOT NULL,
 "durationMs" INTEGER NOT NULL,"slotBucket" TIMESTAMPTZ(6) NOT NULL,
 "methodVersion" VARCHAR(40) NOT NULL DEFAULT 'b17-v1',
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PlaybackProof_tripId_fkey" FOREIGN KEY("tripId") REFERENCES "TripSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_credentialId_fkey" FOREIGN KEY("credentialId") REFERENCES "DeviceCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_screenId_fkey" FOREIGN KEY("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_campaignId_fkey" FOREIGN KEY("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_creativeId_fkey" FOREIGN KEY("creativeId") REFERENCES "Creative"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_zoneId_fkey" FOREIGN KEY("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PlaybackProof_manifest_check" CHECK("manifestVersion">=1),
 CONSTRAINT "PlaybackProof_duration_check" CHECK("durationMs" BETWEEN 1000 AND 60000)
);
CREATE UNIQUE INDEX "PlaybackProof_credentialId_eventId_key" ON "PlaybackProof"("credentialId","eventId");
CREATE UNIQUE INDEX "PlaybackProof_screenId_slotBucket_key" ON "PlaybackProof"("screenId","slotBucket");
CREATE INDEX "PlaybackProof_campaignId_playedAt_idx" ON "PlaybackProof"("campaignId","playedAt");
CREATE INDEX "PlaybackProof_tripId_playedAt_idx" ON "PlaybackProof"("tripId","playedAt");
CREATE TABLE "ExposureAggregate" (
 "id" UUID NOT NULL PRIMARY KEY,
 "campaignId" UUID NOT NULL,"businessId" UUID NOT NULL,"zoneId" UUID NOT NULL,
 "serviceDate" DATE NOT NULL,"qualifiedPlaybackCount" INTEGER NOT NULL DEFAULT 0,
 "methodVersion" VARCHAR(40) NOT NULL DEFAULT 'b17-v1',
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "ExposureAggregate_campaignId_fkey" FOREIGN KEY("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ExposureAggregate_businessId_fkey" FOREIGN KEY("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ExposureAggregate_zoneId_fkey" FOREIGN KEY("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ExposureAggregate_count_check" CHECK("qualifiedPlaybackCount">=0)
);
CREATE UNIQUE INDEX "ExposureAggregate_campaignId_zoneId_serviceDate_methodVersion_key"
 ON "ExposureAggregate"("campaignId","zoneId","serviceDate","methodVersion");
CREATE INDEX "ExposureAggregate_businessId_serviceDate_idx" ON "ExposureAggregate"("businessId","serviceDate");
CREATE TRIGGER b17_playback_proof_immutable BEFORE UPDATE OR DELETE ON "PlaybackProof"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
-- GPS raw samples remain deleteable ONLY for privacy retention / erasure.
-- No IP, identity, or exact GPS coordinates are exposed to advertiser reporting.
