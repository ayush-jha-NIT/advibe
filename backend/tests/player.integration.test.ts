import assert from "node:assert/strict";
import { createHash,generateKeyPairSync,randomUUID,randomBytes,sign,verify } from "node:crypto";
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
import { deviceMessage } from "../src/modules/devices/crypto.js";
const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw new Error("B16 tests require disposable local PostgreSQL");
const database=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(database.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(database.pathname.slice(1)))
 throw new Error("B16 refuses shared database");

test("B16 signed device playlists, heartbeat claims and immediate pause/revocation",async()=>{
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
  db.user.create({data:{email:"b16-"+kind+"-"+seed+"@example.invalid",
   displayName:"B16 "+kind,passwordHash:hash,status:"ACTIVE",emailVerifiedAt:new Date(),
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
 const [alice,,staff]=credentials as [Auth,Auth,Auth,Auth];
 const business=await db.business.create({data:{
  ownerUserId:owner.id,slug:"b16-"+seed,displayName:"B16 Agency"}});
 const otherBusiness=await db.business.create({data:{
  ownerUserId:outsider.id,slug:"b16-other-"+seed,displayName:"B16 Other Agency"}});
 await db.businessMembership.createMany({data:[
  {businessId:business.id,userId:owner.id,role:"OWNER"},
  {businessId:otherBusiness.id,userId:outsider.id,role:"OWNER"}]});
 const city=await db.city.create({data:{slug:"b16-city-"+seed,name:"B16 City",
  countryCode:"IN",timeZone:"Asia/Kolkata",state:"PUBLISHED"}});
 const zone=await db.zone.create({data:{cityId:city.id,slug:"b16-zone",name:"B16 Zone",
  centerLat:25.45,centerLng:81.84,radiusMeters:1000,state:"PUBLISHED"}});
 const location=await db.location.create({data:{zoneId:zone.id,slug:"b16-location",
  name:"B16 Site",latitude:25.45,longitude:81.84,state:"PUBLISHED"}});
 const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,type:"AUTO",
  model:"B16 CI Verified",year:2025,verification:"APPROVED"}});
 await db.driverApplication.create({data:{driverUserId:driver.id,
  vehicleId:vehicle.id,vehicleCategory:"AUTO",state:"APPROVED",completedStep:5,
  city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
  agreementTemplateVersion:"b16-ci-only",confirmedReadiness:true,submittedAt:new Date()}});
 const key=generateKeyPairSync("ed25519");
 const spki=key.publicKey.export({type:"spki",format:"der"}).toString("base64url");
 const screens=await Promise.all([0,1].map(async i=>db.screen.create({data:{
  vehicleId:vehicle.id,locationId:location.id,state:"PAIRED",placement:"AUTO_REAR",
  installationReference:"b16-fixture-"+i,
  credential:{create:{publicKeySpki:spki,
   fingerprint:createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex")}},
 }})));
 const date=(days:number)=>dateString(new Date(Date.now()+19800000+days*86400000));
 const firstDate=date(0),lastDate=date(0),weekdays=[0,1,2,3,4,5,6];
 const testAmount=18700n;
 async function readyHold(screenId:string){
  const digest="a".repeat(64),time=new Date(Date.now()-120000);
  const asset=await db.mediaAsset.create({data:{businessId:business.id,
   uploaderUserId:owner.id,mimeType:"image/png",expectedBytes:100,
   expectedSha256:digest,sourceKey:"creative-source/"+business.id+"/"+randomUUID(),
   sourceVersionId:"b16-source-v1",state:"READY",
   uploadExpiresAt:new Date(Date.now()+100000),uploadedAt:new Date(),
   scannedAt:new Date(),processedAt:new Date(),sourceSha256:digest,
   processedKey:"creative-processed/"+business.id+"/"+randomUUID(),
   processedVersionId:"b16-process-v1",processedSha256:digest,
   processedMimeType:"image/png",width:800,height:400}});
  const creative=await db.creative.create({data:{ownerBusinessId:business.id,
   title:"B16 approved media",placement:"AUTO_REAR",mediaAssetId:asset.id,
   approval:"APPROVED",reviewedByUserId:admin.id,reviewedAt:time,
   reviewReason:"B16 test artwork approved"}});
  const campaign=await db.campaign.create({data:{ownerBusinessId:business.id,
   createdByUserId:owner.id,title:"B16 approved campaign",creativeId:creative.id,
   startDate:atUtc(firstDate),endDate:atUtc(lastDate),weekdays,status:"APPROVED",
   revision:4,submissionNumber:1,submittedAt:time,reviewedAt:time,
   reviewedByUserId:admin.id,reviewReason:"B16 CI campaign approval"}});
  const submission=await db.campaignSubmission.create({data:{campaignId:campaign.id,
   number:1,campaignRevision:2,snapshot:{campaignId:campaign.id,bookingStatus:"NOT_BOOKED"}}});
  await db.campaignReview.create({data:{campaignId:campaign.id,submissionNumber:1,
   adminUserId:admin.id,decision:"APPROVED",reason:"B16 approved campaign fixture",
   snapshotHash:createHash("sha256").update(JSON.stringify(submission.snapshot)).digest("hex")}});
  const quote=await db.priceQuote.create({data:{businessId:business.id,
   requestedByUserId:owner.id,campaignId:campaign.id,startDate:atUtc(firstDate),
   endDate:atUtc(lastDate),selectedWeekdays:weekdays,screenIds:[screenId],
   subtotalPaise:testAmount,discountPaise:0n,taxablePaise:testAmount,taxPaise:0n,
   totalPaise:testAmount,taxPolicyVersion:"b16-ci-only",
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
 const first=await readyHold(screens[0]!.id);

 const manifestKey=generateKeyPairSync("ed25519");
 const oldKey=process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
 process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=
  manifestKey.privateKey.export({type:"pkcs8",format:"der"}).toString("base64url");
 let signedGets=0;
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false,undefined,undefined,undefined,{
   media:{async signedGet(k,v){
    assert.ok(k.startsWith("creative-processed/"));assert.equal(v,"b16-process-v1");
    signedGets++;return "https://private-media.example.invalid/"+encodeURIComponent(v)+"?signed=ci";
   }}
  });
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const adminPost=(path:string,body:object,key?:string)=>fetch(root+path,{
   method:"POST",headers:{Origin:"http://localhost:3000",Cookie:staff.cookie,
    "X-CSRF-Token":staff.csrf,"Content-Type":"application/json",
    ...(key?{"Idempotency-Key":key}:{})},body:JSON.stringify(body)});
  const deviceSend=(method:string,path:string,body?:object,overrides:{
   nonce?:string;key?:typeof key.privateKey;cookie?:string;id?:string}={})=>{
   const stamp=String(Date.now()),nonce=overrides.nonce??randomBytes(24).toString("base64url");
   const signature=sign(null,deviceMessage(method,"/api/v1"+path,stamp,nonce,body??{}),
    overrides.key??key.privateKey).toString("base64url");
   return fetch(root+path,{method,headers:{
    "X-Device-ID":overrides.id??credential.id,"X-Device-Timestamp":stamp,
    "X-Device-Nonce":nonce,"X-Device-Signature":signature,
    ...(overrides.cookie?{Cookie:overrides.cookie}:{}),
    ...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  };
  const credential=await db.deviceCredential.findUniqueOrThrow({
   where:{screenId:screens[0]!.id}});
  type Manifest={screenId:string;version:number;expiresAt:string;signature:string;
   entries:Array<{campaignId:string;creativeId:string;mediaUrl:string;sha256:string;
    mimeType:string;startAt:string;endAt:string}>};
  const readManifest=async()=>{
   const response=await deviceSend("GET","/devices/manifest");
   assert.equal(response.status,200);
   return (await response.json() as {data:Manifest}).data;
  };
  const checkSignature=(m:Manifest)=>{
   const unsigned={screenId:m.screenId,version:m.version,expiresAt:m.expiresAt,entries:m.entries};
   assert.equal(verify(null,Buffer.from(JSON.stringify(unsigned)),manifestKey.publicKey,
    Buffer.from(m.signature,"base64url")),true);
  };
  assert.equal((await deviceSend("GET","/devices/manifest",undefined,
   {cookie:staff.cookie})).status,401);
  assert.equal((await deviceSend("GET","/devices/manifest",undefined,
   {key:generateKeyPairSync("ed25519").privateKey})).status,401);
  const stop=await readManifest();
  assert.deepEqual(stop.entries,[]);checkSignature(stop);
  assert.equal(signedGets,0);
  const order=await db.paymentOrder.create({data:{
   businessId:business.id,campaignId:first.campaign.id,quoteId:first.quote.id,
   reservationHoldId:first.hold.id,createdByUserId:owner.id,
   providerOrderId:"adv_b16_"+randomUUID().replaceAll("-",""),
   currency:"INR",amountPaise:testAmount,state:"PAID",paidAt:new Date()}});
  await db.paymentAttempt.create({data:{paymentOrderId:order.id,
   providerPaymentId:"pay_b16_"+randomUUID().replaceAll("-",""),
   amountPaise:testAmount,currency:"INR",status:"SUCCESS"}});
  await db.reservationHold.update({where:{id:first.hold.id},
   data:{state:"CONFIRMED",confirmedAt:new Date()}});
  const activate="/admin/reservations/holds/"+first.hold.id+"/delivery/activate";
  const response=await adminPost(activate,{},"b16-activate-"+seed);
  assert.equal(response.status,201,JSON.stringify(await response.json()));
  const playing=await readManifest();
  checkSignature(playing);
  assert.equal(playing.screenId,screens[0]!.id);
  assert.equal(playing.entries.length,1);
  assert.equal(playing.entries[0]?.campaignId,first.campaign.id);
  assert.equal(playing.entries[0]?.sha256,"a".repeat(64));
  assert.ok(playing.entries[0]?.mediaUrl.startsWith("https://private-media.example.invalid/"));
  assert.ok(new Date(playing.expiresAt).getTime()-Date.now()<=45_000);
  assert.ok(playing.version>stop.version);
  assert.equal(signedGets,1);
  const beat={screenId:screens[0]!.id,deviceEventId:"b16-beat-"+seed,
   observedAt:new Date().toISOString(),firmwareVersion:"fw_1.0",
   manifestVersion:playing.version,playbackState:"PLAYING"};
  const beatResponse=await deviceSend("POST","/devices/heartbeat",beat);
  assert.equal(beatResponse.status,201,JSON.stringify(await beatResponse.json()));
  assert.equal((await deviceSend("POST","/devices/heartbeat",beat)).status,409);
  const record=await db.deviceHeartbeat.findFirstOrThrow({where:{
   credentialId:credential.id,deviceEventId:beat.deviceEventId}});
  assert.equal(record.manifestVersion,playing.version);
  assert.equal(record.playbackState,"PLAYING");
  await assert.rejects(db.deviceHeartbeat.delete({where:{id:record.id}}));
  const status=await fetch(root+"/admin/devices/"+screens[0]!.id+"/player-status",{
   headers:{Cookie:staff.cookie}});
  assert.equal(status.status,200);
  const diag=(await status.json() as {data:{reportedPlaybackState:string;verifiedImpressions:number}}).data;
  assert.equal(diag.reportedPlaybackState,"playing");
  assert.equal(diag.verifiedImpressions,0);
  assert.equal((await fetch(root+"/admin/devices/"+screens[0]!.id+"/player-status",{
   headers:{Cookie:alice.cookie}})).status,403);
  const delivery="/reservations/holds/"+first.hold.id+"/delivery";
  assert.equal((await adminPost(delivery+"/pause",
   {expectedRevision:1,reason:"B16 emergency remote screen pause"})).status,200);
  const disabled=await readManifest();
  checkSignature(disabled);
  assert.deepEqual(disabled.entries,[]);
  assert.ok(disabled.version>playing.version);
  const denied={...beat,deviceEventId:"b16-paused-"+seed,observedAt:new Date().toISOString()};
  assert.equal((await deviceSend("POST","/devices/heartbeat",denied)).status,409);
  assert.equal((await adminPost(delivery+"/resume",{expectedRevision:2})).status,200);
  const restored=await readManifest();
  assert.equal(restored.entries.length,1);checkSignature(restored);
  await db.screen.update({where:{id:screens[0]!.id},data:{state:"REVOKED"}});
  assert.equal((await deviceSend("GET","/devices/manifest")).status,401);
  assert.equal((await deviceSend("POST","/devices/heartbeat",{
   ...beat,deviceEventId:"b16-revoked-"+seed,observedAt:new Date().toISOString()})).status,401);
 }finally{
  if(oldKey===undefined)delete process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
  else process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=oldKey;
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
