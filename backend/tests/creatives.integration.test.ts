import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient, type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken, makeSessionToken, mac } from "../src/modules/auth/security.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";
import { encryptTotpSecret } from "../src/modules/auth/mfa.js";
import { processOneCreative } from "../src/modules/creatives/process.js";
import { sniffMime } from "../src/modules/creatives/schemas.js";
import type { PrivateCreativeStorage } from "../src/modules/creatives/storage.js";
import type { CreativeMediaProcessor } from "../src/modules/creatives/processor.js";

const uri=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!uri)
  throw new Error("Only disposable test Postgres allowed");
const dbHost=new URL(uri);
if(!["localhost","127.0.0.1","::1"].includes(dbHost.hostname)||
   !/(^|[_-])(test|ci)([_-]|$)/.test(dbHost.pathname.slice(1)))
  throw new Error("Refusing non-test database");
test("B10 private media, authorized moderation and isolation",async()=>{
  const db=new PrismaClient();
  const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
  const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
    MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
  await db.$connect();
  const seed=randomUUID().slice(0,8);
  const passwordHash=await argon2.hash("B10-Safe-Test-Password-2026!",{type:argon2.argon2id});
  const users=await Promise.all(["advertiser","other","admin","driver"].map(async kind=>
    db.user.create({data:{email:"b10-"+kind+"-"+seed+"@example.invalid",
      displayName:"B10 "+kind,passwordHash,status:"ACTIVE",emailVerifiedAt:new Date(),
      role:kind==="admin"?"ADMIN":kind==="driver"?"DRIVER":"ADVERTISER"}})));
  const [owner,other,admin]=users as [User,User,User];
  await db.adminMfaCredential.create({data:{userId:admin.id,
    secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
    enabledAt:new Date(Date.now()-60000)}});
  const credentials=await Promise.all(users.map(async u=>{
    const token=makeSessionToken();
    await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
      expiresAt:new Date(Date.now()+600000),
      ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
    }});
    return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
  }));
  const [alice,bob,staff,motorist]=credentials as Array<{cookie:string;csrf:string}>;
  const own=await db.business.create({data:{ownerUserId:owner.id,
    slug:"media-"+seed,displayName:"B10 Media Agency"}});
  const foreign=await db.business.create({data:{ownerUserId:other.id,
    slug:"foreign-media-"+seed,displayName:"Other Agency"}});
  await db.businessMembership.createMany({data:[
    {businessId:own.id,userId:owner.id,role:"OWNER"},
    {businessId:foreign.id,userId:other.id,role:"OWNER"},
  ]});
  const fixture=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/BVEAAAAASUVORK5CYII=","base64");
  assert.equal(sniffMime(fixture),"image/png");
  const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
  const objects=new Map<string,{bytes:Buffer;mime:string;version:string}>();
  const storage:PrivateCreativeStorage={
    async signedPut(key){return {url:"https://creative-test.invalid/put/"+encodeURIComponent(key),headers:{}};},
    async signedGet(key,version){return "https://creative-test.invalid/view/"+key+"?v="+version;},
    async head(key){const v=objects.get(key);if(!v)throw Error("Missing object");
      return {sizeBytes:v.bytes.length,contentType:v.mime,versionId:v.version};},
    async readVersion(key,version){const v=objects.get(key);
      if(!v||v.version!==version)throw Error("Invalid version");return v.bytes;},
    async writeProcessed(key,mime,bytes){objects.set(key,{bytes,mime,version:"processed-v1"});
      return {sizeBytes:bytes.length,contentType:mime,versionId:"processed-v1"};},
  };
  const worker:CreativeMediaProcessor={async convert(bytes,mime){
    if(sniffMime(bytes)!==mime)throw Error("Wrong source");return {
      bytes,mimeType:"image/png",width:1,height:1,durationMs:null};}};
  const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
    {db,settings,sender:async()=>{}},async()=>false,undefined,{storage});
  const server=app.listen(0,"127.0.0.1");
  try{
    await once(server,"listening");
    const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
    type Who={cookie:string;csrf:string};
    const req=(method:string,path:string,who?:Who,body?:object,key?:string,csrf=true)=>{
      const headers:Record<string,string>={Origin:"http://localhost:3000"};
      if(who)headers.Cookie=who.cookie;
      if(who&&csrf)headers["X-CSRF-Token"]=who.csrf;
      if(key)headers["Idempotency-Key"]=key;
      if(body)headers["Content-Type"]="application/json";
      return fetch(root+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
    };
    const post=(path:string,body:object,who?:Who,key?:string)=>req("POST",path,who,body,key);
    const get=(path:string,who?:Who)=>req("GET",path,who);
    const input={businessId:own.id,contentType:"image/png",sizeBytes:fixture.length,sha256:digest(fixture)};
    assert.equal((await post("/creatives/upload-intents",input,alice)).status,422);
    assert.equal((await req("POST","/creatives/upload-intents",alice,input,"no-csrf-"+seed,false)).status,403);
    assert.equal((await post("/creatives/upload-intents",input,bob,"foreign-"+seed)).status,404);
    assert.equal((await post("/creatives/upload-intents",input,motorist,"driver-"+seed)).status,403);
    const intent=await post("/creatives/upload-intents",input,alice,"intent-"+seed);
    assert.equal(intent.status,201);
    const assetId=(await intent.json() as {data:{assetId:string}}).data.assetId;
    assert.equal((await post("/creatives/upload-intents",input,alice,"intent-"+seed)).status,201);
    assert.equal(await db.mediaAsset.count({where:{businessId:own.id}}),1);
    const asset=await db.mediaAsset.findUniqueOrThrow({where:{id:assetId}});
    objects.set(asset.sourceKey,{bytes:fixture,mime:"image/jpeg",version:"source-v1"});
    assert.equal((await post("/creatives/assets/"+assetId+"/complete",{},alice)).status,422);
    objects.set(asset.sourceKey,{bytes:fixture,mime:"image/png",version:"source-v1"});
    assert.equal((await post("/creatives/assets/"+assetId+"/complete",{},bob)).status,404);
    assert.equal((await post("/creatives/assets/"+assetId+"/complete",{},alice)).status,201);
    assert.equal((await post("/creatives/assets/"+assetId+"/complete",{},alice)).status,409);
    const creativeInput={businessId:own.id,title:"My video creative",placement:"auto_rear",mediaAssetId:assetId};
    assert.equal((await post("/creatives",creativeInput,alice,"too-early-"+seed)).status,422);
    assert.deepEqual(await processOneCreative(db,storage,worker),{id:assetId,state:"ready"});
    const processed=await db.mediaAsset.findUniqueOrThrow({where:{id:assetId}});
    assert.equal(processed.sourceSha256,digest(fixture));assert.ok(processed.scannedAt);
    const status=await get("/creatives/assets/"+assetId,alice);
    assert.equal(status.status,200);
    const payload=JSON.stringify(await status.json());
    assert.ok(!payload.includes(asset.sourceKey));assert.ok(!payload.includes(processed.processedKey!));
    assert.equal((await get("/creatives/assets/"+assetId,bob)).status,404);
    const created=await post("/creatives",creativeInput,alice,"creative-"+seed);
    assert.equal(created.status,201);
    const creativeId=(await created.json() as {data:{id:string;approval:string}}).data.id;
    assert.equal((await post("/creatives",creativeInput,alice,"creative-"+seed)).status,201);
    assert.equal((await get("/creatives/"+creativeId,bob)).status,404);
    assert.equal((await get("/creatives",motorist)).status,403);
    assert.equal((await get("/admin/creatives/"+creativeId+"/preview-url",alice)).status,403);
    assert.equal((await get("/admin/creatives/"+creativeId+"/preview-url",staff)).status,200);
    const decision="/admin/creatives/"+creativeId+"/decision";
    const review={decision:"approved",reason:"Video content and safe branding were reviewed"};
    assert.equal((await post(decision,review,alice,"denied-"+seed)).status,403);
    assert.equal((await req("POST",decision,staff,review,"bad-csrf-"+seed,false)).status,403);
    const approved=await post(decision,review,staff,"review-"+seed);
    assert.equal(approved.status,201);
    assert.equal((await approved.json() as {data:{approval:string}}).data.approval,"approved");
    assert.equal((await post(decision,review,staff,"review-"+seed)).status,201);
    assert.equal((await post(decision,review,staff,"another-"+seed)).status,409);
    assert.equal(await db.creativeReview.count({where:{creativeId}}),1);
    assert.equal(await db.outboxEvent.count({where:{
      aggregateType:"creative",aggregateId:creativeId,eventType:"creative.moderated"}}),1);
    assert.equal((await get("/creatives",bob)).status,200);
    assert.deepEqual((await (await get("/creatives",bob)).json() as {data:unknown[]}).data,[]);
  }finally{
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await db.$disconnect();
  }
});
