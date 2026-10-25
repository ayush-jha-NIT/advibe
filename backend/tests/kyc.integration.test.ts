import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient, type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken, mac, makeSessionToken } from "../src/modules/auth/security.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";
import { encryptTotpSecret } from "../src/modules/auth/mfa.js";
import type { PrivateKycStorage, KycObjectInfo } from "../src/modules/kyc/storage.js";
import type { KycPolicy } from "../src/modules/kyc/settings.js";

const database = process.env.DATABASE_URL;
if (process.env.NODE_ENV!=="test" || process.env.DB_TEST_ALLOWED!=="true" || !database)
  throw new Error("B7 requires isolated local PostgreSQL test database");
const uri=new URL(database);
if (!["localhost","127.0.0.1","::1"].includes(uri.hostname) ||
  !/(^|[_-])(test|ci)([_-]|$)/.test(uri.pathname.slice(1)))
  throw new Error("B7 refuses unsafe database");

test("B7 private uploads, signed scans, legal consent, MFA review and evidence gates",async()=>{
  const db=new PrismaClient();
  const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
  const settings=loadAuthSettings({
    AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
    MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57",
  },config);
  const policy:KycPolicy={retentionDays:30,scanSecret:"b7-test-scan-provider-secret-32-chars-minimum",
    agreementVersion:"legal-reviewed-draft-v7",agreementSha256:"a".repeat(64),
    privacyVersion:"privacy-reviewed-test-v1"};
  const uploaded=new Map<string,KycObjectInfo>();
  const storage:PrivateKycStorage={
    async presignPut(key){return {url:"https://private-storage.invalid/upload/"+encodeURIComponent(key),
      headers:{"content-type":"application/pdf"}};},
    async head(key){const item=uploaded.get(key);
      if(!item)throw new Error("Object has not yet been uploaded");return item;},
    async presignGet(key,versionId){return "https://private-storage.invalid/private/"+
      encodeURIComponent(key)+"?version="+encodeURIComponent(versionId);},
  };
  await db.$connect();
  const hash=await argon2.hash("B7-Strong-Unique-Test-Password!",{type:argon2.argon2id});
  const seed=randomUUID().slice(0,10);
  const users=await Promise.all(["driver","outsider","admin"].map(async role=>db.user.create({data:{
    email:"b7-"+role+"-"+seed+"@example.invalid",displayName:"B7 "+role,
    role:role==="admin"?"ADMIN":"DRIVER",status:"ACTIVE",emailVerifiedAt:new Date(),
    passwordHash:hash,
  }})));
  const [driver,outsider,admin]=users as [User,User,User];
  const mfaEnabledAt=new Date(Date.now()-60000);
  await db.adminMfaCredential.create({data:{userId:admin.id,
    secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
    enabledAt:mfaEnabledAt}});
  type Identity={cookie:string;csrf:string};
  async function makeIdentity(user:User):Promise<Identity>{
    const token=makeSessionToken();
    await db.session.create({data:{userId:user.id,tokenHash:hashToken(token),
      expiresAt:new Date(Date.now()+600_000),
      ...(user.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
    }});
    return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
  }
  const identities=await Promise.all([driver,outsider,admin].map(makeIdentity));
  const [d1,d2,staff]=identities as [Identity,Identity,Identity];
  const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,
    type:"AUTO",model:"B7 verified auto placeholder",year:2024}});
  const application=await db.driverApplication.create({data:{driverUserId:driver.id,
    state:"SUBMITTED",completedStep:5,city:"Prayagraj",experience:"ONE_TO_THREE",
    vehicleId:vehicle.id,vehicleCategory:"AUTO",screenChoice:"rear_window",
    agreementTemplateVersion:policy.agreementVersion,confirmedReadiness:true,
    submittedAt:new Date(),version:6}});
  const app=createApp(config,createLogger(config),async()=>{await db.user.count();},{
    db,settings,sender:async()=>{},
  },async()=>false,{storage,policy});
  const server=app.listen(0,"127.0.0.1");
  try{
    await once(server,"listening");
    const url="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
    const send=(method:string,path:string,who?:Identity,body?:Record<string,unknown>,
      key?:string,signature?:string,withCsrf=true)=>{
      const headers:Record<string,string>={Origin:"http://localhost:3000"};
      if(who)headers.Cookie=who.cookie;
      if(who && withCsrf)headers["X-CSRF-Token"]=who.csrf;
      if(body)headers["Content-Type"]="application/json";
      if(key)headers["Idempotency-Key"]=key;
      if(signature)headers["X-KYC-Signature"]=signature;
      return fetch(url+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
    };
    const get=(path:string,who?:Identity)=>send("GET",path,who);
    const post=(path:string,who?:Identity,body?:Record<string,unknown>,key?:string)=>
      send("POST",path,who,body,key);
    const intro="/drivers/documents/upload-intents";
    const sample={applicationId:application.id,kind:"licence",contentType:"application/pdf",sizeBytes:2000};
    assert.equal((await post(intro,undefined,sample,"untrusted")).status,401);
    assert.equal((await post(intro,staff,sample,"staff-key-123")).status,403);
    assert.equal((await post(intro,d2,sample,"foreign-key-123")).status,404);
    assert.equal((await post(intro,d1,sample)).status,422);
    assert.equal((await send("POST",intro,d1,sample,"no-csrf-123",undefined,false)).status,403);
    assert.equal((await post(intro,d1,{...sample,kind:"aadhaar"},"no-aadhaar-123")).status,422);
    assert.equal((await post(intro,d1,{...sample,sizeBytes:50000000},"oversized-123")).status,422);
    const req=await post(intro,d1,sample,"licence-upload-"+seed);
    assert.equal(req.status,201);
    const intent=(await req.json() as {data:{assetId:string;uploadUrl:string;requiredHeaders:Record<string,string>}}).data;
    assert.ok(intent.uploadUrl.startsWith("https://private-storage.invalid/upload/"));
    const licId=intent.assetId;
    assert.equal((await post(intro,d1,sample,"licence-upload-"+seed)).status,201);
    assert.equal(await db.driverDocument.count({where:{applicationId:application.id,kind:"LICENCE"}}),1);
    assert.equal((await post(intro,d1,{...sample,kind:"other"},"licence-upload-"+seed)).status,409);
    const licRow=await db.driverDocument.findUniqueOrThrow({where:{id:licId}});
    assert.ok(!JSON.stringify(await (await get("/drivers/applications/"+application.id+"/documents",d1)).json())
      .includes(licRow.storageKey),"Never expose private object keys");
    assert.equal((await get("/drivers/applications/"+application.id+"/documents",d2)).status,404);
    assert.equal((await post("/drivers/documents/"+licId+"/complete",d2,{})).status,404);
    const invalidScan={eventId:"first-event-"+seed,documentId:licId,verdict:"clean",
      sha256:"c".repeat(64),versionId:"v1",timestamp:Date.now()};
    assert.equal((await post("/webhooks/kyc/document-scan",undefined,invalidScan)).status,401);
    assert.equal((await post("/admin/driver-documents/"+licId+"/decision",staff,
      {decision:"verified",reason:"Carefully reviewed supplied evidence"})).status,409);
    uploaded.set(licRow.storageKey,{sizeBytes:2000,contentType:"image/png",versionId:"v1"});
    assert.equal((await post("/drivers/documents/"+licId+"/complete",d1,{})).status,422);
    uploaded.set(licRow.storageKey,{sizeBytes:2000,contentType:"application/pdf",versionId:"v1"});
    assert.equal((await post("/drivers/documents/"+licId+"/complete",d1,{})).status,201);
    assert.equal((await post("/drivers/documents/"+licId+"/complete",d1,{})).status,409);
    function sign(input:typeof invalidScan){
      return createHmac("sha256",policy.scanSecret).update(JSON.stringify([
        input.eventId,input.documentId,input.verdict,input.sha256,input.versionId,input.timestamp,
      ])).digest("hex");
    }
    assert.equal((await send("POST","/webhooks/kyc/document-scan",undefined,
      invalidScan,undefined,"0".repeat(64))).status,401);
    assert.equal((await send("POST","/webhooks/kyc/document-scan",undefined,
      {...invalidScan,timestamp:Date.now()-900000},undefined,sign(invalidScan))).status,401);
    assert.equal((await send("POST","/webhooks/kyc/document-scan",undefined,
      invalidScan,undefined,sign(invalidScan))).status,201);
    assert.equal((await send("POST","/webhooks/kyc/document-scan",undefined,
      invalidScan,undefined,sign(invalidScan))).status,409);
    const reviewPath="/admin/driver-documents/"+licId+"/decision";
    assert.equal((await post(reviewPath,d1,
      {decision:"verified",reason:"Reviewed with independent proof"})).status,403);
    // No approval while temporary PUT link is still valid.
    assert.equal((await post(reviewPath,staff,
      {decision:"verified",reason:"Reviewed original version and scan"})).status,409);
    await db.driverDocument.update({where:{id:licId},data:{uploadExpiresAt:new Date(Date.now()-1000)}});
    assert.equal((await post(reviewPath,staff,
      {decision:"verified",reason:"Compared document and clean scan"})).status,201);
    assert.equal((await post(reviewPath,staff,
      {decision:"verified",reason:"Do not review twice"})).status,409);
    const dl=await get("/admin/driver-documents/"+licId+"/download-url",staff);
    assert.equal(dl.status,200);
    const dlData=(await dl.json() as {data:{url:string;expiresInSeconds:number}}).data;
    assert.equal(dlData.expiresInSeconds,60);
    assert.equal((await get("/admin/driver-documents/"+licId+"/download-url",d1)).status,403);
    const decisionPath="/admin/driver-applications/"+application.id+"/decision";
    const approve={decision:"approved",reason:"Evidence reviewed under the current policy"};
    assert.equal((await post(decisionPath,staff,approve,"early-review-"+seed)).status,422);

    const otherKinds=["registration","insurance"] as const;
    for(const kind of otherKinds){
      const input={...sample,kind};
      const intentRes=await post(intro,d1,input,"upload-"+kind+"-"+seed);
      assert.equal(intentRes.status,201);
      const docId=(await intentRes.json() as {data:{assetId:string}}).data.assetId;
      const row=await db.driverDocument.findUniqueOrThrow({where:{id:docId}});
      uploaded.set(row.storageKey,{sizeBytes:row.sizeBytes,contentType:row.contentType,versionId:"v1"});
      assert.equal((await post("/drivers/documents/"+docId+"/complete",d1,{})).status,201);
      const inputScan={eventId:"scan-"+kind+"-"+seed,documentId:docId,verdict:"clean",
        sha256:"d".repeat(64),versionId:"v1",timestamp:Date.now()};
      assert.equal((await send("POST","/webhooks/kyc/document-scan",undefined,
        inputScan,undefined,sign(inputScan))).status,201);
      await db.driverDocument.update({where:{id:docId},
        data:{uploadExpiresAt:new Date(Date.now()-1000)}});
      assert.equal((await post("/admin/driver-documents/"+docId+"/decision",staff,
        {decision:"verified",reason:"Reviewed against authenticated scan event"})).status,201);
    }
    assert.equal((await post(decisionPath,staff,approve,"no-agreement-"+seed)).status,422);
    const acceptPath="/drivers/applications/"+application.id+"/accept-agreement";
    const acceptance={templateVersion:policy.agreementVersion,templateSha256:policy.agreementSha256,
      privacyVersion:policy.privacyVersion,acceptAgreement:true,privacyConsent:true};
    assert.equal((await post(acceptPath,d2,acceptance)).status,404);
    assert.equal((await post(acceptPath,d1,{...acceptance,privacyConsent:false})).status,422);
    assert.equal((await post(acceptPath,d1,{...acceptance,templateSha256:"b".repeat(64)})).status,409);
    assert.equal((await post(acceptPath,d1,acceptance)).status,201);
    assert.equal((await post(acceptPath,d1,acceptance)).status,201);
    assert.equal(await db.driverAgreement.count({where:{applicationId:application.id}}),1);
    const adminDetail=await get("/admin/driver-applications/"+application.id,staff);
    assert.equal(adminDetail.status,200);
    const detailBody=JSON.stringify(await adminDetail.json());
    assert.ok(!detailBody.includes(licRow.storageKey));
    const approved=await post(decisionPath,staff,approve,"final-review-"+seed);
    assert.equal(approved.status,201);
    assert.equal((await approved.json() as {data:{state:string}}).data.state,"approved");
    assert.equal((await post(decisionPath,staff,approve,"final-review-"+seed)).status,201);
    assert.equal((await post(decisionPath,staff,{...approve,decision:"rejected"},
      "final-review-"+seed)).status,409);
    const final=await db.driverApplication.findUniqueOrThrow({where:{id:application.id}});
    assert.equal(final.state,"APPROVED");
    assert.equal(await db.driverApplicationReview.count({where:{applicationId:application.id}}),1);
    assert.equal(await db.outboxEvent.count({where:{aggregateType:"driver_application",
      aggregateId:application.id,eventType:"driver.application_reviewed"}}),1);
    const list=await get("/admin/driver-applications",staff);
    assert.equal(list.status,200);
    assert.equal((await get("/admin/driver-applications",d1)).status,403);

    const secondApp=await db.driverApplication.create({data:{driverUserId:driver.id,
      state:"SUBMITTED",completedStep:5,city:"Prayagraj",experience:"NEW",
      vehicleId:vehicle.id,vehicleCategory:"AUTO",screenChoice:"rear_window",
      agreementTemplateVersion:policy.agreementVersion,confirmedReadiness:true,
      submittedAt:new Date(),version:6}});
    const revision=await post("/admin/driver-applications/"+secondApp.id+"/decision",staff,
      {decision:"changes_requested",reason:"Please supply renewed document evidence"},
      "request-changes-"+seed);
    assert.equal(revision.status,201);
    const reopen=await post("/drivers/applications/"+secondApp.id+"/reopen",d1,{});
    assert.equal(reopen.status,201);
    assert.equal((await db.driverApplication.findUniqueOrThrow({where:{id:secondApp.id}})).state,"DRAFT");
    assert.equal((await post("/drivers/applications/"+secondApp.id+"/reopen",d1,{})).status,409);
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await db.$disconnect();
  }
});
