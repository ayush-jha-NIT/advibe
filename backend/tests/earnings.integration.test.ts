import assert from "node:assert/strict";
import { createHash,createHmac,generateKeyPairSync,randomUUID,randomBytes,sign,verify } from "node:crypto";
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
import { reconcilePayouts } from "../src/modules/earnings/worker.js";
import type { PayoutGateway } from "../src/modules/earnings/provider.js";
const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
 throw new Error("B16 tests require disposable local PostgreSQL");
const database=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(database.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(database.pathname.slice(1)))
 throw new Error("B16 refuses shared database");

test("B18 immutable finance ledger, beneficiary and provider reconciliation with B17 regressions",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
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

 const oldGps=process.env.GPS_CONSENT_POLICY_VERSION;
 process.env.GPS_CONSENT_POLICY_VERSION="b17-ci-v1";
 const originalFinance=process.env.B18_EARNING_POLICY_VERSION;
 process.env.B18_EARNING_POLICY_VERSION="b18-v1";
 const manifestKey=generateKeyPairSync("ed25519");
 const oldKey=process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
 process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=
  manifestKey.privateKey.export({type:"pkcs8",format:"der"}).toString("base64url");

 const transfers=new Map<string,"PENDING"|"SUCCESS"|"FAILED">();
 let transferCalls=0, providerDown=false;
 const token="beneficiary_token_"+seed;
 const gateway:PayoutGateway={
  async verifyBeneficiary(ref,userId){
   return {token:ref,driverUserId:userId,provider:"cashfree",verified:ref===token};
  },
  async createTransfer(input){
   if(providerDown)throw new Error("Synthetic bank network outage");
   transferCalls++;
   if(!transfers.has(input.reference))transfers.set(input.reference,"PENDING");
   return {reference:input.reference,amountPaise:input.amountPaise,currency:"INR",
    state:transfers.get(input.reference)!};
  },
  async getTransfer(reference){
   const p=await db.driverPayout.findUniqueOrThrow({where:{providerReference:reference}});
   return {reference,amountPaise:p.amountPaise,currency:"INR",
    state:transfers.get(reference)??"PENDING"};
  },
 };
 let signedGets=0;
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false,undefined,undefined,undefined,{
   media:{async signedGet(k,v){
    assert.ok(k.startsWith("creative-processed/"));assert.equal(v,"b16-process-v1");
    signedGets++;return "https://private-media.example.invalid/"+encodeURIComponent(v)+"?signed=ci";
   }}
  },{gateway,webhookSecret:"b18-ci-webhook-secret-only"});
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
  assert.equal((await deviceSend("GET","/devices/manifest")).status,503);
  assert.equal((await adminPost("/admin/devices/"+screens[0]!.id+"/manifests/empty",{})).status,201);
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

  // B17: driver is the only party that can grant/revoke purpose-bound location tracking.
  const driverSession=credentials[3]!;
  const outsiderSession=credentials[1]!;
  const driverPost=(path:string,body:object,who=driverSession,csrf=true)=>
   fetch(root+path,{method:"POST",headers:{Origin:"http://localhost:3000",
    Cookie:who.cookie,...(csrf?{"X-CSRF-Token":who.csrf}:{}),
    "Content-Type":"application/json"},body:JSON.stringify(body)});
  const consentPath="/drivers/vehicles/"+vehicle.id+"/gps-consent";
  const startPath="/drivers/screens/"+screens[0]!.id+"/trips/start";
  assert.equal((await driverPost(startPath,{})).status,409,"No implicit location tracking");
  assert.equal((await driverPost(consentPath,{acknowledged:true,purposeVersion:"b17-ci-v1"},
   outsiderSession)).status,403);
  assert.equal((await driverPost(consentPath,{acknowledged:true,purposeVersion:"b17-ci-v1"},
   driverSession,false)).status,403);
  assert.equal((await driverPost(consentPath,{acknowledged:true,purposeVersion:"wrong-v1"})).status,422);
  const grantResponse=await driverPost(consentPath,{
   acknowledged:true,purposeVersion:"b17-ci-v1"});
  assert.equal(grantResponse.status,201);
  const grant=(await grantResponse.json() as {data:{id:string;purposeVersion:string}}).data;
  assert.equal(grant.purposeVersion,"b17-ci-v1");
  const tripResponse=await driverPost(startPath,{});
  assert.equal(tripResponse.status,201);
  const trip=(await tripResponse.json() as {data:{id:string;consentGrantId:string}}).data;
  assert.equal(trip.consentGrantId,grant.id);
  assert.equal((await driverPost(startPath,{})).status,409);
  const gps={
   screenId:screens[0]!.id,consentGrantId:grant.id,events:[{
    eventId:"b17-fix-"+seed,observedAt:new Date().toISOString(),
    lat:25.45,lng:81.84,accuracyMeters:8,
   }]};
  const gpsResponse=await deviceSend("POST","/devices/trip-events",gps);
  assert.equal(gpsResponse.status,201,JSON.stringify(await gpsResponse.json()));
  assert.equal((await deviceSend("POST","/devices/trip-events",gps)).status,409);
  const badGps={...gps,events:[{...gps.events[0]!,
   eventId:"b17-bad-"+seed,accuracyMeters:95,observedAt:new Date().toISOString()}]};
  assert.equal((await deviceSend("POST","/devices/trip-events",badGps)).status,422);
  const spoofGps={...gps,screenId:screens[1]!.id,events:[{...gps.events[0]!,
   eventId:"b17-other-"+seed,observedAt:new Date().toISOString()}]};
  assert.equal((await deviceSend("POST","/devices/trip-events",spoofGps)).status,403);
  const event={screenId:screens[0]!.id,manifestVersion:playing.version,
   events:[{deviceEventId:"b17-play-"+seed,creativeId:playing.entries[0]!.creativeId,
    playedAt:new Date().toISOString(),durationMs:1000}]};
  const playResponse=await deviceSend("POST","/devices/playback-events",event);
  assert.equal(playResponse.status,201,JSON.stringify(await playResponse.json()));
  assert.equal((await deviceSend("POST","/devices/playback-events",event)).status,409);
  const tamper={...event,events:[{...event.events[0]!,
   deviceEventId:"b17-tamper-"+seed,creativeId:randomUUID()}]};
  assert.equal((await deviceSend("POST","/devices/playback-events",tamper)).status,409);
  const reportUrl="/campaigns/"+first.campaign.id+"/exposures";
  const getReport=(who:typeof staff)=>fetch(root+reportUrl,{headers:{Cookie:who.cookie}});
  assert.equal((await getReport(outsiderSession)).status,404);
  const report=await getReport(alice);
  assert.equal(report.status,200);
  const aggregate=(await report.json() as {data:{
   qualifiedPlaybackCount:number;verifiedHumanImpressions:number;
   classification:string}}).data;
  assert.equal(aggregate.qualifiedPlaybackCount,1);
  assert.equal(aggregate.verifiedHumanImpressions,0);
  assert.equal(aggregate.classification,"qualified_device_report_only");

  // No B17 qualified device event is credited as earnings automatically.
  const readEarnings=()=>fetch(root+"/drivers/me/earnings",{headers:{Cookie:driverSession.cookie}});
  const balanceBefore=await readEarnings();
  assert.equal(balanceBefore.status,200);
  assert.equal((await balanceBefore.json() as {data:{earnedPaise:number}}).data.earnedPaise,0);
  assert.equal((await fetch(root+"/drivers/me/earnings",{headers:{Cookie:alice.cookie}})).status,403);
  const policyInput={version:"b18-v1",paisePerReviewedEvent:550};
  assert.equal((await adminPost("/admin/earnings/policies",policyInput)).status,422);
  assert.equal((await driverPost("/admin/earnings/policies",policyInput)).status,403);
  const policyResponse=await adminPost("/admin/earnings/policies",policyInput,"b18-policy-"+seed);
  assert.equal(policyResponse.status,201,JSON.stringify(await policyResponse.json()));
  const configured=await db.earningPolicy.findUniqueOrThrow({where:{version:"b18-v1"}});
  assert.equal((await adminPost("/admin/earnings/policies",policyInput,
   "b18-policy-"+seed)).status,201);
  assert.equal((await adminPost("/admin/earnings/policies",
   {...policyInput,paisePerReviewedEvent:551},"b18-policy-"+seed)).status,409);
  const source=await db.playbackProof.findFirstOrThrow({where:{
   tripId:trip.id,screenId:screens[0]!.id}});
  const accrual={sourceProofId:source.id,policyId:configured.id,
   evidenceReference:"b18_service_review_"+seed};
  assert.equal((await driverPost("/admin/earnings/accrue",accrual)).status,403);
  const credit=await adminPost("/admin/earnings/accrue",accrual,"b18-credit-"+seed);
  assert.equal(credit.status,201,JSON.stringify(await credit.json()));
  assert.equal((await adminPost("/admin/earnings/accrue",accrual,"b18-credit-"+seed)).status,201);
  assert.equal((await adminPost("/admin/earnings/accrue",accrual,"b18-duplicate-"+seed)).status,409);
  const earned=(await (await readEarnings()).json() as {data:{
   earnedPaise:number;availablePaise:number;paidPaise:number}}).data;
  assert.equal(earned.earnedPaise,550);assert.equal(earned.availablePaise,550);
  assert.equal(earned.paidPaise,0);
  const creditEntry=await db.driverLedgerEntry.findFirstOrThrow({where:{
   driverUserId:driver.id,kind:"EARNING"}});
  await assert.rejects(db.driverLedgerEntry.update({where:{id:creditEntry.id},
   data:{amountPaise:55000n}}));
  const dateToday=new Date().toISOString().slice(0,10);
  const period={driverUserId:driver.id,periodStart:dateToday,periodEnd:dateToday};
  assert.equal((await adminPost("/admin/settlements",period)).status,422);
  const settlementResponse=await adminPost("/admin/settlements",period,"b18-settlement-"+seed);
  assert.equal(settlementResponse.status,201,JSON.stringify(await settlementResponse.json()));
  const settlement=await db.driverSettlement.findFirstOrThrow({where:{driverUserId:driver.id}});
  assert.equal(settlement.grossPaise,550n);
  assert.equal((await adminPost("/admin/settlements",period,
   "b18-settlement-"+seed)).status,201);
  await assert.rejects(db.driverSettlement.update({where:{id:settlement.id},
   data:{grossPaise:50000n}}));
  const reserved=(await (await readEarnings()).json() as {data:{
   reservedPaise:number;availablePaise:number}}).data;
  assert.equal(reserved.reservedPaise,550);assert.equal(reserved.availablePaise,0);
  assert.equal((await driverPost("/drivers/me/beneficiaries",{providerToken:"12345"})).status,422);
  assert.equal((await driverPost("/drivers/me/beneficiaries",
   {providerToken:"unknown_token_"+seed})).status,409);
  assert.equal((await driverPost("/drivers/me/beneficiaries",
   {providerToken:token},alice)).status,403);
  const beneficiaryResponse=await driverPost("/drivers/me/beneficiaries",{providerToken:token});
  assert.equal(beneficiaryResponse.status,201);
  const ben=(await beneficiaryResponse.json() as {data:{
   id:string;tokenSuffix:string;providerToken?:string}}).data;
  assert.equal(ben.tokenSuffix,token.slice(-4));
  assert.equal(ben.providerToken,undefined,"Never expose raw provider beneficiary reference");
  const payoutInput={settlementId:settlement.id,beneficiaryId:ben.id};
  assert.equal((await driverPost("/admin/payouts",payoutInput)).status,403);
  assert.equal((await adminPost("/admin/payouts",payoutInput)).status,422);
  const queued=await adminPost("/admin/payouts",payoutInput,"b18-payout-"+seed);
  assert.equal(queued.status,201,JSON.stringify(await queued.json()));
  const payout=(await db.driverPayout.findUniqueOrThrow({
   where:{settlementId:settlement.id}}));
  assert.equal(payout.state,"QUEUED");
  assert.equal((await adminPost("/admin/payouts",payoutInput,"b18-payout-"+seed)).status,201);
  assert.equal((await adminPost("/admin/payouts",payoutInput,"b18-other-"+seed)).status,409);
  providerDown=true;
  await assert.rejects(reconcilePayouts(db,gateway));
  assert.equal((await db.driverPayout.findUniqueOrThrow({where:{id:payout.id}})).state,"QUEUED");
  providerDown=false;
  assert.equal(await reconcilePayouts(db,gateway),1);
  assert.equal(transferCalls,1);
  assert.equal((await db.driverPayout.findUniqueOrThrow({where:{id:payout.id}})).state,"SUBMITTED");
  assert.equal(await reconcilePayouts(db,gateway),0);
  assert.equal(transferCalls,1,"No repeat remote transfer on pending settlement");
  transfers.set(payout.providerReference,"SUCCESS");
  assert.equal(await reconcilePayouts(db,gateway),1);
  assert.equal(await reconcilePayouts(db,gateway),0);
  assert.equal((await db.driverPayout.findUniqueOrThrow({where:{id:payout.id}})).state,"PAID");
  assert.equal((await db.driverSettlement.findUniqueOrThrow({
   where:{id:settlement.id}})).state,"PAID");
  assert.equal(await db.driverLedgerEntry.count({where:{
   driverUserId:driver.id,kind:"PAYOUT"}}),1);
  const settled=(await (await readEarnings()).json() as {data:{
   earnedPaise:number;paidPaise:number;availablePaise:number}}).data;
  assert.equal(settled.earnedPaise,550);assert.equal(settled.paidPaise,550);
  assert.equal(settled.availablePaise,0);
  const webhookBody=Buffer.from(JSON.stringify({
   eventId:"b18-payout-event-"+seed,
   providerReference:payout.providerReference,type:"PAYOUT_SUCCESS"}));
  const stamp=Math.floor(Date.now()/1000).toString();
  const signature=createHmac("sha256","b18-ci-webhook-secret-only")
   .update(stamp).update(webhookBody).digest("base64");
  const notify=(sig:string)=>fetch(root+"/webhooks/cashfree/payouts",{
   method:"POST",headers:{"Content-Type":"application/json",
    "x-webhook-timestamp":stamp,"x-webhook-signature":sig},body:webhookBody});
  assert.equal((await notify("invalid-signature")).status,401);
  assert.equal((await notify(signature)).status,200);
  assert.equal((await notify(signature)).status,200);
  assert.equal(await db.payoutWebhookEvent.count({where:{payoutId:payout.id}}),1);
  assert.equal(await db.driverLedgerEntry.count({where:{
   driverUserId:driver.id,kind:"PAYOUT"}}),1);

  const raw=await db.gpsSample.findMany({where:{tripId:trip.id}});
  assert.equal(raw.length,1);
  const revoke=await driverPost(consentPath+"/revoke",{});
  assert.equal(revoke.status,200);
  assert.equal((await db.gpsSample.count({where:{tripId:trip.id}})),0,
   "Raw coordinates erased immediately on consent withdrawal");
  assert.equal((await driverPost(startPath,{})).status,409);
  assert.equal((await deviceSend("POST","/devices/trip-events",{
   ...gps,events:[{...gps.events[0]!,eventId:"b17-after-revoke-"+seed,
    observedAt:new Date().toISOString()}]})).status,409);
  assert.equal((await db.exposureAggregate.findFirstOrThrow({
   where:{campaignId:first.campaign.id}})).qualifiedPlaybackCount,1);

  const delivery="/reservations/holds/"+first.hold.id+"/delivery";
  assert.equal((await adminPost(delivery+"/pause",
   {expectedRevision:1,reason:"B16 emergency remote screen pause"},"b16-pause-"+seed)).status,200);
  const disabled=await readManifest();
  checkSignature(disabled);
  assert.deepEqual(disabled.entries,[]);
  assert.ok(disabled.version>playing.version);
  const denied={...beat,deviceEventId:"b16-paused-"+seed,observedAt:new Date().toISOString()};
  assert.equal((await deviceSend("POST","/devices/heartbeat",denied)).status,409);
  assert.equal((await adminPost(delivery+"/resume",{expectedRevision:2},"b16-resume-"+seed)).status,200);
  const restored=await readManifest();
  assert.equal(restored.entries.length,1);checkSignature(restored);
  await db.screen.update({where:{id:screens[0]!.id},data:{state:"REVOKED"}});
  assert.equal((await deviceSend("GET","/devices/manifest")).status,401);
  assert.equal((await deviceSend("POST","/devices/heartbeat",{
   ...beat,deviceEventId:"b16-revoked-"+seed,observedAt:new Date().toISOString()})).status,401);
 }finally{
  if(originalFinance===undefined)delete process.env.B18_EARNING_POLICY_VERSION;
  else process.env.B18_EARNING_POLICY_VERSION=originalFinance;
  if(oldGps===undefined)delete process.env.GPS_CONSENT_POLICY_VERSION;
  else process.env.GPS_CONSENT_POLICY_VERSION=oldGps;
  if(oldKey===undefined)delete process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
  else process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=oldKey;
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
