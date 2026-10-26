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
import type { RefundGateway,RefundObservation } from "../src/modules/finance/provider.js";
import { reconcileRefunds } from "../src/modules/finance/worker.js";
const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw new Error("B14 tests require isolated local PostgreSQL");
const database=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(database.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(database.pathname.slice(1)))
 throw new Error("B14 refuses shared database");

test("B19 issued immutable tax documents, refund safety, provider reconciliation and B14 payment regressions",async()=>{
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
 const taxPolicy=await db.taxPolicy.create({data:{
  version:"b19-tax-"+seed,taxBps:1000,sourceReference:"b19-ci-only-legal-review",
  active:true,validFrom:atUtc(date(-2)),validTo:atUtc(date(40)),
  createdByUserId:admin.id}});
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
   subtotalPaise:17000n,discountPaise:0n,taxablePaise:17000n,taxPaise:1700n,
   totalPaise:testAmount,taxPolicyVersion:taxPolicy.version,
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
 const previous=Object.fromEntries(["B19_SELLER_NAME","B19_SELLER_ADDRESS",
 "B19_SELLER_GSTIN","B19_SELLER_STATE_CODE","B19_SERVICE_SAC"].map(k=>[k,process.env[k]]));
 Object.assign(process.env,{B19_SELLER_NAME:"AdVibe CI Services LLP",
  B19_SELLER_ADDRESS:"CI Only Tax Office, Prayagraj, Uttar Pradesh",
  B19_SELLER_GSTIN:"09AAAAA0000A1Z5",B19_SELLER_STATE_CODE:"09",B19_SERVICE_SAC:"998365"});
 const refundStates=new Map<string,RefundObservation["status"]>();
 let refundCalls=0,refundFail=false;
 const refundGateway:RefundGateway={
  async createRefund(orderId,refundId,amountPaise){
   if(refundFail)throw Error("Provider network timeout after unknown transfer");
   refundCalls++;
   if(!refundStates.has(refundId))refundStates.set(refundId,"PENDING");
   return {orderId,refundId,amountPaise,currency:"INR",status:refundStates.get(refundId)!};
  },
  async getRefund(orderId,refundId){
   const refund=await db.paymentRefund.findUniqueOrThrow({where:{providerRefundId:refundId}});
   return {orderId,refundId,amountPaise:refund.amountPaise,currency:"INR",
    status:refundStates.get(refundId)??"PENDING"};
  },
  async getOrder(id){const row=orders.get(id)!;
   return {orderId:id,amountPaise:row.amount,currency:"INR",status:row.status};},
  async listPayments(id){const row=orders.get(id)!;
   return [{paymentId:row.paymentId,amountPaise:row.amount,currency:"INR",
    status:row.status==="PAID"?"SUCCESS":"PENDING"}];},
 };
 const secret="b14-test-provider-secret";
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false,undefined,undefined,
  {gateway,webhookSecret:secret},undefined,undefined,{gateway:refundGateway});
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
  assert.equal((await db.paymentOrder.findUniqueOrThrow({where:{id:firstOrder.id}})).state,"PAID");
  assert.equal(await db.paymentAttempt.count({where:{paymentOrderId:firstOrder.id}}),1);
  assert.equal(await db.paymentWebhookEvent.count({where:{paymentOrderId:firstOrder.id}}),1);
  assert.equal((await post("/reservations/holds/"+first.hold.id+"/confirm",{},alice,"reconcile-after-"+seed)).status,200);
  assert.equal((await send("DELETE","/reservations/holds/"+first.hold.id,alice,{})).status,409);
  const activeSlot=await db.inventorySlot.findFirstOrThrow({where:{holdId:first.hold.id}});
  await assert.rejects(db.inventorySlot.delete({where:{screenId_serviceDate:{
   screenId:activeSlot.screenId,serviceDate:activeSlot.serviceDate}}}));

  // B19: tax invoice may only be explicitly issued by MFA Admin, never the advertiser.
  const invoiceInput={paymentOrderId:firstOrder.id,
   recipientName:"B19 Test Recipient",recipientAddress:"Civil Lines, Prayagraj, Uttar Pradesh",
   recipientStateCode:"09",placeOfSupplyCode:"09",
   description:"Screen advertising for approved booked campaign"};
  assert.equal((await post("/admin/invoices",invoiceInput,alice,"inv-foreign-"+seed)).status,403);
  assert.equal((await post("/admin/invoices",invoiceInput,staff)).status,422);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/invoice",alice)).status,404);
  const issued=await post("/admin/invoices",invoiceInput,staff,"b19-invoice-"+seed);
  assert.equal(issued.status,201,JSON.stringify(await issued.json()));
  const stored=await db.financeInvoice.findUniqueOrThrow({where:{paymentOrderId:firstOrder.id}});
  assert.equal(stored.totalPaise,testAmount);
  assert.equal(stored.supplierGstin,"09AAAAA0000A1Z5");
  assert.equal(stored.taxMode,"INTRA");
  assert.equal(stored.cgstPaise,850n);
  assert.equal(stored.sgstPaise,850n);
  assert.equal(stored.igstPaise,0n);
  assert.equal(stored.cgstPaise+stored.sgstPaise+stored.igstPaise,first.quote.taxPaise);
  assert.ok(stored.invoiceNumber.length<=16);
  assert.equal((await post("/admin/invoices",invoiceInput,staff,"b19-invoice-"+seed)).status,201);
  assert.equal((await post("/admin/invoices",invoiceInput,staff,"b19-duplicate-"+seed)).status,409);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/invoice",alice)).status,200);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/invoice",bob)).status,404);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/invoice",staff)).status,200);
  await assert.rejects(db.financeInvoice.update({where:{id:stored.id},
   data:{totalPaise:99999n}}));
  await assert.rejects(db.financeInvoice.delete({where:{id:stored.id}}));
  const refundInput={paymentOrderId:firstOrder.id,amountPaise:5000,
   reason:"Approved partial cancellation under reviewed finance policy",
   policyReference:"d13-refund-reviewed-"+seed};
  assert.equal((await post("/admin/refunds",refundInput,alice,"refund-user-"+seed)).status,403);
  assert.equal((await post("/admin/refunds",refundInput,staff)).status,422);
  assert.equal((await post("/admin/refunds",{...refundInput,amountPaise:999999},
   staff,"refund-large-"+seed)).status,409);
  const refundRes=await post("/admin/refunds",refundInput,staff,"b19-refund-"+seed);
  assert.equal(refundRes.status,201,JSON.stringify(await refundRes.json()));
  const refund=(await db.paymentRefund.findFirstOrThrow({where:{
   paymentOrderId:firstOrder.id}}));
  assert.equal(refund.state,"QUEUED");
  assert.equal((await post("/admin/refunds",refundInput,staff,"b19-refund-"+seed)).status,201);
  assert.equal((await post("/admin/refunds",{...refundInput,amountPaise:5100},
   staff,"b19-refund-"+seed)).status,409);
  refundFail=true;await assert.rejects(reconcileRefunds(db,refundGateway));
  assert.equal((await db.paymentRefund.findUniqueOrThrow({where:{id:refund.id}})).state,"QUEUED");
  refundFail=false;assert.deepEqual(await reconcileRefunds(db,refundGateway),{checked:1,finalized:0});
  assert.equal(refundCalls,1);
  assert.equal((await db.paymentRefund.findUniqueOrThrow({where:{id:refund.id}})).state,"SUBMITTED");
  assert.deepEqual(await reconcileRefunds(db,refundGateway),{checked:1,finalized:0});
  assert.equal(refundCalls,1,"Never re-create a refund after accepted pending provider response");
  refundStates.set(refund.providerRefundId,"SUCCESS");
  assert.deepEqual(await reconcileRefunds(db,refundGateway),{checked:1,finalized:1});
  assert.deepEqual(await reconcileRefunds(db,refundGateway),{checked:0,finalized:0});
  const credit=await db.financeCreditNote.findUniqueOrThrow({where:{refundId:refund.id}});
  assert.equal(credit.amountPaise,5000n);
  assert.equal(credit.taxablePaise+credit.cgstPaise+credit.sgstPaise+credit.igstPaise,5000n);
  await assert.rejects(db.financeCreditNote.delete({where:{id:credit.id}}));
  const secondRefund={...refundInput,amountPaise:13700,reason:"Remaining approved full reversal under D13"};
  assert.equal((await post("/admin/refunds",secondRefund,staff,"b19-secondrefund-"+seed)).status,201);
  const rows=await db.paymentRefund.findMany({where:{paymentOrderId:firstOrder.id},
   orderBy:{createdAt:"asc"}});
  const secondRefundRow=rows.find(x=>x.id!==refund.id)!;
  refundStates.set(secondRefundRow.providerRefundId,"SUCCESS");
  assert.deepEqual(await reconcileRefunds(db,refundGateway),{checked:1,finalized:1});
  const allNotes=await db.financeCreditNote.findMany({where:{invoiceId:stored.id}});
  assert.equal(allNotes.reduce((sum,x)=>sum+x.amountPaise,0n),testAmount);
  assert.equal(allNotes.reduce((sum,x)=>sum+x.taxablePaise,0n),stored.taxablePaise);
  assert.equal(allNotes.reduce((sum,x)=>sum+x.cgstPaise,0n),stored.cgstPaise);
  assert.equal(allNotes.reduce((sum,x)=>sum+x.sgstPaise,0n),stored.sgstPaise);
  assert.equal((await post("/admin/refunds",refundInput,staff,"b19-overrefund-"+seed)).status,409);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/refunds",bob)).status,404);
  const ownRefundsResponse:unknown=await (await get("/payments/orders/"+firstOrder.id+"/refunds",alice)).json();
  const ownRefunds=(ownRefundsResponse as {data:Array<{status:string;providerRefundId?:string}>}).data;
  assert.equal(ownRefunds.length,2);
  assert.equal(ownRefunds[0]?.providerRefundId,undefined);
  assert.equal((await get("/payments/orders/"+firstOrder.id+"/credit-notes",alice)).status,200);
  assert.equal((await get("/admin/finance/reconciliation",alice)).status,403);
  const good=await post("/admin/finance/reconcile/"+firstOrder.id,{},staff);
  assert.equal(good.status,200);
  const checked=(await good.json() as {data:{state:string;confirmedRefundsPaise:number}}).data;
  assert.equal(checked.state,"matched");
  assert.equal(checked.confirmedRefundsPaise,18700);
  assert.equal((await db.financeReconciliationEvent.count({where:{
   paymentOrderId:firstOrder.id,state:"MATCHED"}})),1);
  // B21 admin financial reporting reflects actual B19 paid/refund events only.
  const dateToday=new Date().toISOString().slice(0,10);
  const dashboard=await get("/admin/reports?from="+dateToday+"&to="+dateToday,staff);
  assert.equal(dashboard.status,200);
  const financial=(await dashboard.json() as {data:{counts:{paidBookings:number;confirmedRefunds:number},
   financial:{confirmedBookingGrossPaise:string;confirmedRefundsPaise:string;periodDifferencePaise:string}}}).data;
  assert.equal(financial.counts.paidBookings,1);
  assert.equal(financial.counts.confirmedRefunds,2);
  assert.equal(financial.financial.confirmedBookingGrossPaise,"18700");
  assert.equal(financial.financial.confirmedRefundsPaise,"18700");
  assert.equal(financial.financial.periodDifferencePaise,"0");
  assert.equal((await get("/admin/reports",alice)).status,403);
  assert.equal((await get("/admin/reports?from=2020-01-01&to=2026-10-26",staff)).status,422);
  const reportExport=await get("/admin/reports/export?from="+dateToday+"&to="+dateToday,staff);
  assert.equal(reportExport.status,200);
  assert.match(reportExport.headers.get("Content-Type")??"",/text\/csv/);
  assert.match(await reportExport.text(),/confirmedBookingGrossPaise/);
  assert.equal((await get("/admin/reports/export",alice)).status,403);
  // Independent payment provider mismatch must be logged and mark financial resolution required.
  const amountBefore=providerOrder.amount;providerOrder.amount=amountBefore+1n;
  const discrepancy=await post("/admin/finance/reconcile/"+firstOrder.id,{},staff);
  assert.equal(discrepancy.status,200);
  assert.equal((await discrepancy.json() as {data:{state:string}}).data.state,"mismatch");
  assert.equal((await db.paymentOrder.findUniqueOrThrow({where:{id:firstOrder.id}}))
   .requiresResolution,true);
  assert.equal((await get("/admin/finance/reconciliation",staff)).status,200);
  providerOrder.amount=amountBefore;

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
  for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
