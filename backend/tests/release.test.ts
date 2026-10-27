import assert from "node:assert/strict";
import test from "node:test";
import {releaseGate} from "../src/ops/release.js";
const sample={
 NODE_ENV:"production",TRUST_PROXY:"true",
 AUTH_WEB_ORIGIN:"https://staging.example.test",
 CORS_ORIGINS:"https://staging.example.test",
 B23_RELEASE_STAGE:"staging",B23_STAGING_APPROVED:"true",
};
test("B23 refuses production listener unless explicit staging or release approvals",()=>{
 assert.deepEqual(releaseGate({NODE_ENV:"test"}),{mode:"development"});
 assert.throws(()=>releaseGate({NODE_ENV:"production"}),/B23_RELEASE_STAGE/);
 assert.throws(()=>releaseGate({...sample,TRUST_PROXY:"false"}),/trusted reverse proxy/);
 assert.throws(()=>releaseGate({...sample,B23_STAGING_APPROVED:"false"}),/B23_STAGING_APPROVED/);
 assert.throws(()=>releaseGate({...sample,AUTH_WEB_ORIGIN:"https://wrong.example.test"}),/AUTH_WEB_ORIGIN/);
 assert.deepEqual(releaseGate(sample),{mode:"staging"});
});
test("B23 staging cannot inadvertently activate money or device providers",()=>{
 for(const flag of ["PAYMENTS_ENABLED","B18_PAYOUTS_ENABLED","B19_REFUNDS_ENABLED",
  "DEVICE_PLAYBACK_ENABLED","BOOKING_HOLDS_ENABLED","CREATIVE_WORKER_ENABLED"]){
  assert.throws(()=>releaseGate({...sample,[flag]:"true"}),/staging may not enable/);
 }
});
test("B23 production needs explicit approvals pinned to same reviewed commit",()=>{
 const sha="a".repeat(40);
 const production={...sample,B23_RELEASE_STAGE:"production",B23_RELEASE_SHA:sha,
  B23_APPROVED_SHA:sha,B23_RELEASE_APPROVED:"true",B23_SECURITY_REVIEW_APPROVED:"true",
  B23_LEGAL_REVIEW_APPROVED:"true",B23_RESTORE_DRILL_VERIFIED:"true",
  B23_STAGING_E2E_VERIFIED:"true",B23_MONITORING_VERIFIED:"true",
  B23_ROLLBACK_PLAN_VERIFIED:"true"};
 assert.throws(()=>releaseGate({...sample,B23_RELEASE_STAGE:"production"}),/signoff missing/);
 assert.throws(()=>releaseGate({...production,B23_RESTORE_DRILL_VERIFIED:"false"}),/signoff missing/);
 assert.throws(()=>releaseGate({...production,B23_RELEASE_SHA:"wrong"}),/40-character commit/);
 assert.throws(()=>releaseGate({...production,B23_APPROVED_SHA:"b".repeat(40)}),/does not match/);
 assert.deepEqual(releaseGate(production),{mode:"production",sha});
});
