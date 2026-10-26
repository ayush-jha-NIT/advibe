import assert from "node:assert/strict";
import { createHash,generateKeyPairSync,randomUUID } from "node:crypto";
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
import { expireReservationHolds } from "../src/modules/reservations/expiry.js";
import { dateString,atUtc } from "../src/modules/pricing/schemas.js";
import { selectedServiceDates } from "../src/modules/reservations/schemas.js";

const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw Error("B13 uses only disposable local PostgreSQL");
const target=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(target.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1)))
 throw Error("B13 refuses production/shared database");

test("B13 concurrent screen-day capacity, quote/campaign checks, expiry and immutable history",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 const seed=randomUUID().slice(0,8);
 const passwordHash=await argon2.hash("B13-Strong-Password-2026!",{type:argon2.argon2id});
 const users=await Promise.all(["first","second","admin","driver"].map(async kind=>
  db.user.create({data:{email:"b13-"+kind+"-"+seed+"@example.invalid",
   displayName:"B13 "+kind,passwordHash,status:"ACTIVE",emailVerifiedAt:new Date(),
   role:kind==="admin"?"ADMIN":kind==="driver"?"DRIVER":"ADVERTISER"}})));
 const [first,second,admin,driver]=users as [User,User,User,User];
 await db.adminMfaCredential.create({data:{userId:admin.id,
  secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  enabledAt:new Date(Date.now()-60000)}});
 type Auth={cookie:string;csrf:string};
 const sessions=await Promise.all(users.map(async u=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+600000),
   ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 }));
 const [alice,bob,staff,motorist]=sessions as Auth[];
 const businesses=await Promise.all([first,second].map(async(u,i)=>
  db.business.create({data:{ownerUserId:u.id,slug:"b13-"+i+"-"+seed,
   displayName:"B13 Ad Business "+i}})));
 for(let i=0;i<2;i++)await db.businessMembership.create({data:{
  businessId:businesses[i]!.id,userId:users[i]!.id,role:"OWNER"}});
 const city=await db.city.create({data:{slug:"b13-city-"+seed,name:"B13 City",
  countryCode:"IN",timeZone:"Asia/Kolkata",state:"PUBLISHED"}});
 const zone=await db.zone.create({data:{cityId:city.id,slug:"b13-zone",name:"B13 Zone",
  centerLat:25.45,centerLng:81.84,radiusMeters:1000,state:"PUBLISHED"}});
 const location=await db.location.create({data:{zoneId:zone.id,slug:"b13-location",
  name:"B13 Verified Site",latitude:25.45,longitude:81.84,state:"PUBLISHED"}});
 const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,type:"AUTO",
  model:"B13 approved vehicle",year:2025,verification:"APPROVED"}});
 await db.driverApplication.create({data:{driverUserId:driver.id,
  vehicleId:vehicle.id,vehicleCategory:"AUTO",state:"APPROVED",completedStep:5,
  city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
  agreementTemplateVersion:"b13-ci-contract",confirmedReadiness:true,submittedAt:new Date()}});
 const device=generateKeyPairSync("ed25519");
 const spki=device.publicKey.export({type:"spki",format:"der"}).toString("base64url");
 const screen=await db.screen.create({data:{vehicleId:vehicle.id,locationId:location.id,
  state:"PAIRED",placement:"AUTO_REAR",installationReference:"offline-b13-ci-fixture",
  credential:{create:{publicKeySpki:spki,
   fingerprint:createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex")}}}});
 const unpaired=await db.screen.create({data:{vehicleId:vehicle.id,locationId:location.id,
  state:"UNPAIRED",placement:"AUTO_SIDE",installationReference:"unpaired-ci-fixture"}});
 const date=(days:number)=>dateString(new Date(Date.now()+days*86400000));
 const start=date(2),end=date(4),weekdays=[0,1,2,3,4,5,6];
 const dates=selectedServiceDates(atUtc(start),atUtc(end),weekdays);
 assert.equal(dates.length,3);
 const approvalTime=new Date(Date.now()-120000);
 async function seedApprovedCampaign(i:number){
  const business=businesses[i]!,user=users[i]!;
  const digest="a".repeat(64);
  const asset=await db.mediaAsset.create({data:{businessId:business.id,
   uploaderUserId:user.id,mimeType:"image/png",expectedBytes:100,
   expectedSha256:digest,sourceKey:"creative-source/"+business.id+"/"+randomUUID(),
   sourceVersionId:"b13-source-v1",state:"READY",
   uploadExpiresAt:new Date(Date.now()+100000),uploadedAt:new Date(),
   scannedAt:new Date(),processedAt:new Date(),sourceSha256:digest,
   processedKey:"creative-processed/"+business.id+"/"+randomUUID(),
   processedVersionId:"b13-processed-v1",processedSha256:digest,
   processedMimeType:"image/png",width:800,height:400}});
  const creative=await db.creative.create({data:{ownerBusinessId:business.id,
   title:"B13 approved artwork",placement:"AUTO_REAR",mediaAssetId:asset.id,
   approval:"APPROVED",reviewedByUserId:admin.id,reviewedAt:approvalTime,
   reviewReason:"B13 test fixture was reviewed"}});
  const c=await db.campaign.create({data:{ownerBusinessId:business.id,
   createdByUserId:user.id,title:"B13 approved ad",creativeId:creative.id,
   startDate:atUtc(start),endDate:atUtc(end),weekdays,status:"APPROVED",
   revision:4,submissionNumber:1,submittedAt:approvalTime,
   reviewedAt:approvalTime,reviewedByUserId:admin.id,
   reviewReason:"Campaign approved for CI test only"}});
  const s=await db.campaignSubmission.create({data:{campaignId:c.id,number:1,
   campaignRevision:2,snapshot:{campaignId:c.id,bookingStatus:"NOT_BOOKED"}}});
  await db.campaignReview.create({data:{campaignId:c.id,submissionNumber:1,
   adminUserId:admin.id,decision:"APPROVED",reason:"B13 approved campaign in CI",
   snapshotHash:createHash("sha256").update(JSON.stringify(s.snapshot)).digest("hex")}});
  const q=await db.priceQuote.create({data:{businessId:business.id,requestedByUserId:user.id,
   campaignId:c.id,startDate:atUtc(start),endDate:atUtc(end),
   selectedWeekdays:weekdays,screenIds:[screen.id],subtotalPaise:30000n,
   discountPaise:0n,taxablePaise:30000n,taxPaise:0n,totalPaise:30000n,
   taxPolicyVersion:"b13-legal-test-only",pricingSnapshot:{rates:["ci-only"]},
   expiresAt:new Date(Date.now()+12*60*1000)}});
  return {campaign:c,quote:q,business};
 }
 const [one,two]=await Promise.all([seedApprovedCampaign(0),seedApprovedCampaign(1)]);
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false);
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
  const input=(c:typeof one)=>({campaignId:c.campaign.id,quoteId:c.quote.id,
   screenIds:[screen.id]});
  const path="/reservations/holds";
  assert.equal((await post(path,input(one),alice)).status,422);
  assert.equal((await send("POST",path,alice,input(one),"no-csrf-"+seed,false)).status,403);
  assert.equal((await post(path,input(one),motorist,"driver-"+seed)).status,403);
  assert.equal((await post(path,input(one),bob,"foreign-"+seed)).status,404);
  assert.equal((await post(path,{...input(one),screenIds:[screen.id,screen.id]},
   alice,"duplicates-"+seed)).status,422);
  assert.equal((await post(path,{...input(one),screenIds:[unpaired.id]},
   alice,"unpaired-"+seed)).status,422);
  const badQuote=await db.priceQuote.create({data:{businessId:one.business.id,
   requestedByUserId:first.id,campaignId:one.campaign.id,startDate:atUtc(start),
   endDate:atUtc(end),selectedWeekdays:weekdays,screenIds:[screen.id],
   subtotalPaise:30000n,discountPaise:0n,taxablePaise:30000n,taxPaise:0n,
   totalPaise:30000n,taxPolicyVersion:"ci-only",pricingSnapshot:{},
   expiresAt:new Date(Date.now()-1000),createdAt:new Date(Date.now()-30000)}});
  assert.equal((await post(path,{...input(one),quoteId:badQuote.id},alice,"expired-"+seed)).status,422);
  const results=await Promise.all([
   post(path,input(one),alice,"hold-a-"+seed),
   post(path,input(two),bob,"hold-b-"+seed),
  ]);
  const codes=results.map(x=>x.status).sort();
  assert.deepEqual(codes,[201,409],"Only one contender can hold the same screen dates");
  const winnerIndex=results[0]!.status===201?0:1;
  const winner=winnerIndex===0?one:two,loser=winnerIndex===0?two:one;
  const winnerAuth=winnerIndex===0?alice:bob,loserAuth=winnerIndex===0?bob:alice;
  const won=await results[winnerIndex]!.json() as {data:{id:string;
   state:string;items:Array<{serviceDate:string}>;paymentStatus:string}};
  assert.equal(won.data.state,"held");
  assert.equal(won.data.items.length,3);
  assert.equal(won.data.paymentStatus,"unpaid");
  assert.equal(await db.inventorySlot.count({where:{screenId:screen.id}}),3);
  assert.equal((await post(path,input(winner),winnerAuth,
   "hold-"+(winnerIndex===0?"a":"b")+"-"+seed)).status,201);
  assert.equal((await get(path+"/"+won.data.id,loserAuth)).status,404);
  assert.equal((await get(path+"/"+won.data.id,winnerAuth)).status,200);
  assert.equal((await get("/campaigns/"+winner.campaign.id+"/bookings",loserAuth)).status,404);
  const bookings=await get("/campaigns/"+winner.campaign.id+"/bookings",winnerAuth);
  assert.equal(bookings.status,200);
  const entries=(await bookings.json() as {data:Array<{status:string;paymentStatus:string}>}).data;
  assert.equal(entries.length,3);
  assert.ok(entries.every(x=>x.status==="held"&&x.paymentStatus==="unpaid"));
  assert.equal((await get("/campaigns/"+winner.campaign.id+"/bookings",staff)).status,200);
  assert.equal((await send("DELETE",path+"/"+won.data.id,loserAuth,{})).status,404);
  assert.equal((await send("DELETE",path+"/"+won.data.id,winnerAuth,{},undefined,false)).status,403);
  const released=await send("DELETE",path+"/"+won.data.id,winnerAuth,{});
  assert.equal(released.status,200);
  assert.equal((await released.json() as {data:{state:string}}).data.state,"released");
  assert.equal((await send("DELETE",path+"/"+won.data.id,winnerAuth,{})).status,200);
  assert.equal(await db.inventorySlot.count({where:{screenId:screen.id}}),0);
  assert.equal(await db.reservationHoldItem.count({where:{holdId:won.data.id}}),3,
   "Releasing capacity must preserve immutable historical rows");
  const takeOver=await post(path,input(loser),loserAuth,"after-release-"+seed);
  assert.equal(takeOver.status,201);
  const secondHold=(await takeOver.json() as {data:{id:string}}).data.id;
  await db.reservationHold.update({where:{id:secondHold},data:{
   createdAt:new Date(Date.now()-600000),expiresAt:new Date(Date.now()-300000)}});
  assert.equal((await get(path+"/"+secondHold,loserAuth)).status,200);
  assert.equal((await post(path,input(winner),winnerAuth,"after-expiry-"+seed)).status,201,
   "Creating new hold must reclaim expired screen-day allocations");
  const reclaimed=await db.reservationHold.findUniqueOrThrow({where:{id:secondHold}});
  assert.equal(reclaimed.state,"EXPIRED");
  assert.equal(await db.inventorySlot.count({where:{screenId:screen.id}}),3);
  const held=await db.reservationHold.findFirstOrThrow({where:{
   campaignId:winner.campaign.id,state:"HELD"}});
  await db.reservationHold.update({where:{id:held.id},data:{
   createdAt:new Date(Date.now()-600000),expiresAt:new Date(Date.now()-300000)}});
  assert.equal(await expireReservationHolds(db),1);
  assert.equal(await expireReservationHolds(db),0);
  assert.equal(await db.inventorySlot.count({where:{screenId:screen.id}}),0);
  const record=await db.reservationHoldItem.findFirstOrThrow({where:{holdId:won.data.id}});
  await assert.rejects(db.reservationHoldItem.delete({where:{id:record.id}}),
   "Historical screen/day allocations must remain append-only");
  assert.equal(await db.reservationHoldItem.count({where:{holdId:won.data.id}}),3);
  assert.ok(await db.auditEvent.count({where:{resourceType:"reservation_hold",
   resourceId:won.data.id}}));
  assert.ok(await db.outboxEvent.count({where:{aggregateType:"reservation_hold",
   aggregateId:won.data.id}}));
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
