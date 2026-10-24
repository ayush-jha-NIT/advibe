import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {assertDriverApproval,availableScreens} from "../src/lib/demo-rules.ts";
test("driver approval requires all five sample steps and two example review flags",()=>{
 const db=createDemoSeed();
 assert.doesNotThrow(()=>assertDriverApproval(db.driverApplications.find(a=>a.id==="app-1")));
 assert.throws(()=>assertDriverApproval(db.driverApplications.find(a=>a.id==="app-2")),/All onboarding/);
 assert.throws(()=>assertDriverApproval({...db.driverApplications[0],documentsStatus:"pending"}),/verified/);
 assert.throws(()=>assertDriverApproval({...db.driverApplications[0],completedSteps:4}),/verified/);
});
test("inventory eligibility requires screen, vehicle and app seeded approvals",()=>{
 const db=createDemoSeed();
 assert.deepEqual(availableScreens(db,"2026-11-14","2026-11-15").map(s=>s.id),["scr-1","scr-2"]);
 db.vehicles.find(v=>v.id==="veh-1").verification="pending";
 assert.deepEqual(availableScreens(db,"2026-11-14","2026-11-15"),[]);
});
