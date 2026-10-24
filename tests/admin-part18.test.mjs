import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {assertDemoAdmin,assertCreativeMetadataReview} from "../src/features/admin/admin-rules.ts";
const db=createDemoSeed(),admin={role:"admin",accountId:"adm-1"};
test("only preset demo admin identity may operate example approvals",()=>{
 assert.doesNotThrow(()=>assertDemoAdmin(admin));
 assert.throws(()=>assertDemoAdmin({role:"driver",accountId:"drv-1"}),/Admin/);
 assert.throws(()=>assertDemoAdmin({role:"admin",accountId:"guest"}),/Admin/);
});
test("creative metadata review checks lifecycle and forbids invalid decisions",()=>{
 assert.doesNotThrow(()=>assertCreativeMetadataReview(admin,db.creatives.find(c=>c.id==="crt-3"),"approved"));
 assert.throws(()=>assertCreativeMetadataReview(admin,db.creatives.find(c=>c.id==="crt-1"),"approved"),/already/);
 assert.throws(()=>assertCreativeMetadataReview(admin,db.creatives.find(c=>c.id==="crt-3"),"pending"),/Invalid/);
 assert.throws(()=>assertCreativeMetadataReview(admin,undefined,"approved"),/not found/);
 assert.throws(()=>assertCreativeMetadataReview({role:"advertiser",accountId:"adv-1"},db.creatives[2],"approved"),/Admin/);
});
