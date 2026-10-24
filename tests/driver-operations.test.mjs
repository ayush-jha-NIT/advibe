import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {
 applicableDays,dateInIndia,driverAssignments,driverCampaignRows,driverDailySchedule,
 driverOperationsSummary,filteredDriverCampaigns,isISODate,moveDay,
 ownedDriverScreens,ownedDriverVehicles
} from "../src/features/driver/operations-model.ts";

test("vehicle and screen selectors enforce driver AND vehicle ownership",()=>{
 const db=createDemoSeed();
 assert.deepEqual(ownedDriverVehicles(db,"drv-1").map(x=>x.id),["veh-1"]);
 assert.deepEqual(ownedDriverScreens(db,"drv-1").map(x=>x.id),["scr-1","scr-2"]);
 assert.deepEqual(ownedDriverScreens(db,"drv-2").map(x=>x.id),["scr-3"]);
 assert.deepEqual(ownedDriverScreens(db,"not-provisioned"),[]);
 db.screens.push({...db.screens[0],id:"scr-forged",vehicleId:"veh-2",driverId:"drv-1"});
 assert.equal(ownedDriverScreens(db,"drv-1").some(s=>s.id==="scr-forged"),false);
});
test("only confirmed bookings AND assigned campaign screen IDs constitute work",()=>{
 const db=createDemoSeed();
 assert.deepEqual(driverAssignments(db,"drv-1").map(x=>x.booking.id),["bkg-1"]);
 assert.deepEqual(driverAssignments(db,"drv-2"),[]);
 const fake={...db,bookings:[...db.bookings,{...db.bookings[0],id:"bkg-tentative",screenId:"scr-2",status:"reserved"}]};
 assert.deepEqual(driverAssignments(fake,"drv-1").map(x=>x.booking.id),["bkg-1"]);
 const wrongIds={...db,campaigns:db.campaigns.map(c=>c.id==="cmp-1"?{...c,screenIds:["scr-2"]}:c)};
 assert.deepEqual(driverAssignments(wrongIds,"drv-1"),[]);
 const canceled={...db,campaigns:db.campaigns.map(c=>c.id==="cmp-1"?{...c,status:"cancelled"}:c)};
 assert.deepEqual(driverAssignments(canceled,"drv-1"),[]);
 const canceledBooking={...db,bookings:db.bookings.map(b=>({...b,status:"cancelled"}))};
 assert.deepEqual(driverAssignments(canceledBooking,"drv-1"),[]);
});
test("date helpers respect Indian civil calendar and reject invalid dates",()=>{
 assert.equal(dateInIndia(new Date("2026-10-24T19:00:00Z")),"2026-10-25");
 assert.equal(moveDay("2026-10-31",1),"2026-11-01");
 assert.equal(moveDay("2026-11-01",-1),"2026-10-31");
 assert.equal(isISODate("2026-02-30"),false);
 assert.equal(isISODate("2026-10-24"),true);
 assert.throws(()=>moveDay("2026-10-24",367),/Invalid/);
});
test("daily schedule respects booking and campaign date bounds and weekdays",()=>{
 const db=createDemoSeed(),rows=driverAssignments(db,"drv-1");
 assert.deepEqual(driverDailySchedule(rows,"2026-10-24").map(x=>x.booking.id),["bkg-1"]);
 assert.deepEqual(driverDailySchedule(rows,"2026-11-02"),[]);
 assert.deepEqual(driverDailySchedule(rows,"not-a-date"),[]);
 const original=rows[0].campaign;
 const weekday={...original,wizardDetails:{business:"Example",industry:"Retail",description:"",format:"auto_rear",weekdays:[1],startTime:"10:00",endTime:"16:00",playsPerDay:4}};
 assert.equal(applicableDays(weekday,"2026-10-26"),true);
 assert.equal(applicableDays(weekday,"2026-10-24"),false);
 assert.equal(driverDailySchedule([{...rows[0],campaign:weekday}],"2026-10-24").length,0);
 assert.equal(driverDailySchedule([{...rows[0],campaign:weekday}],"2026-10-26").length,1);
 assert.equal(driverDailySchedule([{...rows[0],campaign:{...weekday,status:"paused"}}],"2026-10-26").length,0);
});
test("campaigns are grouped by confirmed owned bookings, searchable by area and creative",()=>{
 const db=createDemoSeed(),rows=driverCampaignRows(driverAssignments(db,"drv-1"));
 assert.deepEqual(rows.map(r=>r.campaign.id),["cmp-1"]);
 assert.deepEqual(rows[0].assignments.map(a=>a.screen.id),["scr-1"]);
 assert.equal(filteredDriverCampaigns(rows,"Civil Lines","all").length,1);
 assert.equal(filteredDriverCampaigns(rows,"Festival Promotion","live").length,1);
 assert.equal(filteredDriverCampaigns(rows,"Festival Promotion","paused").length,0);
 assert.equal(filteredDriverCampaigns(rows,"unknown","all").length,0);
});
test("dashboard KPIs are owner-scoped and never substitute provisional inventory for booked ads",()=>{
 const db=createDemoSeed(),stats=driverOperationsSummary(db,"drv-1","2026-10-24");
 assert.deepEqual(stats,{
  vehicles:1,screens:2,onlineScreens:2,activeCampaigns:1,todayAssignments:1,
  unreadNotices:1,pendingPaise:28800
 });
 const other=driverOperationsSummary(db,"drv-2","2026-10-24");
 assert.equal(other.todayAssignments,0);
 assert.equal(other.screens,1);
 assert.equal(other.pendingPaise,0);
 const guest=driverOperationsSummary(db,"not-provisioned","2026-10-24");
 assert.equal(guest.todayAssignments,0);
 assert.equal(guest.unreadNotices,0);
});
