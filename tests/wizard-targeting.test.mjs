import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {addUniqueScreens,filterTargetScreens,staleScreenIds} from "../src/features/advertiser/targeting-helpers.ts";

test("filter screens by city, zone and case-insensitive locality or device ID",()=>{
 const db=createDemoSeed();
 assert.deepEqual(filterTargetScreens(db.screens,db.locations,{city:"Prayagraj",zone:"A",query:""}).map(x=>x.id),["scr-1"]);
 assert.deepEqual(filterTargetScreens(db.screens,db.locations,{city:"All cities",zone:"All zones",query:"KATRA"}).map(x=>x.id),["scr-2"]);
 assert.deepEqual(filterTargetScreens(db.screens,db.locations,{city:"All cities",zone:"All zones",query:"SCR-3"}).map(x=>x.id),["scr-3"]);
 assert.deepEqual(filterTargetScreens(db.screens,db.locations,{city:"Lucknow",zone:"All zones",query:""}),[]);
});
test("stale selection is detectable without silently erasing or duplicating IDs",()=>{
 const db=createDemoSeed();
 assert.deepEqual(staleScreenIds(["scr-1","scr-3","scr-3"],db.screens.slice(0,2)),["scr-3"]);
 assert.deepEqual(addUniqueScreens(["scr-1"],["scr-1","scr-2","scr-2"]),["scr-1","scr-2"]);
 assert.deepEqual(addUniqueScreens([],[]),[]);
});
