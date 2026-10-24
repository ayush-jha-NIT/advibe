import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {
 assertProvisionedDriver,driverNotices,driverTickets,maintenanceCategories,ownedMaintenanceScreen,ticketTextMatch,
 validateDriverIssue,validateDriverSupport
} from "../src/features/driver/service-model.ts";
const actor={role:"driver",accountId:"drv-1"};
const issue={screenId:"scr-1",category:"power",subject:"Sample screen not lit",description:"Simulated charging issue requiring a fictional inspection"};
test("maintenance issue requires an owned screen through an owned vehicle",()=>{
 const db=createDemoSeed();
 assert.equal(validateDriverIssue(db,actor,issue).screenId,"scr-1");
 assert.throws(()=>validateDriverIssue(db,actor,{...issue,screenId:"scr-3"}),/belonging/);
 assert.throws(()=>validateDriverIssue(db,{role:"advertiser",accountId:"adv-1"},issue),/provisioned/);
 assert.throws(()=>validateDriverIssue(db,actor,{...issue,category:"not-a-type"}),/valid issue/);
 assert.throws(()=>validateDriverIssue(db,actor,{...issue,description:"short"}),/15–1000/);
 db.screens[0].vehicleId="veh-2";
 assert.throws(()=>validateDriverIssue(db,actor,issue),/belonging/);
 assert.equal(ownedMaintenanceScreen(db,actor.accountId,"scr-1"),null);
});
test("only active, provisioned drivers can save a support report",()=>{
 const db=createDemoSeed();
 assert.doesNotThrow(()=>assertProvisionedDriver(db,actor));
 assert.throws(()=>assertProvisionedDriver(db,{role:"driver",accountId:"not-provisioned"}),/provisioned/);
 db.accounts.find(a=>a.id==="drv-1").active=false;
 assert.throws(()=>assertProvisionedDriver(db,actor),/provisioned/);
});
test("driver support validates topic, subject, description",()=>{
 const db=createDemoSeed();
 assert.deepEqual(maintenanceCategories,["screen_offline","screen_damage","power","mounting","other"]);
 const valid={category:"technical",subject:"  Screen help ",description:"A fictional display question with enough details"};
 assert.equal(validateDriverSupport(db,actor,valid).subject,"Screen help");
 assert.throws(()=>validateDriverSupport(db,actor,{...valid,subject:"No"}),/5–120/);
 assert.throws(()=>validateDriverSupport(db,actor,{...valid,category:"kyc"}),/category/);
 assert.throws(()=>validateDriverSupport(db,actor,{...valid,description:"short"}),/15–1200/);
});
test("ticket/notice retrieval is driver-scoped and handles legacy generic issue",()=>{
 const db=createDemoSeed();
 assert.deepEqual(driverTickets(db,"drv-1").map(x=>x.id),["tkt-1"]);
 assert.equal(driverTickets(db,"drv-2").length,0);
 assert.deepEqual(driverNotices(db,"drv-1").map(x=>x.id),["not-2"]);
 assert.deepEqual(driverNotices(db,"adv-1").map(x=>x.id),["not-1"]);
 assert.equal(ticketTextMatch(db.tickets[0],"maintenance"),true);
 assert.equal(ticketTextMatch(db.tickets[0],"not found"),false);
});
