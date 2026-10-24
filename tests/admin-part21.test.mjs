import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {validateAccountChange,validateTicketTransition,adminKPIs,campaignStatusGroups,csvCell,adminCampaignCSV,adminAuditCSV} from "../src/features/admin/admin-governance-rules.ts";
const admin={role:"admin",accountId:"adm-1"};
test("demo account active changes protect administrator, ownership and no-op state",()=>{
 const db=createDemoSeed();
 assert.equal(validateAccountChange(db,admin,"adv-1",false).id,"adv-1");
 assert.throws(()=>validateAccountChange(db,admin,"adm-1",false),/cannot/);
 assert.throws(()=>validateAccountChange(db,admin,"adv-1",true),/already/);
 assert.throws(()=>validateAccountChange(db,{role:"driver",accountId:"drv-1"},"adv-1",false),/Admin/);
 assert.throws(()=>validateAccountChange(db,admin,"no-such",false),/not found/);
});
test("demo ticket workflow forbids illegal transitions and non-admin actions",()=>{
 const db=createDemoSeed();
 assert.equal(validateTicketTransition(db,admin,"tkt-1","in_progress").id,"tkt-1");
 assert.equal(validateTicketTransition(db,admin,"tkt-1","resolved").id,"tkt-1");
 assert.throws(()=>validateTicketTransition(db,admin,"tkt-1","open"),/Invalid/);
 assert.throws(()=>validateTicketTransition(db,{role:"advertiser",accountId:"adv-1"},"tkt-1","resolved"),/Admin/);
 assert.throws(()=>validateTicketTransition(db,admin,"not-found","resolved"),/not found/);
});
test("Admin metrics use only stored sample ledgers, never invented extra records",()=>{
 const db=createDemoSeed(),k=adminKPIs(db);
 assert.equal(k.accounts,5);assert.equal(k.drivers,2);assert.equal(k.advertisers,2);
 assert.equal(k.campaigns,3);assert.equal(k.sampleImpressions,48120);
 assert.equal(k.samplePaidPaise,188800);assert.equal(k.sampleRefundedPaise,0);
 assert.equal(k.sampleSettlementNetPaise,28800);
 assert.equal(k.unresolvedTickets,1);
 assert.deepEqual(campaignStatusGroups(db).map(x=>x.status),["draft","live","submitted"]);
});
test("sample CSV quote escaping avoids spreadsheet formula injection",()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
 assert.equal(csvCell("  +2+3"),'"\'  +2+3"');
 assert.equal(csvCell("Normal, Title"),'"Normal, Title"');
 const db=createDemoSeed();
 db.campaigns[0].title='=malicious("demo")';
 const csv=adminCampaignCSV(db);
 assert.match(csv,/'=malicious/);
 assert.match(csv,/DEMO DATA/);
 assert.match(adminAuditCSV(db),/DEMO AUDIT/);
});
