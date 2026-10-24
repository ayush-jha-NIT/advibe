import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {
 driverSettlements,filteredDriverSettlements,monthlySettlementSeries,
 settlementCSV,settlementNet,settlementSummary
} from "../src/features/driver/finance-model.ts";
test("financial rows belong only to the requested driver with a linked campaign",()=>{
 const db=createDemoSeed();
 db.settlements.push({...db.settlements[0],id:"set-2",driverId:"drv-2"});
 db.settlements.push({...db.settlements[0],id:"invalid-link",campaignId:"missing"});
 assert.deepEqual(driverSettlements(db,"drv-1").map(x=>x.id),["set-1"]);
 assert.deepEqual(driverSettlements(db,"drv-2").map(x=>x.id),["set-2"]);
 assert.deepEqual(driverSettlements(db,"unprovisioned"),[]);
});
test("gross, deductions and net use paise integers and status buckets correctly",()=>{
 const db=createDemoSeed(),pending=driverSettlements(db,"drv-1")[0];
 assert.equal(settlementNet(pending),28800);
 assert.deepEqual(settlementSummary([pending]),{
  total:1,grossPaise:32000,deductionsPaise:3200,netPaise:28800,pendingPaise:28800,
  processedPaise:0,failedPaise:0
 });
 const paid={...pending,id:"p2",status:"processed",grossPaise:13000,deductionsPaise:3000};
 const failed={...pending,id:"p3",status:"failed",grossPaise:1500,deductionsPaise:0};
 const sum=settlementSummary([pending,paid,failed]);
 assert.equal(sum.netPaise,40300);assert.equal(sum.processedPaise,10000);
 assert.equal(sum.failedPaise,1500);
 assert.throws(()=>settlementNet({...pending,deductionsPaise:40000}),/Invalid/);
 assert.throws(()=>settlementNet({...pending,grossPaise:0.1}),/Invalid/);
});
test("period filters are overlapping and status and campaign search work",()=>{
 const db=createDemoSeed(),rows=driverSettlements(db,"drv-1");
 assert.equal(filteredDriverSettlements(rows,db,"festival","pending","2026-10-24","2026-10-26").length,1);
 assert.equal(filteredDriverSettlements(rows,db,"Festival","processed","","").length,0);
 assert.equal(filteredDriverSettlements(rows,db,"","all","2026-10-28","").length,0);
 assert.equal(filteredDriverSettlements(rows,db,"","all","","2026-10-20").length,0);
 assert.equal(filteredDriverSettlements(rows,db,"set-1","all","","").length,1);
});
test("monthly grouping uses period end, never invents a payment date",()=>{
 const db=createDemoSeed(),rows=driverSettlements(db,"drv-1");
 assert.deepEqual(monthlySettlementSeries(rows),[{month:"2026-10",pending:288,processed:0,failed:0}]);
 const csv=settlementCSV(rows,db);
 assert.match(csv,/DEMO RECORDS ONLY/);
 assert.match(csv,/288.00/);
 assert.match(csv,/Festival Week/);
 assert.doesNotMatch(csv,/transfer reference|payout date/i);
});
