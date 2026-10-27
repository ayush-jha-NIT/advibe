/** Offline checklist validator. Never changes deploys, GitHub environments or provider flags. */
import fs from "node:fs";
const path=process.argv[2];
const expected=process.argv[3];
if(!path||!expected||!/^[a-f0-9]{40}$/i.test(expected)){
 console.error("Usage: node scripts/b23-approve-release.mjs <completed-evidence.json> <40-digit-reviewed-commit>");
 process.exit(2);
}
let doc;
try{doc=JSON.parse(fs.readFileSync(path,"utf8"));}catch{
 console.error("B23 release evidence is missing or invalid");process.exit(2);
}
const needed=["security","legalAndTax","dataPrivacy","restoreDrill",
 "stagingEndToEnd","monitoringAlerting","rollbackPlan"];
const evidenceNeeded=["stagingBrowserRun","stagingApiProbeRun","verifiedRenderDeploy",
 "verifiedVercelDeploy","encryptedBackupArtifactId","restoreDrillEvidenceId",
 "monitoringAlertTest","rollbackDrillEvidenceId"];
const approvals=doc?.approvals??{},evidence=doc?.evidence??{};
const valid=(s)=>typeof s==="string"&&s.trim().length>=8&&s.trim()!=="PENDING";
const failures=[];
if(doc?.releaseSha!==expected)failures.push("reviewed commit mismatch");
if(doc?.environment!=="production")failures.push("environment must be production");
for(const item of needed)if(approvals[item]!==true)failures.push("approval "+item);
for(const item of evidenceNeeded)if(!valid(evidence[item]))failures.push("evidence "+item);
for(const item of ["security","legalAndTax","operations","databaseRecovery"]){
 if(!valid(doc?.reviewers?.[item]))failures.push("reviewer "+item);
}
if(!Number.isFinite(Date.parse(doc?.verifiedAtUtc??""))||
 new Date(doc.verifiedAtUtc).getTime()>Date.now()||
 Date.now()-new Date(doc.verifiedAtUtc).getTime()>86400000*14)
 failures.push("fresh (<14 days) verifiedAtUtc");
if(failures.length){
 console.error("B23 release NOT APPROVED: "+failures.join("; "));
 process.exit(1);
}
console.log("B23 evidence shape and reviewed commit match. Actual signoffs MUST be independently verified by release owners.");
