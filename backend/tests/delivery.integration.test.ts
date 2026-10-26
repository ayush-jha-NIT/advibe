import assert from "node:assert/strict";
import { createHash,createHmac,generateKeyPairSync,randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient,type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken,makeSessionToken,mac } from "../src/modules/auth/security.js";
import { encryptTotpSecret } from "../src/modules/auth/mfa.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";
import { atUtc,dateString } from "../src/modules/pricing/schemas.js";
import { verifyWebhook } from "../src/modules/payments/verify.js";
import { decimalPaise,type CashfreeGateway } from "../src/modules/payments/provider.js";
import { localMinuteToUtc } from "../src/modules/delivery/time.js";
import { reconcileDeliveryPlans } from "../src/modules/delivery/worker.js";
const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw new Error("B14 tests require isolated local PostgreSQL");
const database=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(database.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(database.pathname.slice(1)))
 throw new Error("B14 refuses shared database");

test("B15 paid activation, pause/resume, revocation and B14 payment regression",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 assert.equal(decimalPaise("52.03"),5203n);
 assert.equal(decimalPaise(1.5),150n);
 assert.throws(()=>decimalPaise("1.001"));
 const seed=randomUUID().slice(0,8);
 const hash=await argon2.hash("B14-Cashfree-Password-2026!",{type:argon2.argon2id});
 const users=await Promise.all(["owner","outsider","admin","driver"].map(async kind=>
  db.user.create({data:{email:"b14-"+kind+"-"+seed+"@example.invalid",
   displayName:"B14 "+kind,passwordHash:hash,status:"ACTIVE",emailVerifiedAt:new Date(),
   role:kind==="admin"?"ADMIN":kind==="driver"?"DRIVER":"ADVERTISER"}})));
 const [owner,outsider,admin,driver]=users as [User,User,User,User];
 await db.adminMfaCredential.create({data:{userId:admin.id,
  secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  enabledAt:new Date(Date.now()-60000)}});
 type Auth={cookie:string;csrf:string};
 const credentials=await Promise.all(users.map(async u=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+600000),
   ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 }));
 const [alice,bob,staff,motorist]=credentials as Auth[];
 const business=await db.business.create({data:{
  ownerUserId:owner.id,slug:"b14-"+seed,displayName:"B14 Agency"}});
 const otherBusiness=await db.business.create({data:{
  ownerUserId:outsider.id,slug:"b14-other-"+seed,displayName:"B14 Other Agency"}});
 await db.businessMembership.createMany({data:[
  {businessId:business.id,userId:owner.id,role:"OWNER"},
  {businessId:otherBusiness.id,userId:outsider.id,role:"OWNER"}]});
 const city=await db.city.create({data:{slug:"b14-city-"+seed,name:"B14 City",
  countryCode:"IN",timeZone:"Asia/Kolkata",state:"PUBLISHED"}});
 const zone=await db.zone.create({data:{cityId:city.id,slug:"b14-zone",name:"B14 Zone",
  centerLat:25.45,centerLng:81.84,radiusMeters:1000,state:"PUBLISHED"}});
 const location=await db.location.create({data:{zoneId:zone.id,slug:"b14-location",
  name:"B14 Site",latitude:25.45,longitude:81.84,state:"PUBLISHED"}});
 const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,type:"AUTO",
  model:"B14 CI Verified",year:2025,verification:"APPROVED"}});
 await db.driverApplication.create({data:{driverUserId:driver.id,
  vehicleId:vehicle.id,vehicleCategory:"AUTO",state:"APPROVED",completedStep:5,
  city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
  agreementTemplateVersion:"b14-ci-only",confirmedReadiness:true,submittedAt:new Date()}});
 const key=generateKeyPairSync("ed25519");
 const spki=key.publicKey.export({type:"spki",format:"der"}).toString("base64url");
 const screens=await Promise.all([0,1].map(async i=>db.screen.create({data:{
  vehicleId:vehicle.id,locationId:location.id,state:"PAIRED",placement:"AUTO_REAR",
  installationReference:"b14-fixture-"+i,
  credential:{create:{publicKeySpki:spki,
   fingerprint:createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex")}},
 }})));
 const date=(days:number)=>dateString(new Date(Date.now()+days*86400000));
 const firstDate=date(2),lastDate=date(2),weekdays=[0,1,2,3,4,5,6];
 const testAmount=18700n;
 async function readyHold(screenId:string){
  const digest="a".repeat(64),time=new Date(Date.now()-120000);
  const asset=await db.mediaAsset.create({data:{businessId:business.id,
   uploaderUserId:owner.id,mimeType:"image/png",expectedBytes:100,
   expectedSha256:digest,sourceKey:"creative-source/"+business.id+"/"+randomUUID(),
   sourceVersionId:"b14-source-v1",state:"READY",
   uploadExpiresAt:new Date(Date.now()+100000),uploadedAt:new Date(),
   scannedAt:new Date(),processedAt:new Date(),sourceSha256:digest,
   processedKey:"creative-processed/"+business.id+"/"+randomUUID(),
   processedVersionId:"b14-process-v1",processedSha256:digest,
   processedMimeType:"image/png",width:800,height:400}});
  const creative=await db.creative.create({data:{ownerBusinessId:business.id,
   title:"B14 approved media",placement:"AUTO_REAR",mediaAssetId:asset.id,
   approval:"APPROVED",reviewedByUserId:admin.id,reviewedAt:time,
   reviewReason:"B14 test artwork approved"}});
  const campaign=await db.campaign.create({data:{ownerBusinessId:business.id,
   createdByUserId:owner.id,title:"B14 approved campaign",creativeId:creative.id,
   startDate:atUtc(firstDate),endDate:atUtc(lastDate),weekdays,status:"APPROVED",
   revision:4,submissionNumber:1,submittedAt:time,reviewedAt:time,
   reviewedByUserId:admin.id,reviewReason:"B14 CI campaign approval"}});
  const submission=await db.campaignSubmission.create({data:{campaignId:campaign.id,
   number:1,campaignRevision:2,snapshot:{campaignId:campaign.id,bookingStatus:"NOT_BOOKED"}}});
  await db.campaignReview.create({data:{campaignId:campaign.id,submissionNumber:1,
   adminUserId:admin.id,decision:"APPROVED",reason:"B14 approved campaign fixture",
   snapshotHash:createHash("sha256").update(JSON.stringify(submission.snapshot)).digest("hex")}});
  const quote=await db.priceQuote.create({data:{businessId:business.id,
   requestedByUserId:owner.id,campaignId:campaign.id,startDate:atUtc(firstDate),
   endDate:atUtc(lastDate),selectedWeekdays:weekdays,screenIds:[screenId],
   subtotalPaise:testAmount,discountPaise:0n,taxablePaise:testAmount,taxPaise:0n,
   totalPaise:testAmount,taxPolicyVersion:"b14-ci-only",
   pricingSnapshot:{test:true},expiresAt:new Date(Date.now()+600000)}});
  const hold=await db.reservationHold.create({data:{
   businessId:business.id,campaignId:campaign.id,quoteId:quote.id,
   createdByUserId:owner.id,expiresAt:new Date(Date.now()+300000)}});
  await db.reservationHoldItem.create({data:{holdId:hold.id,screenId,
   serviceDate:atUtc(firstDate)}});
  await db.inventorySlot.create({data:{holdId:hold.id,screenId,
   serviceDate:atUtc(firstDate)}});
  return {hold,campaign,quote};
 }
 const first=await readyHold(screens[0]!.id),second=await readyHold(screens[1]!.id);
 const orders=new Map<string,{amount:bigint;status:string;paymentId:string}>();
 let providerCalls=0;
 const gateway:CashfreeGateway={
  async createOrder({providerOrderId,amountPaise}){
   providerCalls++;
   if(!orders.has(providerOrderId))
    orders.set(providerOrderId,{amount:amountPaise,status:"ACTIVE",
     paymentId:"pay_"+randomUUID().replaceAll("-","")});
   return {providerOrderId,orderAmountPaise:amountPaise,currency:"INR",
    paymentSessionId:"session_"+providerOrderId};
  },
  async getOrder(id){const x=orders.get(id);if(!x)throw Error("Unknown payment order");
   return {providerOrderId:id,amountPaise:x.amount,currency:"INR",status:x.status};},
  async getPayment(id,transaction){const x=orders.get(id);
   if(!x||x.paymentId!==transaction)throw Error("Unknown provider transaction");
   return {providerOrderId:id,providerPaymentId:transaction,amountPaise:x.amount,
    currency:"INR",status:x.status==="PAID"?"SUCCESS":"PENDING"};},
  async listPayments(id){const x=orders.get(id);return x?[
   {providerOrderId:id,providerPaymentId:x.paymentId,amountPaise:x.amount,
    currency:"INR",status:x.status==="PAID"?"SUCCESS":"PENDING"}]:[];}
 };
 const secret="b14-test-provider-secret";
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false,undefined,undefined,
  {gateway,webhookSecret:secret});
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const send=(method:string,path:string,who?:Auth,body?:object,key?:string,csrf=true)=>{
   const headers:Record<string,string>={Origin:"http://localhost:3000"};
   if(who)headers.Cookie=who.cookie;
   if(who&&csrf)headers["X-CSRF-Token"]=who.csrf;
   if(key)headers["Idempotency-Key"]=key;
   if(body)headers["Content-Type"]="application/json";
   return fetch(root+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  };
  const post=(path:string,body:object,who?:Auth,key?:string)=>send("POST",path,who,body,key);
  const get=(path:string,who?:Auth)=>send("GET",path,who);
  const payload=(h:typeof first)=>({campaignId:h.campaign.id,quoteId:h.quote.id,
   reservationHoldId:h.hold.id,customerPhone:"9876543210"});
  assert.equal((await post("/payments/orders",payload(first),alice)).status,422);
  assert.equal((await send("POST","/payments/orders",alice,payload(first),
   "missing-csrf-"+seed,false)).status,403);
  assert.equal((await post("/payments/orders",payload(first),motorist,"driver-"+seed)).status,403);
  assert.equal((await post("/payments/orders",payload(first),bob,"foreign-"+seed)).status,404);
  assert.equal((await post("/payments/orders",{...payload(first),customerPhone:"12345"},
   alice,"phone-"+seed)).status,422);
  const firstResponse=await post("/payments/orders",payload(first),alice,"order-"+seed);
  assert.equal(firstResponse.status,201);
  const firstOrder=(await firstResponse.json() as {data:{id:string;status:string;
   checkoutSession:string;amountPaise:number}}).data;
  assert.equal(firstOrder.status,"active");assert.equal(firstOrder.amountPaise,Number(testAmount));
  assert.ok(firstOrder.checkoutSession.startsWith("session_"));
  assert.equal((await post("/payments/orders",payload(first),alice,"order-"+seed)).status,201);
  assert.equal(providerCalls,1);
  assert.equal((await post("/payments/orders",{...payload(first),customerPhone:"9876543211"},
   alice,"order-"+seed)).status,409);
  assert.equal((await post("/payments/orders",payload(first),alice,"other-order-"+seed)).status,409);
  assert.equal((await get("/payments/orders/"+firstOrder.id,bob)).status,404);
  assert.equal((await get("/payments/orders/"+firstOrder.id,alice)).status,200);
  assert.equal((await get("/payments/orders/"+firstOrder.id,staff)).status,200);
  assert.deepEqual((await (await get("/payments",bob)).json() as {data:unknown[]}).data,[]);
  const raw=(orderId:string,paymentId:string)=>Buffer.from(JSON.stringify({
   type:"PAYMENT_SUCCESS_WEBHOOK",data:{order:{order_id:orderId},
    payment:{cf_payment_id:paymentId}}}),"utf8");
  const webhook=async(payload:Buffer,signatureValid=true)=>{
   const stamp=Math.floor(Date.now()/1000).toString();
   const sig=createHmac("sha256",secret).update(stamp).update(payload).digest("base64");
   return fetch(root+"/webhooks/cashfree/payments",{
    method:"POST",headers:{"Content-Type":"application/json","x-webhook-timestamp":stamp,
     "x-webhook-signature":signatureValid?sig:"A".repeat(43)+"="},
    body:payload});
  };
  const databaseOrder=await db.paymentOrder.findUniqueOrThrow({where:{id:firstOrder.id}});
  const providerOrder=orders.get(databaseOrder.providerOrderId)!;
  const signed=raw(databaseOrder.providerOrderId,providerOrder.paymentId);
  assert.equal((await webhook(signed,false)).status,401);
  assert.equal((await post("/reservations/holds/"+first.hold.id+"/confirm",{},alice,"reconcile-before-"+seed)).status,409);
  assert.equal((await db.reservationHold.findUniqueOrThrow({where:{id:first.hold.id}})).state,"HELD");
  providerOrder.status="PAID";
  assert.equal((await webhook(signed)).status,200);
  assert.equal((await webhook(signed)).status,200);
  const confirmed=await db.reservationHold.findUniqueOrThrow({where:{id:first.hold.id}});
  assert.equal(confirmed.state,"CONFIRMED");
  assert.ok(confirmed.confirmedAt);

  const delivery="/reservations/holds/"+first.hold.id+"/delivery";
  const activate="/admin/reservations/holds/"+first.hold.id+"/delivery/activate";
  assert.equal((await post(activate,{},alice,"owneractivate-"+seed)).status,403);
  assert.equal((await post(activate,{},motorist,"driveractivate-"+seed)).status,403);
  assert.equal((await send("POST",activate,staff,{},"missingcsrf-"+seed,false)).status,403);
  assert.equal((await post(activate,{},staff)).status,422);
  const activated=await post(activate,{},staff,"b15-activate-"+seed);
  assert.equal(activated.status,201);
  const activatedData=(await activated.json() as {data:{id:string;revision:number;
   status:string;windows:Array<{screenId:string;timeZone:string;startAt:string;endAt:string}>}}).data;
  assert.equal(activatedData.status,"scheduled");
  assert.equal(activatedData.revision,1);
  assert.equal(activatedData.windows.length,1);
  assert.equal(activatedData.windows[0]?.screenId,screens[0]!.id);
  assert.equal(activatedData.windows[0]?.timeZone,"Asia/Kolkata");
  assert.equal((await post(activate,{},staff,"b15-activate-"+seed)).status,201);
  assert.equal((await post(activate,{},staff,"another-activate-"+seed)).status,409);
  assert.equal((await get(delivery,alice)).status,200);
  assert.equal((await get(delivery,bob)).status,404);
  assert.equal((await get(delivery,motorist)).status,403);
  assert.equal((await get("/admin/screens/"+screens[0]!.id+"/delivery",staff)).status,200);
  assert.equal((await get("/admin/screens/"+screens[0]!.id+"/delivery",alice)).status,403);
  const deliveryWindow=await db.deliveryWindow.findFirstOrThrow({
   where:{planId:activatedData.id}});
  await assert.rejects(db.deliveryWindow.update({where:{id:deliveryWindow.id},
   data:{cityTimeZone:"UTC"}}));
  assert.equal((await post(delivery+"/pause",{expectedRevision:1,reason:"Advertiser-requested pause"},
   bob,"foreign-pause-"+seed)).status,404);
  assert.equal((await send("POST",delivery+"/pause",alice,
   {expectedRevision:1,reason:"Advertiser-requested pause"},"badcsrf-pause-"+seed,false)).status,403);
  const paused=await post(delivery+"/pause",{expectedRevision:1,reason:"Advertiser-requested pause"},
   alice,"b15-pause-"+seed);
  assert.equal(paused.status,200);
  assert.equal((await paused.json() as {data:{status:string;revision:number}}).data.status,"paused");
  assert.equal((await post(delivery+"/pause",{expectedRevision:1,reason:"Advertiser-requested pause"},
   alice,"b15-pause-"+seed)).status,200);
  assert.equal((await post(delivery+"/pause",{expectedRevision:1,reason:"Advertiser-requested pause"},
   alice,"new-pause-"+seed)).status,409);
  await db.screen.update({where:{id:screens[0]!.id},data:{state:"REVOKED"}});
  assert.equal((await post(delivery+"/resume",{expectedRevision:2},
   alice,"unsafe-resume-"+seed)).status,409);
  await db.screen.update({where:{id:screens[0]!.id},data:{state:"PAIRED"}});
  const resumed=await post(delivery+"/resume",{expectedRevision:2},
   alice,"b15-resume-"+seed);
  assert.equal(resumed.status,200);
  assert.equal((await resumed.json() as {data:{status:string;revision:number}}).data.status,
   "scheduled");
  await db.screen.update({where:{id:screens[0]!.id},data:{state:"REVOKED"}});
  assert.equal(await reconcileDeliveryPlans(db),1);
  assert.equal((await db.deliveryPlan.findUniqueOrThrow({where:{id:activatedData.id}})).state,
   "PAUSED");
  assert.equal(await reconcileDeliveryPlans(db),0);
  assert.ok((await db.auditEvent.count({where:{resourceId:activatedData.id}}))>=4);
  assert.ok((await db.outboxEvent.count({where:{aggregateId:activatedData.id}}))>=4);
  assert.equal((await post("/admin/reservations/holds/"+second.hold.id+
   "/delivery/activate",{},staff,"unpaid-"+seed)).status,409);

  assert.equal((await db.paymentOrder.findUniqueOrThrow({where:{id:firstOrder.id}})).state,"PAID");
  assert.equal(await db.paymentAttempt.count({where:{paymentOrderId:firstOrder.id}}),1);
  assert.equal(await db.paymentWebhookEvent.count({where:{paymentOrderId:firstOrder.id}}),1);
  assert.equal((await post("/reservations/holds/"+first.hold.id+"/confirm",{},alice,"reconcile-after-"+seed)).status,200);
  assert.equal((await send("DELETE","/reservations/holds/"+first.hold.id,alice,{})).status,409);
  const activeSlot=await db.inventorySlot.findFirstOrThrow({where:{holdId:first.hold.id}});
  await assert.rejects(db.inventorySlot.delete({where:{screenId_serviceDate:{
   screenId:activeSlot.screenId,serviceDate:activeSlot.serviceDate}}}));
  const secondRes=await post("/payments/orders",payload(second),alice,"second-"+seed);
  assert.equal(secondRes.status,201);
  const secondOrderId=(await secondRes.json() as {data:{id:string}}).data.id;
  const lateOrder=await db.paymentOrder.findUniqueOrThrow({where:{id:secondOrderId}});
  const lateProvider=orders.get(lateOrder.providerOrderId)!;
  await db.reservationHold.update({where:{id:second.hold.id},data:{
   expiresAt:new Date(Date.now()-1000),createdAt:new Date(Date.now()-120000)}});
  lateProvider.status="PAID";
  const late=await webhook(raw(lateOrder.providerOrderId,lateProvider.paymentId));
  assert.equal(late.status,200);
  const paidLate=await db.paymentOrder.findUniqueOrThrow({where:{id:secondOrderId}});
  assert.equal(paidLate.state,"PAID_UNALLOCATED");assert.equal(paidLate.requiresResolution,true);
  assert.equal((await db.reservationHold.findUniqueOrThrow({where:{id:second.hold.id}})).state,"HELD");
  assert.equal((await post("/reservations/holds/"+second.hold.id+"/confirm",{},alice,"reconcile-late-"+seed)).status,200);
  assert.ok((await db.outboxEvent.findMany({where:{
   aggregateType:"payment_order",aggregateId:secondOrderId,
   eventType:"payment.paid_unallocated"}})).length===1);
  assert.equal((await get("/payments",alice)).status,200);
  const record=await db.paymentAttempt.findFirstOrThrow({where:{paymentOrderId:firstOrder.id}});
  await assert.rejects(db.paymentAttempt.delete({where:{id:record.id}}));
  assert.throws(()=>verifyWebhook(signed,"A".repeat(43)+"=",
   Math.floor(Date.now()/1000).toString(),secret));
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});

test("B15 city local times reject invalid and ambiguous DST instants",()=>{
 assert.equal(localMinuteToUtc("2026-10-26",540,"Asia/Kolkata").toISOString(),
  "2026-10-26T03:30:00.000Z");
 assert.equal(localMinuteToUtc("2026-10-26",1440,"Asia/Kolkata").toISOString(),
  "2026-10-26T18:30:00.000Z");
 assert.throws(()=>localMinuteToUtc("2026-11-01",90,"America/New_York"));
 assert.throws(()=>localMinuteToUtc("2026-03-08",150,"America/New_York"));
 assert.throws(()=>localMinuteToUtc("2026-02-30",100,"Asia/Kolkata"));
 assert.throws(()=>localMinuteToUtc("2026-10-26",100,"Invalid/Zone"));
});
