import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {assertCreativeEdit,displayEligibility,filterCreativeLibrary,findOwnedCreative,formatDescriptions,placements,sampleRate,validateCreativeDraft} from "../src/features/advertiser/library-model.ts";

test("creative library only returns records from the current advertiser",()=>{
 const db=createDemoSeed();
 assert.deepEqual(filterCreativeLibrary(db.creatives,"adv-1").map(x=>x.id),["crt-1","crt-3"]);
 assert.deepEqual(filterCreativeLibrary(db.creatives,"adv-2").map(x=>x.id),["crt-2"]);
 assert.equal(findOwnedCreative(db,"adv-1","crt-2"),null);
 assert.deepEqual(filterCreativeLibrary(db.creatives,"adv-1",{format:"video"}).map(x=>x.id),["crt-3"]);
 assert.deepEqual(filterCreativeLibrary(db.creatives,"adv-1",{placement:"auto_rear",query:"FESTIVAL"}).map(x=>x.id),["crt-1"]);
 assert.deepEqual(filterCreativeLibrary(db.creatives,"adv-1",{approval:"approved"}).map(x=>x.id),["crt-1"]);
});
test("creative metadata validates title, placement and supported media types",()=>{
 assert.deepEqual(validateCreativeDraft({title:"  Brand   Story  ",format:"gif",placement:"auto_side"}),{title:"Brand Story",format:"gif",placement:"auto_side"});
 assert.throws(()=>validateCreativeDraft({title:"Hi",format:"image",placement:"auto_rear"}),/3–100/);
 assert.throws(()=>validateCreativeDraft({title:"Video launch",format:"pdf",placement:"auto_rear"}),/Choose PNG/);
 assert.throws(()=>validateCreativeDraft({title:"Test campaign",format:"video",placement:"made-up"}),/supported/);
 assert.equal(placements.length,6);
 assert.equal(formatDescriptions.helmet.group,"helmet");
});
test("pending metadata edit requires account ownership and no linked campaign",()=>{
 const db=createDemoSeed(),a={role:"advertiser",accountId:"adv-1"},b={role:"advertiser",accountId:"adv-2"};
 assert.throws(()=>assertCreativeEdit(db,b,"crt-3"),/unavailable/);
 assert.throws(()=>assertCreativeEdit(db,a,"crt-1"),/Only pending/);
 assert.throws(()=>assertCreativeEdit(db,a,"crt-3"),/linked to a campaign/);
 db.creatives.push({id:"crt-new",advertiserId:"adv-1",title:"Open draft",format:"image",placement:"helmet",approval:"pending"});
 assert.equal(assertCreativeEdit(db,a,"crt-new").id,"crt-new");
});
test("sample rate comes only from one active rule applicable to the date",()=>{
 const db=createDemoSeed();
 assert.equal(sampleRate(db,"auto_rear","Prayagraj","2026-10-24"),200);
 assert.equal(sampleRate(db,"auto_rear","Lucknow","2026-10-24"),null);
 assert.equal(sampleRate(db,"auto_rear","Prayagraj","2028-01-01"),null);
 assert.equal(sampleRate(db,"auto_side","Lucknow","2026-10-24"),240);
});
test("demo eligibility distinguishes booked, unverified and offline",()=>{
 const db=createDemoSeed();
 assert.equal(displayEligibility(db,db.screens[0],"2026-10-24","2026-10-25"),"booked");
 assert.equal(displayEligibility(db,db.screens[0],"2026-11-10","2026-11-11"),"eligible");
 assert.equal(displayEligibility(db,db.screens[1],"2026-10-24","2026-10-25"),"eligible");
 assert.equal(displayEligibility(db,db.screens[2],"2026-10-24","2026-10-25"),"offline");
 const checked={...db.screens[2],status:"online"};
 assert.equal(displayEligibility(db,checked,"2026-10-24","2026-10-25"),"unverified");
});
