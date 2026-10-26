import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { Prisma, PrismaClient, type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken, mac, makeSessionToken } from "../src/modules/auth/security.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";
import { encryptTotpSecret } from "../src/modules/auth/mfa.js";

const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!url)
  throw new Error("B9 requires disposable local PostgreSQL");
const target=new URL(url);
if(!["localhost","127.0.0.1","::1"].includes(target.hostname)||
    !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1)))
  throw new Error("Refusing non-test database");
type Identity={cookie:string;csrf:string};
test("B9 city/zone/location catalog, GiST radius/bbox, privacy and screen mapping",async()=>{
  const db=new PrismaClient();
  const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
  const settings=loadAuthSettings({
    AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
    MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57",
  },config);
  await db.$connect();
  const seed=randomUUID().slice(0,8);
  const passwordHash=await argon2.hash("B9-Good-Test-Password-2026!",{type:argon2.argon2id});
  const rows=await Promise.all(["admin","driver","outsider","advertiser"].map(async role=>
    db.user.create({data:{email:"b9-"+role+"-"+seed+"@example.invalid",
      displayName:"B9 "+role,passwordHash,status:"ACTIVE",emailVerifiedAt:new Date(),
      role:role==="admin"?"ADMIN":role==="advertiser"?"ADVERTISER":"DRIVER"}})));
  const [admin,driver,outsider,advertiser]=rows as [User,User,User,User];
  await db.adminMfaCredential.create({data:{userId:admin.id,
    secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
    enabledAt:new Date(Date.now()-60000)}});
  async function session(u:User):Promise<Identity>{
    const token=makeSessionToken();
    await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
      expiresAt:new Date(Date.now()+600000),
      ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
    }});
    return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
  }
  const identities=await Promise.all([admin,driver,outsider,advertiser].map(session));
  const [staff,d1,d2,ads]=identities as [Identity,Identity,Identity,Identity];
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
    const get=(p:string,who?:Identity)=>send("GET",p,who);
    const post=(p:string,b:object,who?:Identity,key?:string)=>send("POST",p,who,b,key);
    const patch=(p:string,b:object,who?:Identity)=>send("PATCH",p,who,b);
    const read=async<T>(res:globalThis.Response)=>await res.json() as T;
    const city={slug:"prayagraj-"+seed,name:"Prayagraj",countryCode:"IN",timeZone:"Asia/Kolkata"};
    assert.equal((await post("/admin/cities",city,d1,"driver-city-"+seed)).status,403);
    assert.equal((await post("/admin/cities",city,staff)).status,422);
    assert.equal((await send("POST","/admin/cities",staff,city,"no-csrf-"+seed,false)).status,403);
    assert.equal((await post("/admin/cities",{...city,timeZone:"Not/AZone"},staff,"bad-tz-"+seed)).status,422);
    const cityResponse=await post("/admin/cities",city,staff,"city-"+seed);
    assert.equal(cityResponse.status,201);
    const createdCity=await read<{data:{id:string;state:string}}>(cityResponse);
    assert.equal(createdCity.data.state,"draft");
    const cityId=createdCity.data.id;
    assert.equal((await post("/admin/cities",city,staff,"city-"+seed)).status,201);
    assert.equal((await post("/admin/cities",{...city,name:"changed"},staff,"city-"+seed)).status,409);
    assert.equal((await get("/public/cities")).status,200);
    assert.deepEqual((await read<{data:unknown[]}>(await get("/public/cities"))).data,[]);
    assert.equal((await get("/admin/cities",d1)).status,403);
    const zoneData={cityId,slug:"civil-lines",name:"Civil Lines",
      centerLat:25.454,centerLng:81.833,radiusMeters:2500};
    const zoneResponse=await post("/admin/zones",zoneData,staff,"zone-"+seed);
    assert.equal(zoneResponse.status,201);
    const zoneId=(await read<{data:{id:string;state:string}}>(zoneResponse)).data.id;
    assert.equal((await patch("/admin/zones/"+zoneId,{state:"published"},staff)).status,409,
      "Zone cannot publish while its parent city is a draft");
    assert.equal((await patch("/admin/cities/"+cityId,{state:"published"},staff)).status,200);
    assert.equal((await patch("/admin/zones/"+zoneId,{state:"published"},staff)).status,200);
    const inside={zoneId,slug:"site-one",name:"Approved location one",lat:25.455,lng:81.833};
    assert.equal((await post("/admin/locations",{...inside,lat:26},staff,"bad-site-"+seed)).status,422);
    const a=await post("/admin/locations",inside,staff,"site-one-"+seed);
    assert.equal(a.status,201);
    const site1=(await read<{data:{id:string;state:string}}>(a)).data;
    assert.equal(site1.state,"draft");
    const hidden=(await read<{data:unknown[]}>(await get("/public/locations"))).data;
    assert.deepEqual(hidden,[],"Draft sites must not leak publicly");
    assert.equal((await patch("/admin/zones/"+zoneId,{centerLat:26.5},staff)).status,409,
      "Zone geometry locked once sites exist");
    assert.equal((await patch("/admin/locations/"+site1.id,{state:"published"},d1)).status,403);
    assert.equal((await patch("/admin/locations/"+site1.id,{state:"published"},staff)).status,200);
    assert.equal((await post("/admin/locations",{...inside,slug:"site-two",name:"Site two",lat:25.459},
      staff,"site-two-"+seed)).status,201);
    const locations=(await read<{data:Array<{id:string;lat:number;city:string;zone:string}>;meta:{
      limit:number;nextCursor:string|null}}>(await get("/public/locations"))).data;
    assert.equal(locations.length,1);
    assert.equal(locations[0]!.id,site1.id);
    assert.equal(locations[0]!.city,"Prayagraj");
    assert.equal((await get("/locations",ads)).status,200);
    const adminList=await get("/admin/locations",staff);
    assert.equal(adminList.status,200);
    assert.equal((await read<{data:unknown[]}>(adminList)).data.length,2);
    assert.equal((await get("/admin/locations",d1)).status,403);
    assert.equal((await get("/public/locations?minLat=24&minLng=80&maxLat=27")).status,422);
    assert.equal((await get("/public/locations?minLat=0&minLng=0&maxLat=90&maxLng=180")).status,422);
    assert.equal((await get("/public/locations?cursor=bogus")).status,422);
    assert.equal((await get("/public/locations?lat=25.45&lng=81.83")).status,422);
    const bboxes=[
      "/public/locations?minLat=25.44&minLng=81.82&maxLat=25.47&maxLng=81.84",
      "/public/locations?lat=25.454&lng=81.833&radiusMeters=700",
    ];
    for(const p of bboxes){
      const result=await get(p);assert.equal(result.status,200,p);
      assert.deepEqual((await read<{data:Array<{id:string}>}>(result)).data.map(x=>x.id),[site1.id]);
    }
    assert.deepEqual((await read<{data:unknown[]}>(await get(
      "/public/locations?lat=25.5&lng=81.9&radiusMeters=100"))).data,[]);
    assert.equal((await get("/public/locations?citySlug="+city.slug)).status,200);
    assert.equal((await get("/public/locations?citySlug=othercity")).status,200);
    const site2Row=await db.location.findFirstOrThrow({where:{zoneId,slug:"site-two"}});
    assert.equal((await patch("/admin/locations/"+site2Row.id,{state:"published"},staff)).status,200);
    const page1=await read<{data:Array<{id:string}>;meta:{nextCursor:string|null}}>(
      await get("/public/locations?limit=1"));
    assert.equal(page1.data.length,1);assert.ok(page1.meta.nextCursor);
    const page2=await read<{data:Array<{id:string}>;meta:{nextCursor:string|null}}>(
      await get("/public/locations?limit=1&cursor="+page1.meta.nextCursor));
    assert.equal(page2.data.length,1);assert.notEqual(page1.data[0]!.id,page2.data[0]!.id);
    assert.equal((await get("/public/formats")).status,200);
    const formats=(await read<{data:Array<{placement:string;description:string}>}>(
      await get("/public/formats"))).data;
    assert.equal(formats.length,6);
    assert.match(formats[0]!.description,/not bookable/i);
    assert.equal((await get("/public/formats?cursor=broken")).status,422);
    const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,type:"AUTO",
      model:"B9 Auto",year:2025}});
    const screen=await db.screen.create({data:{vehicleId:vehicle.id,placement:"AUTO_REAR",
      state:"PAIRED",installationReference:"trusted-stage-test-reference"}});
    assert.equal((await send("PUT","/admin/screens/"+screen.id+"/location",staff,
      {locationId:site1.id})).status,409,"Unapproved driver cannot assign screen");
    await db.driverApplication.create({data:{driverUserId:driver.id,vehicleId:vehicle.id,
      vehicleCategory:"AUTO",state:"APPROVED",completedStep:5,submittedAt:new Date(),
      city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
      agreementTemplateVersion:"b9-test-only",confirmedReadiness:true}});
    assert.equal((await send("PUT","/admin/screens/"+screen.id+"/location",d1,
      {locationId:site1.id})).status,403);
    const assigned=await send("PUT","/admin/screens/"+screen.id+"/location",staff,{locationId:site1.id});
    assert.equal(assigned.status,200);
    const mapped=(await read<{data:{locationId:string;inventoryStatus:string}}>(assigned)).data;
    assert.equal(mapped.locationId,site1.id);
    assert.equal(mapped.inventoryStatus,"NOT_BOOKABLE");
    assert.equal((await patch("/admin/locations/"+site1.id,{lat:25.452},staff)).status,409);
    const screens=await read<{data:Array<{screenId:string;bookable:boolean}>}>(
      await get("/admin/locations/"+site1.id+"/screens",staff));
    assert.equal(screens.data.length,1);assert.equal(screens.data[0]!.bookable,false);
    assert.equal((await get("/admin/locations/"+site1.id+"/screens",ads)).status,403);
    assert.equal((await patch("/admin/cities/"+cityId,{state:"archived"},staff)).status,200);
    assert.deepEqual((await read<{data:unknown[]}>(await get("/public/locations"))).data,[],
      "Archiving the city hides all descendants without deleting linked screens");
    assert.equal((await patch("/admin/cities/"+cityId,{state:"published"},staff)).status,409);
    const indexes=await db.$queryRaw<Array<{indexname:string}>>(
      Prisma.sql`SELECT indexname FROM pg_indexes WHERE tablename='Location' AND indexname='Location_lonlat_gist_idx'`);
    assert.equal(indexes.length,1,"Native PostgreSQL GiST spatial index must exist");
    assert.ok(await db.auditEvent.count({where:{resourceType:"location",resourceId:site1.id}}));
    assert.ok((await db.screen.findUniqueOrThrow({where:{id:screen.id}})).locationId);
    assert.equal((await get("/public/locations?noSuchFilter=1")).status,422);
    assert.equal((await get("/admin/locations?lat=25.45&lng=81.83&radiusMeters=500",staff)).status,200);
    // Never store or return driver GPS trip logs at B9.
    assert.equal((await db.location.count({where:{zoneId}})),2);
    assert.equal((await get("/locations",d2)).status,200);
    assert.equal(outsider.role,"DRIVER");assert.equal(advertiser.role,"ADVERTISER");
  }finally{
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await db.$disconnect();
  }
});
