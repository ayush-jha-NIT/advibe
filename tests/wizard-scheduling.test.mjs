import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {availableScreens,countScheduledDays,quoteCampaign} from "../src/lib/demo-rules.ts";

test("weekdays count only requested active delivery days",()=>{
 assert.equal(countScheduledDays("2026-10-24","2026-10-26",[0,1,2,3,4,5,6]),3);
 assert.equal(countScheduledDays("2026-10-24","2026-10-26",[1]),1);
 assert.equal(countScheduledDays("2026-10-24","2026-10-26",[0,6]),2);
 assert.throws(()=>countScheduledDays("2026-10-24","2026-10-24",[1]),/weekdays do not occur/);
 assert.throws(()=>countScheduledDays("2026-10-24","2026-10-26",[0,0]),/valid unique/);
});
test("quote charges only selected screen-days with tax in paise",()=>{
 const db=createDemoSeed();
 const args={screens:[db.screens[0]],locations:db.locations,rules:db.pricingRules,startDate:"2026-11-02",endDate:"2026-11-08"};
 const all=quoteCampaign(args);
 const weekdays=quoteCampaign({...args,weekdays:[1,2,3,4,5]});
 assert.equal(all.lines[0].days,7);
 assert.equal(all.totalPaise,165200);
 assert.equal(weekdays.lines[0].days,5);
 assert.equal(weekdays.totalPaise,118000);
});
test("date-bound availability rejects conflicting bookings and unverified vehicles",()=>{
 const db=createDemoSeed();
 const overlapping=availableScreens(db,"2026-10-21","2026-10-28").map(s=>s.id);
 assert.deepEqual(overlapping,["scr-2"]);
 const free=availableScreens(db,"2026-11-02","2026-11-08").map(s=>s.id);
 assert.deepEqual(free,["scr-1","scr-2"]);
 assert.ok(!free.includes("scr-3"));
});
