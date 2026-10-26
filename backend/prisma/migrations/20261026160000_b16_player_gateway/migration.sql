-- B16: telemetry claims never constitute billable or independently verified ad exposures.
ALTER TABLE "DeviceHeartbeat" ADD COLUMN "manifestVersion" INTEGER;
ALTER TABLE "DeviceHeartbeat" ADD COLUMN "playbackState" VARCHAR(30);
ALTER TABLE "DeviceHeartbeat" ADD CONSTRAINT "DeviceHeartbeat_manifest_version_check"
 CHECK ("manifestVersion" IS NULL OR "manifestVersion">=1);
ALTER TABLE "DeviceHeartbeat" ADD CONSTRAINT "DeviceHeartbeat_playback_state_check"
 CHECK ("playbackState" IS NULL OR "playbackState" IN ('IDLE','PLAYING','ERROR'));
CREATE TRIGGER b16_heartbeat_append_only BEFORE UPDATE OR DELETE ON "DeviceHeartbeat"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
CREATE TRIGGER b16_manifest_append_only BEFORE UPDATE OR DELETE ON "DeviceManifestVersion"
 FOR EACH ROW EXECUTE FUNCTION b11_reject_immutable_mutations();
