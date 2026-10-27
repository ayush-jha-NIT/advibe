import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
const read=p=>fs.readFileSync(p,"utf8");
test("B23 release documents are safe by default and cannot claim approval",()=>{
 const template=JSON.parse(read("ops/b23-release-evidence.template.json"));
 assert.equal(template.releaseSha,null);
 assert.equal(template.approvals.security,false);
 assert.equal(template.approvals.cashfreeLiveProcessing,false);
 assert.equal(template.approvals.payoutProvider,false);
 assert.match(read("render.yaml"),/autoDeployTrigger: "off"/);
 assert.match(read("render.yaml"),/healthCheckPath: \/api\/v1\/ready/);
 assert.match(read("render.yaml"),/B23_RELEASE_STAGE/);
 assert.match(read("render.yaml"),/B23_STAGING_APPROVED/);
 assert.doesNotMatch(read("render.yaml"),/CASHFREE_CLIENT_SECRET:[^\n]+/);
 const d=spawnSync(process.execPath,["scripts/b23-approve-release.mjs",
  "ops/b23-release-evidence.template.json","a".repeat(40)],{encoding:"utf8"});
 assert.equal(d.status,1);
 assert.match(d.stderr,/release NOT APPROVED/);
});
test("B23 scripts never run automatic destructive recovery or output raw database dump",()=>{
 const backup=read("backend/scripts/backup-encrypted.sh");
 const drill=read("backend/scripts/restore-drill.sh");
 assert.match(backup,/pg_dump/);
 assert.match(backup,/age -r/);
 assert.match(backup,/umask 077/);
 assert.match(drill,/YES_DISPOSABLE_DATABASE/);
 assert.match(drill,/pg_restore --exit-on-error/);
 assert.doesNotMatch(drill,/DROP DATABASE|--clean/);
 assert.match(read(".github/workflows/b23-staging-monitor.yml"),/workflow_dispatch/);
 assert.match(read(".github/workflows/b23-staging-monitor.yml"),/b23-staging-probe\.mjs/);
});
test("B23 read-only probes and readiness never advertise legal or payment approval",()=>{
 const health=read("src/app/api/health/route.ts");
 const ready=read("src/app/api/ready/route.ts");
 const probe=read("scripts/b23-staging-probe.mjs");
 assert.match(health,/productionIntegrationsReady:false/);
 assert.match(ready,/backendDependency/);
 assert.match(ready,/\/api\/v1\/ready/);
 assert.match(probe,/auth\/session/);
 assert.match(probe,/redirect:"manual"/);
 assert.doesNotMatch(probe,/webhooks\/cashfree|payments\/orders/);
});
