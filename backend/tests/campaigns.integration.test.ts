import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient,type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken,mac,makeSessionToken } from "../src/modules/auth/security.js";
import { encryptTotpSecret } from "../src/modules/auth/mfa.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";
const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw Error("B12 tests require isolated PostgreSQL");
const url=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(url.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(url.pathname.slice(1)))
 throw Error("B12 refuses remote databases");

test("B12 advertiser ownership, submitted snapshots and MFA review lifecycle",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
 MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 const seed=randomUUID().slice(0,8);
 const pw=await argon2.hash("B12-Strong-Password-2026!",{type:argon2.argon2id});
 const users=await Promise.all(["owner","stranger","admin","driver"].map(async kind=>
  db.user.create({data:{email:"b12-"+kind+"-"+seed+"@example.invalid",
   displayName:"B12 "+kind,passwordHash:pw,status:"ACTIVE",emailVerifiedAt:new Date(),
   role:kind==="admin"?"ADMIN":kind==="driver"?"DRIVER":"ADVERTISER"}})));
 const [owner,stranger,admin,driver]=users as [User,User,User,User];
 await db.adminMfaCredential.create({data:{userId:admin.id,
  secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  enabledAt:new Date(Date.now()-60000)}});
 type Identity={cookie:string;csrf:string};
 const session=async(u:User,mfa=true):Promise<Identity>=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+600000),
   ...(u.role==="ADMIN"&&mfa?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 };
 const [alice,bob,staff,motorist]=await Promise.all(users.map(u=>session(u)));
 const adminNoMfa=await session(admin,false);
 const business=await db.business.create({data:{ownerUserId:owner.id,
  slug:"b12-"+seed,displayName:"B12 Advertiser"}});
 const other=await db.business.create({data:{ownerUserId:stranger.id,
  slug:"other-b12-"+seed,displayName:"B12 Another Company"}});
 await db.businessMembership.createMany({data:[
  {businessId:business.id,userId:owner.id,role:"OWNER"},
  {businessId:other.id,userId:stranger.id,role:"OWNER"}]});
 const digest="a".repeat(64);
 async function creativeFor(businessId:string,userId:string,approved:boolean){
  const asset=await db.mediaAsset.create({data:{businessId,uploaderUserId:userId,
   state:"READY",mimeType:"image/png",expectedBytes:100,expectedSha256:digest,
   sourceKey:"creative-source/"+businessId+"/"+randomUUID(),
   sourceVersionId:"source-v1",uploadExpiresAt:new Date(Date.now()+60000),
   uploadedAt:new Date(),scannedAt:new Date(),processedAt:new Date(),
   sourceSha256:digest,processedKey:"creative-processed/"+businessId+"/"+randomUUID(),
   processedVersionId:"processed-v1",processedSha256:digest,
   processedMimeType:"image/png",width:640,height:480}});
  return db.creative.create({data:{ownerBusinessId:businessId,
   title:"B12 reviewed artwork",placement:"AUTO_REAR",mediaAssetId:asset.id,
   ...(approved?{approval:"APPROVED",reviewedByUserId:admin.id,
    reviewedAt:new Date(),reviewReason:"Human-approved test creative"}:{})}});
 }
 const creative=await creativeFor(business.id,owner.id,true);
 const pending=await creativeFor(business.id,owner.id,false);
 const foreignCreative=await creativeFor(other.id,stranger.id,true);
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false);
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const send=(method:string,path:string,who?:Identity,body?:object,key?:string,csrf=true)=>{
   const headers:Record<string,string>={Origin:"http://localhost:3000"};
   if(who)headers.Cookie=who.cookie;
   if(who&&csrf)headers["X-CSRF-Token"]=who.csrf;
   if(key)headers["Idempotency-Key"]=key;
   if(body)headers["Content-Type"]="application/json";
   return fetch(root+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  };
  const post=(path:string,body:object,who?:Identity,key?:string)=>send("POST",path,who,body,key);
  const get=(path:string,who?:Identity)=>send("GET",path,who);
  const patch=(path:string,body:object,who?:Identity)=>send("PATCH",path,who,body);
  const date=(n:number)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
  const payload={businessId:business.id,title:"Festival campaign",creativeId:creative.id,
   startDate:date(3),endDate:date(7),weekdays:[0,1,2,3,4,5,6],
   timeWindow:{start:"08:00",end:"20:00"}};
  assert.equal((await post("/campaigns",payload,alice)).status,422);
  assert.equal((await send("POST","/campaigns",alice,payload,"no-csrf-"+seed,false)).status,403);
  assert.equal((await post("/campaigns",payload,motorist,"driver-"+seed)).status,403);
  assert.equal((await post("/campaigns",payload,bob,"foreign-"+seed)).status,404);
  assert.equal((await post("/campaigns",{...payload,creativeId:foreignCreative.id},
   alice,"foreign-creative-"+seed)).status,422);
  assert.equal((await post("/campaigns",{...payload,timeWindow:{start:"20:00",end:"08:00"}},
   alice,"bad-clock-"+seed)).status,422);
  assert.equal((await post("/campaigns",{...payload,endDate:date(90)},
   alice,"long-"+seed)).status,422);
  const created=await post("/campaigns",payload,alice,"campaign-"+seed);
  assert.equal(created.status,201);
  const draft=(await created.json() as {data:{id:string;status:string;revision:number;
   inventoryStatus:string;timeWindow:{start:string;end:string}}}).data;
  assert.equal(draft.status,"draft");assert.equal(draft.revision,1);
  assert.equal(draft.inventoryStatus,"NOT_BOOKED");
  assert.equal(draft.timeWindow.end,"20:00");
  assert.equal((await post("/campaigns",payload,alice,"campaign-"+seed)).status,201);
  assert.equal(await db.campaign.count({where:{ownerBusinessId:business.id}}),1);
  assert.equal((await post("/campaigns",{...payload,title:"Changed"},
   alice,"campaign-"+seed)).status,409);
  assert.equal((await get("/campaigns/"+draft.id,bob)).status,404);
  assert.equal((await get("/campaigns/"+draft.id,alice)).status,200);
  assert.equal((await get("/campaigns?businessId="+business.id,bob)).status,404);
  assert.deepEqual((await (await get("/campaigns",bob)).json() as {data:unknown[]}).data,[]);
  assert.equal((await get("/campaigns",staff)).status,200);
  assert.equal((await get("/campaigns?status=wrong",alice)).status,422);
  assert.equal((await patch("/campaigns/"+draft.id,{expectedRevision:2,title:"stale"},alice)).status,409);
  const updated=await patch("/campaigns/"+draft.id,{expectedRevision:1,title:"Festival 2026"},alice);
  assert.equal(updated.status,200);
  assert.equal((await updated.json() as {data:{revision:number}}).data.revision,2);
  const input={businessId:business.id,title:"Pending creative",creativeId:pending.id,
   startDate:date(2),endDate:date(4),weekdays:[0,1,2,3,4,5,6]};
  const pendingResult=await post("/campaigns",input,alice,"pending-"+seed);
  assert.equal(pendingResult.status,201);
  const pendingId=(await pendingResult.json() as {data:{id:string}}).data.id;
  assert.equal((await post("/campaigns/"+pendingId+"/submit",{},alice,"bad-pending-"+seed)).status,422);
  assert.equal((await get("/campaigns/"+pendingId+"/submissions",bob)).status,404);
  const submit=await post("/campaigns/"+draft.id+"/submit",{},alice,"submit-"+seed);
  assert.equal(submit.status,201);
  const submitted=(await submit.json() as {data:{status:string;revision:number;submissionNumber:number}}).data;
  assert.equal(submitted.status,"submitted");assert.equal(submitted.revision,3);
  assert.equal(submitted.submissionNumber,1);
  assert.equal((await post("/campaigns/"+draft.id+"/submit",{},alice,"submit-"+seed)).status,201);
  assert.equal((await post("/campaigns/"+draft.id+"/submit",{},alice,"submit-new-"+seed)).status,409);
  assert.equal((await patch("/campaigns/"+draft.id,{expectedRevision:3,title:"locked"},alice)).status,409);
  const submissions=await get("/campaigns/"+draft.id+"/submissions",alice);
  assert.equal(submissions.status,200);
  const firstSnap=(await submissions.json() as {data:Array<{number:number;snapshot:{
   assetId:string;bookingStatus:string;processedSha256:string}}>} ).data[0]!;
  assert.equal(firstSnap.number,1);
  assert.equal(firstSnap.snapshot.bookingStatus,"NOT_BOOKED");
  assert.equal(firstSnap.snapshot.processedSha256,digest);
  const decision="/admin/campaigns/"+draft.id+"/decision";
  const requestChanges={decision:"changes_requested",reason:"Please update the campaign name",
   expectedRevision:3};
  assert.equal((await post(decision,requestChanges,alice,"bad-admin-"+seed)).status,403);
  assert.equal((await post(decision,requestChanges,adminNoMfa,"mfa-"+seed)).status,401);
  assert.equal((await send("POST",decision,staff,requestChanges,"csrf-admin-"+seed,false)).status,403);
  const reviewed=await post(decision,requestChanges,staff,"review-"+seed);
  assert.equal(reviewed.status,201);
  assert.equal((await reviewed.json() as {data:{status:string;revision:number}}).data.status,
   "changes_requested");
  assert.equal((await post(decision,requestChanges,staff,"review-"+seed)).status,201);
  assert.equal((await post("/campaigns/"+draft.id+"/submit",{},alice,"unmodified-"+seed)).status,409);
  const revised=await patch("/campaigns/"+draft.id,{
   expectedRevision:4,title:"Festival 2026 revised"},alice);
  assert.equal(revised.status,200);
  assert.equal((await post("/campaigns/"+draft.id+"/submit",{},alice,"resubmit-"+seed)).status,201);
  const afterSubmit=await db.campaign.findUniqueOrThrow({where:{id:draft.id}});
  assert.equal(afterSubmit.submissionNumber,2);
  const approved=await post(decision,{
   decision:"approved",reason:"Artwork and schedule reviewed and approved",
   expectedRevision:afterSubmit.revision},staff,"approve-"+seed);
  assert.equal(approved.status,201);
  const accepted=(await approved.json() as {data:{status:string;paymentStatus:string;
   inventoryStatus:string}}).data;
  assert.equal(accepted.status,"approved");assert.equal(accepted.paymentStatus,"unpaid");
  assert.equal(accepted.inventoryStatus,"NOT_BOOKED");
  assert.equal((await post(decision,{
   decision:"rejected",reason:"Cannot overwrite prior review",
   expectedRevision:afterSubmit.revision},staff,"other-decision-"+seed)).status,409);
  assert.equal((await patch("/campaigns/"+draft.id,{
   expectedRevision:afterSubmit.revision+1,title:"hijacked"},alice)).status,409);
  assert.equal(await db.campaignSubmission.count({where:{campaignId:draft.id}}),2);
  assert.equal(await db.campaignReview.count({where:{campaignId:draft.id}}),2);
  const history=await get("/admin/campaigns/"+draft.id+"/reviews",staff);
  assert.equal(history.status,200);
  assert.equal((await get("/admin/campaigns/"+draft.id+"/reviews",alice)).status,403);
  const review=(await db.campaignReview.findFirstOrThrow({where:{campaignId:draft.id}}));
  await assert.rejects(db.campaignReview.delete({where:{id:review.id}}));
  const snapshot=await db.campaignSubmission.findFirstOrThrow({where:{campaignId:draft.id}});
  await assert.rejects(db.campaignSubmission.update({where:{id:snapshot.id},data:{
   campaignRevision:987}}));
  await assert.rejects(db.campaign.create({data:{
   ownerBusinessId:business.id,createdByUserId:owner.id,
   title:"Direct ORM tenant bypass",creativeId:foreignCreative.id,
   startDate:new Date(date(3)+"T00:00:00Z"),endDate:new Date(date(5)+"T00:00:00Z"),
   weekdays:[0,1,2,3,4,5,6]}}));
  assert.equal(await db.outboxEvent.count({where:{aggregateType:"campaign",
   aggregateId:draft.id}}),4);
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
