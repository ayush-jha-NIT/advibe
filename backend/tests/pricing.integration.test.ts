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
import { bpsAmount,computeMoney,selectedDays } from "../src/modules/pricing/money.js";

const dburl=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!dburl)
 throw new Error("B11 tests only run against disposable PostgreSQL");
const url=new URL(dburl);
if(!["localhost","127.0.0.1","::1"].includes(url.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(url.pathname.slice(1)))
 throw new Error("B11 refuses shared or production database");

test("B11 exact paise rounding, versioned rates and tenant-scoped immutable quotes",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 assert.equal(bpsAmount(1n,5000),1n);
 assert.equal(bpsAmount(101n,100),1n);
 assert.deepEqual(computeMoney([10001],3,1800,
  {kind:"FIXED_PAISE",value:101}),{
   subtotalPaise:30003n,discountPaise:101n,taxablePaise:29902n,
   taxPaise:5382n,totalPaise:35284n,
 });
 assert.equal(computeMoney([100],1,0,{kind:"FIXED_PAISE",value:1000}).totalPaise,0n);
 assert.throws(()=>computeMoney([1000000000],60,10000,
  {kind:"PERCENT_BPS",value:10001}),/Invalid rate in basis points/);
 const seed=randomUUID().slice(0,8);
 const hash=await argon2.hash("B11-Strong-Test-Password-2026!",{type:argon2.argon2id});
 const users=await Promise.all(["advertiser","other","admin","driver"].map(async role=>
  db.user.create({data:{email:"b11-"+role+"-"+seed+"@example.invalid",
   displayName:"B11 "+role,passwordHash:hash,emailVerifiedAt:new Date(),
   status:"ACTIVE",role:role==="admin"?"ADMIN":role==="driver"?"DRIVER":"ADVERTISER"}})));
 const [owner,other,admin,driver]=users as [User,User,User,User];
 await db.adminMfaCredential.create({data:{userId:admin.id,
  secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  enabledAt:new Date(Date.now()-60000)}});
 type Auth={cookie:string;csrf:string};
 const identities=await Promise.all(users.map(async u=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+600000),
   ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 }));
 const [advertiser,foreign,staff,driverSession]=identities as Auth[];
 const business=await db.business.create({data:{
  ownerUserId:owner.id,slug:"b11-"+seed,displayName:"B11 Advertiser",
  verificationStatus:"APPROVED"}});
 const otherBusiness=await db.business.create({data:{
  ownerUserId:other.id,slug:"b11-other-"+seed,displayName:"Other Advertiser"}});
 await db.businessMembership.createMany({data:[
  {businessId:business.id,userId:owner.id,role:"OWNER"},
  {businessId:otherBusiness.id,userId:other.id,role:"OWNER"}]});
 const city=await db.city.create({data:{slug:"b11-city-"+seed,name:"Test City",
  countryCode:"IN",timeZone:"Asia/Kolkata",state:"PUBLISHED"}});
 const zone=await db.zone.create({data:{cityId:city.id,slug:"pricing-zone",
  name:"Commercial zone",centerLat:25.454,centerLng:81.833,radiusMeters:1000,state:"PUBLISHED"}});
 const site=await db.location.create({data:{zoneId:zone.id,slug:"test-site",
  name:"Pilot location",latitude:25.454,longitude:81.833,state:"PUBLISHED"}});
 const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,type:"AUTO",
  model:"B11 test auto",year:2025}});
 await db.driverApplication.create({data:{driverUserId:driver.id,
  vehicleId:vehicle.id,vehicleCategory:"AUTO",state:"APPROVED",completedStep:5,
  city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
  agreementTemplateVersion:"b11-test-version",confirmedReadiness:true,submittedAt:new Date()}});
 const screen=await db.screen.create({data:{vehicleId:vehicle.id,locationId:site.id,
  placement:"AUTO_REAR",state:"PAIRED",installationReference:"testing-only-not-installed"}});
 const unpaired=await db.screen.create({data:{vehicleId:vehicle.id,
  placement:"AUTO_SIDE",state:"UNPAIRED",installationReference:"unused-unpaired"}});
 const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
  {db,settings,sender:async()=>{}},async()=>false);
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const base="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const send=(method:string,path:string,auth?:Auth,body?:object,key?:string,csrf=true)=>{
   const headers:Record<string,string>={Origin:"http://localhost:3000"};
   if(auth)headers.Cookie=auth.cookie;
   if(auth&&csrf)headers["X-CSRF-Token"]=auth.csrf;
   if(key)headers["Idempotency-Key"]=key;
   if(body)headers["Content-Type"]="application/json";
   return fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  };
  const get=(path:string,who?:Auth)=>send("GET",path,who);
  const post=(path:string,body:object,who?:Auth,key?:string)=>send("POST",path,who,body,key);
  const day=(offset:number)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
  const dateA=day(2),dateB=day(4),from=day(0),until=day(180);
  assert.equal(selectedDays(dateA,dateB,[0,1,2,3,4,5,6]),3);
  const input={businessId:business.id,campaignId:randomUUID(),
   screenIds:[screen.id],startDate:dateA,endDate:dateB,weekdays:[0,1,2,3,4,5,6]};
  assert.equal((await post("/pricing/quotes",input,advertiser)).status,422);
  assert.equal((await post("/pricing/quotes",input,foreign,"foreign-"+seed)).status,404);
  assert.equal((await post("/pricing/quotes",input,driverSession,"driver-"+seed)).status,403);
  assert.equal((await post("/pricing/quotes",{...input,screenIds:[screen.id,screen.id]},
   advertiser,"duplicate-screen-"+seed)).status,422);
  assert.equal((await post("/pricing/quotes",input,advertiser,"unconfigured-"+seed)).status,409);
  assert.equal((await get("/pricing/rules",advertiser)).status,403);
  const rule={cityId:city.id,placement:"auto_rear",
   ratePaisePerScreenDay:10001,validFrom:from,validTo:until,active:true};
  assert.equal((await post("/admin/pricing/rules",rule,advertiser,"role-"+seed)).status,403);
  assert.equal((await send("POST","/admin/pricing/rules",staff,rule,"csrf-"+seed,false)).status,403);
  const first=await post("/admin/pricing/rules",rule,staff,"rate-"+seed);
  assert.equal(first.status,201);
  const pricing=(await first.json() as {data:{id:string;version:number}}).data;
  assert.equal(pricing.version,1);
  assert.equal((await post("/admin/pricing/rules",rule,staff,"rate-"+seed)).status,201);
  const taxInput={version:"legal-test-"+seed,taxBps:1800,active:true,
   validFrom:from,validTo:until,sourceReference:"reviewed-tax-policy-fixture-"+seed};
  const tax=await post("/admin/pricing/tax-policies",taxInput,staff,"tax-"+seed);
  assert.equal(tax.status,201);
  assert.equal((await post("/admin/pricing/tax-policies",{...taxInput,version:"overlap-"+seed},
   staff,"overlap-"+seed)).status,409);
  const discount={code:"B11"+seed.toUpperCase(),expectedVersion:0,kind:"fixed_paise",
   value:101,validFrom:from,validTo:until,active:true};
  const coupon=await post("/admin/pricing/discounts",discount,staff,"discount-"+seed);
  assert.equal(coupon.status,201);
  const request={...input,discountCode:discount.code};
  const quotation=await post("/pricing/quotes",request,advertiser,"quote-"+seed);
  assert.equal(quotation.status,201);
  const quoted=(await quotation.json() as {data:{id:string;totalPaise:number;
   subtotalPaise:number;discountPaise:number;taxPaise:number;
   version:number;reservationStatus:string;taxPolicyVersion:string;
   pricingSnapshot:{lines:Array<{rateVersion:number}>}}}).data;
  assert.equal(quoted.subtotalPaise,30003);
  assert.equal(quoted.discountPaise,101);
  assert.equal(quoted.taxPaise,5382);
  assert.equal(quoted.totalPaise,35284);
  assert.equal(quoted.version,1);assert.equal(quoted.reservationStatus,"NOT_BOOKED");
  assert.equal(quoted.taxPolicyVersion,taxInput.version);
  assert.equal(quoted.pricingSnapshot.lines[0]?.rateVersion,1);
  assert.equal((await post("/pricing/quotes",request,advertiser,"quote-"+seed)).status,201);
  assert.equal(await db.priceQuote.count({where:{businessId:business.id}}),1);
  assert.equal((await post("/pricing/quotes",{...request,discountCode:undefined},
   advertiser,"quote-"+seed)).status,409);
  assert.equal((await get("/pricing/quotes/"+quoted.id,foreign)).status,404);
  assert.equal((await get("/pricing/quotes/"+quoted.id,advertiser)).status,200);
  assert.equal((await get("/pricing/quotes?businessId="+business.id,foreign)).status,404);
  assert.equal((await get("/pricing/quotes?businessId="+business.id,advertiser)).status,200);
  assert.equal((await post("/pricing/quotes",{...request,screenIds:[unpaired.id]},
   advertiser,"unpaired-"+seed)).status,422);
  const revision={expectedVersion:1,ratePaisePerScreenDay:20000,
   validFrom:from,validTo:until,active:true};
  assert.equal((await send("PUT","/admin/pricing/rules/"+pricing.id,staff,revision)).status,200);
  assert.equal((await send("PUT","/admin/pricing/rules/"+pricing.id,staff,revision)).status,409);
  const second=await post("/pricing/quotes",request,advertiser,"quote-new-"+seed);
  assert.equal(second.status,201);
  const newQuote=(await second.json() as {data:{subtotalPaise:number;
   pricingSnapshot:{lines:Array<{rateVersion:number}>}}}).data;
  assert.equal(newQuote.subtotalPaise,60000);
  assert.equal(newQuote.pricingSnapshot.lines[0]?.rateVersion,2);
  const old=await get("/pricing/quotes/"+quoted.id,advertiser);
  assert.equal((await old.json() as {data:{totalPaise:number}}).data.totalPaise,35284,
   "Historical quotes must retain their original rule snapshots");
  await assert.rejects(db.priceQuote.update({where:{id:quoted.id},
   data:{totalPaise:1n}}),"Quotes must be immutable at the database layer");
  const rateRevision=await db.rateRevision.findFirstOrThrow({where:{ruleId:pricing.id,version:1}});
  await assert.rejects(db.rateRevision.delete({where:{id:rateRevision.id}}),
   "Rate revisions are append-only");
  assert.equal(await db.auditEvent.count({where:{resourceType:"price_quote",
   resourceId:quoted.id,action:"pricing.quote_created"}}),1);
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
