import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {adminBookingCandidates,pricingSearch,validatePricingUpdate,validateSettlementTransition} from "../src/features/admin/admin-finance-rules.ts";
const admin={role:"admin",accountId:"adm-1"},driver={role:"driver",accountId:"drv-1"};
test("only demo admin may edit a valid rate, long seeded periods supported",()=>{
 const db=createDemoSeed(),r=db.pricingRules[0];
 assert.equal(validatePricingUpdate(db,admin,r.id,{rupeesPerScreenDay:215,active:true,validFrom:r.validFrom,validTo:r.validTo}).rupeesPerScreenDay,215);
 assert.throws(()=>validatePricingUpdate(db,driver,r.id,{...r,rupeesPerScreenDay:215}),/Admin/);
 assert.throws(()=>validatePricingUpdate(db,admin,r.id,{...r,rupeesPerScreenDay:215.5}),/integer/);
 assert.throws(()=>validatePricingUpdate(db,admin,r.id,{...r,validFrom:"2028-01-02",validTo:"2028-01-01"}),/Start date/);
 assert.throws(()=>validatePricingUpdate(db,admin,"missing",r),/not found/);
});
test("overlap of active matching placement and city is rejected",()=>{
 const db=createDemoSeed(),r=db.pricingRules[0];
 db.pricingRules.push({...r,id:"rate-duplicate",active:true,validFrom:"2026-05-01",validTo:"2026-05-10"});
 assert.throws(()=>validatePricingUpdate(db,admin,r.id,{...r}),/Conflicting/);
 assert.doesNotThrow(()=>validatePricingUpdate(db,admin,r.id,{...r,active:false}));
});
test("settlement demo transitions only pending to processed/failed",()=>{
 const db=createDemoSeed(),r=db.settlements[0];
 assert.equal(validateSettlementTransition(db,admin,r.id,"processed").id,r.id);
 assert.throws(()=>validateSettlementTransition(db,driver,r.id,"processed"),/Admin/);
 assert.throws(()=>validateSettlementTransition(db,admin,r.id,"invalid"),/Invalid/);
 db.settlements[0].status="processed";
 assert.throws(()=>validateSettlementTransition(db,admin,r.id,"processed"),/Only pending/);
});
test("booking candidates require both Admin approved and demo-paid state",()=>{
 const db=createDemoSeed();
 assert.deepEqual(adminBookingCandidates(db),[]);
 db.campaigns[1].status="approved";
 assert.deepEqual(adminBookingCandidates(db),[]);
 db.campaigns[1].paymentStatus="paid";
 assert.deepEqual(adminBookingCandidates(db).map(c=>c.id),["cmp-2"]);
 assert.equal(pricingSearch(db,"auto","Prayagraj").length,2);
});
