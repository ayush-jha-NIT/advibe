import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {once} from "node:events";
import type {AddressInfo} from "node:net";
import test from "node:test";
import argon2 from "argon2";
import {PrismaClient,type User} from "@prisma/client";
import {createApp} from "../src/app.js";
import {loadConfig} from "../src/config/env.js";
import {createLogger} from "../src/lib/logger.js";
import {hashToken,mac,makeSessionToken} from "../src/modules/auth/security.js";
import {loadAuthSettings} from "../src/modules/auth/settings.js";
import {encryptTotpSecret} from "../src/modules/auth/mfa.js";
import {leaseJobs,processLeasedJob,runNotificationJobs} from "../src/modules/support/jobs.js";

const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!url)
 throw new Error("B20 tests require disposable PostgreSQL");
const target=new URL(url);
if(!["localhost","127.0.0.1","::1"].includes(target.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1)))
 throw new Error("B20 refuses remote or shared databases");

test("B20 support RBAC, maintenance, durable notifications, lease/retry/dead letters",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 const tag=randomUUID().slice(0,8);
 const hash=await argon2.hash("B20-Long-Support-Password!",{type:argon2.argon2id});
 const users=await Promise.all(["driver","otherDriver","owner","stranger","admin"].map(async kind=>
  db.user.create({data:{email:"b20-"+kind.toLowerCase()+"-"+tag+"@example.invalid",
   displayName:"B20 "+kind,passwordHash:hash,emailVerifiedAt:new Date(),
   status:"ACTIVE",role:kind==="admin"?"ADMIN":kind==="owner"||kind==="stranger"?
   "ADVERTISER":"DRIVER"}})));
 const [driver,otherDriver,owner,stranger,admin]=users as [User,User,User,User,User];
 await db.adminMfaCredential.create({data:{userId:admin.id,
  secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  enabledAt:new Date(Date.now()-60000)}});
 type Identity={cookie:string;csrf:string};
 const identities=await Promise.all(users.map(async u=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+3600000),
   ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 }));
 const [driverAuth,otherAuth,ownerAuth,strangerAuth,adminAuth]=identities as [Identity,Identity,Identity,Identity,Identity];
 const business=await db.business.create({data:{
  ownerUserId:owner.id,slug:"b20-company-"+tag,displayName:"B20 Company"}});
 const foreign=await db.business.create({data:{
  ownerUserId:stranger.id,slug:"b20-foreign-"+tag,displayName:"B20 Foreign"}});
 await db.businessMembership.createMany({data:[
  {businessId:business.id,userId:owner.id,role:"OWNER"},
  {businessId:foreign.id,userId:stranger.id,role:"OWNER"}]});
 const vehicle=await db.vehicle.create({data:{
  driverUserId:driver.id,type:"AUTO",model:"B20 test",year:2025,verification:"APPROVED"}});
 const foreignVehicle=await db.vehicle.create({data:{
  driverUserId:otherDriver.id,type:"AUTO",model:"B20 other",year:2025,verification:"APPROVED"}});
 const screen=await db.screen.create({data:{
  vehicleId:vehicle.id,placement:"AUTO_REAR",state:"PAIRED",
  installationReference:"b20-"+tag}});
 const otherScreen=await db.screen.create({data:{
  vehicleId:foreignVehicle.id,placement:"AUTO_REAR",state:"PAIRED",
  installationReference:"b20-other-"+tag}});
 const app=createApp(config,createLogger(config),async()=>db.user.count().then(()=>{}),
  {db,settings,sender:async()=>{}},async()=>false);
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const request=(method:string,path:string,who:Identity,body?:object,key?:string,csrf=true)=>{
   const headers:Record<string,string>={Cookie:who.cookie,Origin:"http://localhost:3000"};
   if(csrf)headers["X-CSRF-Token"]=who.csrf;
   if(body)headers["Content-Type"]="application/json";
   if(key)headers["Idempotency-Key"]=key;
   return fetch(root+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  };
  const post=(path:string,who:Identity,body:object,key?:string)=>
   request("POST",path,who,body,key);
  const get=(path:string,who:Identity)=>request("GET",path,who);
  const patch=(path:string,who:Identity,body:object)=>request("PATCH",path,who,body);
  const open={category:"DEVICE",screenId:screen.id,subject:"Screen stopped working",
   description:"Screen flickers intermittently and needs field inspection"};
  assert.equal((await post("/support/tickets",driverAuth,open)).status,422);
  assert.equal((await request("POST","/support/tickets",driverAuth,open,"b20-csrf-"+tag,false)).status,403);
  assert.equal((await post("/support/tickets",otherAuth,open,"b20-other-"+tag)).status,404);
  assert.equal((await post("/support/tickets",driverAuth,{
   ...open,screenId:otherScreen.id},"b20-screen-"+tag)).status,404);
  assert.equal((await post("/support/tickets",ownerAuth,open,"b20-ad-screen-"+tag)).status,422);
  const created=await post("/support/tickets",driverAuth,open,"b20-driver-"+tag);
  assert.equal(created.status,201,JSON.stringify(await created.json()));
  const stored=await db.supportTicket.findFirstOrThrow({where:{
   createdByUserId:driver.id}});
  assert.equal((await post("/support/tickets",driverAuth,open,"b20-driver-"+tag)).status,201);
  assert.equal((await post("/support/tickets",driverAuth,{...open,subject:"Different title"},
   "b20-driver-"+tag)).status,409);
  assert.equal((await get("/support/tickets/"+stored.id,otherAuth)).status,404);
  assert.equal((await get("/support/tickets/"+stored.id,strangerAuth)).status,404);
  assert.equal((await get("/support/tickets/"+stored.id,adminAuth)).status,200);
  assert.deepEqual((await (await get("/support/tickets",otherAuth)).json() as {
   data:Array<{id:string}>}).data,[]);
  const advert={category:"BILLING",businessId:business.id,
   subject:"Payment query for booking",description:"Please clarify the invoice schedule"};
  assert.equal((await post("/support/tickets",strangerAuth,advert,"b20-otherbus-"+tag)).status,404);
  assert.equal((await post("/support/tickets",ownerAuth,advert,"b20-advert-"+tag)).status,201);
  const advertTicket=await db.supportTicket.findFirstOrThrow({where:{businessId:business.id}});
  assert.equal((await get("/support/tickets/"+advertTicket.id,strangerAuth)).status,404);
  assert.equal((await get("/support/tickets/"+advertTicket.id,ownerAuth)).status,200);
  assert.equal((await post("/support/tickets/"+stored.id+"/messages",driverAuth,
   {body:"Private operator entry",visibility:"INTERNAL"},"b20-internaldeny-"+tag)).status,403);
  const note=await post("/support/tickets/"+stored.id+"/messages",adminAuth,
   {body:"Maintenance route assigned to field operations",visibility:"INTERNAL"},
   "b20-internal-"+tag);
  assert.equal(note.status,201);
  assert.equal((await post("/support/tickets/"+stored.id+"/messages",otherAuth,
   {body:"Can I see this ticket?"},"b20-hijack-"+tag)).status,404);
  const visible=(await (await get("/support/tickets/"+stored.id,driverAuth)).json() as {
   data:{messages:Array<{visibility:string}>}}).data;
  assert.equal(visible.messages.length,0);
  const administrative=(await (await get("/support/tickets/"+stored.id,adminAuth)).json() as {
   data:{messages:Array<{visibility:string}>}}).data;
  assert.equal(administrative.messages.length,1);
  const publicMessage=await post("/support/tickets/"+stored.id+"/messages",driverAuth,
   {body:"Awaiting technical inspection",visibility:"PUBLIC"},"b20-public-"+tag);
  assert.equal(publicMessage.status,201);
  assert.equal((await post("/support/tickets/"+stored.id+"/messages",driverAuth,
   {body:"Awaiting technical inspection",visibility:"PUBLIC"},"b20-public-"+tag)).status,201);
  const maintenance=await post("/admin/support/tickets/"+stored.id+"/maintenance",adminAuth,
   {},"b20-maint-"+tag);
  assert.equal(maintenance.status,201,JSON.stringify(await maintenance.json()));
  const caseFile=await db.screenMaintenance.findUniqueOrThrow({where:{ticketId:stored.id}});
  assert.equal((await post("/admin/support/tickets/"+stored.id+"/maintenance",adminAuth,
   {},"b20-maint-"+tag)).status,201);
  assert.equal((await post("/admin/support/tickets/"+stored.id+"/maintenance",adminAuth,
   {},"b20-maint2-"+tag)).status,409);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,driverAuth,{
   expectedState:"OPEN",state:"IN_PROGRESS"})).status,403);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,adminAuth,{
   expectedState:"OPEN",state:"RESOLVED"})).status,422);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,adminAuth,{
   expectedState:"OPEN",state:"IN_PROGRESS"})).status,200);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,adminAuth,{
   expectedState:"OPEN",state:"IN_PROGRESS"})).status,409);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,adminAuth,{
   expectedState:"IN_PROGRESS",state:"RESOLVED"})).status,422);
  assert.equal((await patch("/admin/maintenance/"+caseFile.id,adminAuth,{
   expectedState:"IN_PROGRESS",state:"RESOLVED",resolutionNote:"Display connector replaced in field"})).status,200);
  assert.equal((await get("/maintenance",otherAuth)).status,200);
  assert.equal((await get("/maintenance",driverAuth)).status,200);
  assert.equal((await patch("/admin/support/tickets/"+stored.id,ownerAuth,{
   expectedVersion:1,status:"IN_PROGRESS"})).status,403);
  assert.equal((await patch("/admin/support/tickets/"+stored.id,adminAuth,{
   expectedVersion:1,status:"IN_PROGRESS"})).status,200);
  assert.equal((await patch("/admin/support/tickets/"+stored.id,adminAuth,{
   expectedVersion:1,status:"RESOLVED"})).status,409);
  assert.equal((await patch("/admin/support/tickets/"+stored.id,adminAuth,{
   expectedVersion:2,status:"RESOLVED"})).status,200);
  assert.equal((await patch("/admin/support/tickets/"+stored.id,adminAuth,{
   expectedVersion:3,status:"CLOSED"})).status,200);
  assert.equal((await post("/support/tickets/"+stored.id+"/messages",driverAuth,
   {body:"Should be rejected"},"b20-closed-"+tag)).status,409);
  const firstJob=await db.durableJob.findFirstOrThrow({where:{
   ticketId:stored.id,recipientUserId:driver.id,state:"PENDING"}});
  const lease=await leaseJobs(db,50);
  assert.ok(lease.length>0);
  const specific=lease.find(x=>x.id===firstJob.id)!;
  assert.ok(specific);
  const [one,two]=await Promise.all([processLeasedJob(db,specific),processLeasedJob(db,specific)]);
  assert.deepEqual([one,two].sort(),["completed","stale"]);
  const before=await db.userNotification.count({where:{dedupeKey:firstJob.dedupeKey}});
  assert.equal(before,1);
  // Reclaim expired job lease, but old worker token may no longer deliver.
  const victim=lease.find(x=>x.id!==specific.id)!;
  assert.ok(victim);
  await db.durableJob.update({where:{id:victim.id},
   data:{state:"LEASED",leaseUntil:new Date(Date.now()-1000)}});
  const reclaims=await leaseJobs(db,50);
  const replacement=reclaims.find(x=>x.id===victim.id)!;
  assert.ok(replacement);
  assert.equal(await processLeasedJob(db,victim),"stale");
  assert.equal(await processLeasedJob(db,replacement),"completed");
  // Controlled failure -> backoff -> dead letter, no duplicate receipt.
  const failing=lease.find(x=>x.id!==specific.id&&x.id!==victim.id)!;
  assert.ok(failing);
  assert.equal(await processLeasedJob(db,failing,async()=>{throw Error("synthetic failure")}),"failed");
  for(let k=1;k<5;k++){
   await db.durableJob.update({where:{id:failing.id},data:{availableAt:new Date(Date.now()-1000)}});
   const claims=await leaseJobs(db,50);
   const attempt=claims.find(x=>x.id===failing.id);
   assert.ok(attempt);
   assert.equal(await processLeasedJob(db,attempt!,async()=>{throw Error("synthetic failure")}),"failed");
  }
  assert.equal((await db.durableJob.findUniqueOrThrow({where:{id:failing.id}})).state,"DEAD");
  assert.equal((await post("/admin/jobs/"+failing.id+"/retry",driverAuth,{})).status,403);
  assert.equal((await post("/admin/jobs/"+failing.id+"/retry",adminAuth,{})).status,200);
  assert.equal((await db.durableJob.findUniqueOrThrow({where:{id:failing.id}})).attempts,0);
  const remaining=await runNotificationJobs(db,50);
  assert.ok(remaining.leased>=1);
  assert.equal(remaining.failed,0);
  assert.equal(await db.userNotification.count({where:{dedupeKey:firstJob.dedupeKey}}),1);
  const notices=await get("/notifications",driverAuth);
  assert.equal(notices.status,200);
  const inbox=(await notices.json() as {data:Array<{id:string;readAt:string|null}>,
   meta:{unreadCount:number}});assert.ok(inbox.data.length>0);
  const item=inbox.data[0]!;
  assert.equal((await post("/notifications/"+item.id+"/read",otherAuth,{})).status,404);
  assert.equal((await post("/notifications/"+item.id+"/read",driverAuth,{})).status,200);
  assert.equal((await post("/notifications/"+item.id+"/read",driverAuth,{})).status,200);
  assert.equal((await get("/admin/jobs",driverAuth)).status,403);
  assert.equal((await get("/admin/jobs",adminAuth)).status,200);
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
