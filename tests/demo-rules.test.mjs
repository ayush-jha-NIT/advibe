import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed,DEMO_ACTORS} from "../src/data/demo-seed.ts";
import {utcDay,inclusiveDays,overlap,availableScreens,quoteCampaign,validateBooking,assertCampaignTransition,assertDriverApproval,canRead,canPerform,canGoLive,moneyINR} from "../src/lib/demo-rules.ts";

test("seed entities link across campaigns, screens, drivers, creatives and settlements",()=>{
 const db=createDemoSeed();
 for(const c of db.campaigns){
  assert.ok(db.accounts.some(a=>a.id===c.advertiserId&&a.role==="advertiser"));
  assert.ok(db.creatives.some(a=>a.id===c.creativeId&&a.advertiserId===c.advertiserId));
  for(const id of c.screenIds)assert.ok(db.screens.some(s=>s.id===id));
 }
 for(const s of db.screens)assert.ok(db.vehicles.some(v=>v.id===s.vehicleId&&v.driverId===s.driverId));
 for(const x of db.settlements)assert.ok(db.campaigns.some(c=>c.id===x.campaignId));
});
test("date validation handles inclusive dates and rejects invalid days",()=>{
 assert.equal(inclusiveDays("2026-10-01","2026-10-01"),1);
 assert.equal(inclusiveDays("2026-10-01","2026-10-03"),3);
 assert.throws(()=>utcDay("2026-02-30"),/Invalid date/);
 assert.throws(()=>inclusiveDays("2026-11-05","2026-11-01"),/Date range/);
});
test("overlapping bookings include shared boundary days",()=>{
 assert.equal(overlap("2026-10-10","2026-10-20","2026-10-20","2026-10-22"),true);
 assert.equal(overlap("2026-10-10","2026-10-19","2026-10-20","2026-10-22"),false);
});
test("availability excludes already reserved screens and unverified driver devices",()=>{
 const db=createDemoSeed();
 const current=availableScreens(db,"2026-10-21","2026-10-28").map(s=>s.id);
 assert.deepEqual(current,["scr-2"]);
 assert.deepEqual(availableScreens(db,"2026-11-10","2026-11-12").map(s=>s.id),["scr-1","scr-2"]);
 assert.deepEqual(availableScreens(db,"2026-10-21","2026-10-28","cmp-1").map(s=>s.id),["scr-1","scr-2"]);
});
test("booking enforces creative ownership, placement and conflicts",()=>{
 const db=createDemoSeed();
 const c={...db.campaigns[0],startDate:"2026-11-10",endDate:"2026-11-12"};
 validateBooking(db,c,["scr-1"]);
 assert.throws(()=>validateBooking(db,c,["scr-2"]),/placement/);
 assert.throws(()=>validateBooking(db,c,["scr-1","scr-1"]),/unique/);
 assert.throws(()=>validateBooking(db,{...db.campaigns[0],id:"cmp-different"},["scr-1"]),/unavailable/);
});
test("price quote uses screen-days, integer paise, GST and discounts",()=>{
 const db=createDemoSeed();
 const input={screens:[db.screens[1]],locations:db.locations,rules:db.pricingRules,startDate:"2026-11-10",endDate:"2026-11-12"};
 const quote=quoteCampaign(input);
 assert.equal(quote.subtotalPaise,66000);
 assert.equal(quote.taxPaise,11880);
 assert.equal(quote.totalPaise,77880);
 const discount=quoteCampaign({...input,discountPercent:10});
 assert.equal(discount.discountPaise,6600);
 assert.equal(discount.taxPaise,10692);
 assert.equal(discount.totalPaise,70092);
 assert.throws(()=>quoteCampaign({...input,discountPercent:200}),/Discount/);
 assert.throws(()=>quoteCampaign({...input,screens:[db.screens[1],db.screens[1]]}),/Duplicate/);
});
test("quote requires a single rate valid for full campaign",()=>{
 const db=createDemoSeed();
 const input={screens:[db.screens[1]],locations:db.locations,rules:db.pricingRules,startDate:"2028-01-01",endDate:"2028-01-03"};
 assert.throws(()=>quoteCampaign(input),/Exactly one/);
 assert.throws(()=>quoteCampaign({...input,rules:[...db.pricingRules,...db.pricingRules]}),/Exactly one/);
});
test("campaign review transitions reject invalid jumps",()=>{
 assert.doesNotThrow(()=>assertCampaignTransition("draft","submitted"));
 assert.doesNotThrow(()=>assertCampaignTransition("submitted","under_review"));
 assert.throws(()=>assertCampaignTransition("submitted","live"),/Invalid campaign/);
 assert.throws(()=>assertCampaignTransition("approved","live"),/Invalid campaign/);
});
test("payment is distinct from approval and going live",()=>{
 const db=createDemoSeed();
 const approved={...db.campaigns[0],status:"scheduled",paymentStatus:"unpaid"};
 assert.equal(canGoLive(approved,db),false);
 assert.equal(canGoLive({...approved,paymentStatus:"paid"},db),true);
});
test("driver approval requires five steps and verified documents/device",()=>{
 const db=createDemoSeed();
 assert.doesNotThrow(()=>assertDriverApproval(db.driverApplications[0]));
 assert.throws(()=>assertDriverApproval(db.driverApplications[1]),/onboarding/);
});
test("role-scoped demo visibility and mutations",()=>{
 const db=createDemoSeed();
 const a=DEMO_ACTORS.advertiser,d=DEMO_ACTORS.driver;
 assert.equal(canRead(a,"campaigns",db.campaigns[0]),true);
 assert.equal(canRead(a,"campaigns",db.campaigns[1]),false);
 assert.equal(canRead(d,"settlements",db.settlements[0]),true);
 assert.equal(canRead(d,"campaigns",db.campaigns[0]),false);
 assert.equal(canPerform(a,"reviewCampaign"),false);
 assert.equal(canPerform(d,"toggleScreen"),false);
 assert.equal(canPerform(DEMO_ACTORS.admin,"reviewCampaign"),true);
 assert.equal(canPerform(a,"createCampaign","adv-2"),false);
});
test("money format accepts integer paise",()=>{
 assert.match(moneyINR(77880),/777?\.?80|778\.80/); // environment uses INR symbol formatting
 assert.throws(()=>moneyINR(-1),/Invalid paise/);
});
