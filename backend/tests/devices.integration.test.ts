import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, randomUUID, sign, verify } from "node:crypto";
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
import { deviceMessage, pairingMessage, publicDeviceKey } from "../src/modules/devices/crypto.js";

const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!url)
  throw new Error("B8 tests require throwaway local PostgreSQL");
const target=new URL(url);
if(!["localhost","127.0.0.1","::1"].includes(target.hostname)||
    !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1)))
  throw new Error("B8 tests refuse remote or shared databases");

test("B8 approved screen, key possession pairing, signed heartbeats and revocation",async()=>{
  const db=new PrismaClient();
  const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
  const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
    MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
  const seed=randomUUID().slice(0,10);
  const passwd=await argon2.hash("B8-Secure-Testing-Password-2026!",{type:argon2.argon2id});
  await db.$connect();
  const users=await Promise.all(["driver","other","admin","advertiser"].map(async role=>
    db.user.create({data:{email:"b8-"+role+"-"+seed+"@example.invalid",
      displayName:"B8 "+role,passwordHash:passwd,emailVerifiedAt:new Date(),
      status:"ACTIVE",role:role==="admin"?"ADMIN":role==="advertiser"?"ADVERTISER":"DRIVER"}})));
  const [driver,outsider,admin,advertiser]=users as [User,User,User,User];
  await db.adminMfaCredential.create({data:{userId:admin.id,
    secretCipher:encryptTotpSecret(settings,admin.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
    enabledAt:new Date(Date.now()-60_000)}});
  type Identity={cookie:string;csrf:string};
  async function session(user:User):Promise<Identity>{
    const token=makeSessionToken();
    await db.session.create({data:{userId:user.id,tokenHash:hashToken(token),
      expiresAt:new Date(Date.now()+600_000),
      ...(user.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
    }});
    return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
  }
  const sessions=await Promise.all([driver,outsider,admin,advertiser].map(session));
  const [driverSession,outsiderSession,adminSession,advertiserSession]=sessions as [Identity,Identity,Identity,Identity];
  const vehicle=await db.vehicle.create({data:{driverUserId:driver.id,
    type:"AUTO",model:"Approved driver installation test",year:2023}});
  const otherVehicle=await db.vehicle.create({data:{driverUserId:outsider.id,
    type:"BIKE",model:"Unapproved outside vehicle",year:2022}});
  await db.driverApplication.create({data:{driverUserId:driver.id,state:"APPROVED",
    completedStep:5,submittedAt:new Date(),vehicleId:vehicle.id,vehicleCategory:"AUTO",
    city:"Prayagraj",experience:"ONE_TO_THREE",screenChoice:"rear",
    agreementTemplateVersion:"test-contract",confirmedReadiness:true}});
  const manifestKeys=generateKeyPairSync("ed25519");
  const originalManifestEnv=process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
  process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=manifestKeys.privateKey.export({
    type:"pkcs8",format:"der"}).toString("base64url");
  const deviceKeys=generateKeyPairSync("ed25519");
  const devicePublic=deviceKeys.publicKey.export({type:"spki",format:"der"}).toString("base64url");
  const wrongKeys=generateKeyPairSync("ed25519");
  const app=createApp(config,createLogger(config),async()=>{await db.user.count();},
    {db,settings,sender:async()=>{}},async()=>false);
  const server=app.listen(0,"127.0.0.1");
  try{
    await once(server,"listening");
    const base="http://127.0.0.1:"+(server.address() as AddressInfo).port;
    const api="/api/v1";
    const send=(method:string,path:string,identity?:Identity,body?:Record<string,unknown>,
      key?:string,csrf=true)=>{
      const headers:Record<string,string>={Origin:"http://localhost:3000"};
      if(identity)headers.Cookie=identity.cookie;
      if(identity&&csrf)headers["X-CSRF-Token"]=identity.csrf;
      if(key)headers["Idempotency-Key"]=key;
      if(body)headers["Content-Type"]="application/json";
      return fetch(base+api+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
    };
    const provision={vehicleId:vehicle.id,placement:"auto_rear",
      installationReference:"offline-installer-approved-"+seed};
    assert.equal((await send("POST","/admin/devices/screens",driverSession,provision,"no-"+seed)).status,403);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,provision,"no-csrf-"+seed,false)).status,403);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,
      {...provision,vehicleId:otherVehicle.id,placement:"bike_rear"},"foreign-"+seed)).status,409);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,
      {...provision,placement:"bike_rear"},"bad-place-"+seed)).status,422);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,provision)).status,422);
    const made=await send("POST","/admin/devices/screens",adminSession,provision,"screen-"+seed);
    assert.equal(made.status,201);
    const screen=(await made.json() as {data:{id:string;status:string;vehicleId:string}}).data;
    assert.equal(screen.status,"unpaired");
    assert.equal(screen.vehicleId,vehicle.id);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,provision,"screen-"+seed)).status,201);
    assert.equal(await db.screen.count({where:{vehicleId:vehicle.id}}),1);
    assert.equal((await send("POST","/admin/devices/screens",adminSession,
      {...provision,placement:"auto_side"},"screen-"+seed)).status,409);
    assert.equal((await send("GET","/screens",advertiserSession)).status,403);
    assert.equal((await send("GET","/screens/"+screen.id,outsiderSession)).status,404);
    assert.equal((await send("GET","/screens/"+screen.id,driverSession)).status,200);
    assert.equal((await send("GET","/screens",driverSession)).status,200);
    const pending={screenId:screen.id,publicKeySpki:devicePublic};
    assert.equal((await send("POST","/admin/devices/pairing-challenges",
      adminSession,{...pending,publicKeySpki:"invalid"},"invalid-key-"+seed)).status,422);
    const issue=await send("POST","/admin/devices/pairing-challenges",
      adminSession,pending,"pair-"+seed);
    assert.equal(issue.status,201);
    const challenge=(await issue.json() as {data:{
      challengeId:string;screenId:string;nonce:string;keyFingerprint:string}}).data;
    assert.equal(challenge.screenId,screen.id);
    assert.equal((await send("POST","/admin/devices/pairing-challenges",
      adminSession,pending,"pair-"+seed)).status,201);
    assert.equal((await send("POST","/admin/devices/pairing-challenges",
      adminSession,{...pending,publicKeySpki:wrongKeys.publicKey.export({
        type:"spki",format:"der"}).toString("base64url")},"pair-"+seed)).status,409);
    const signPair=(key:typeof deviceKeys.privateKey, id:string,nonce:string)=>
      sign(null,pairingMessage(id,screen.id,nonce),key).toString("base64url");
    const pairBody={challengeId:challenge.challengeId,
      signature:signPair(deviceKeys.privateKey,challenge.challengeId,challenge.nonce)};
    assert.equal((await send("POST","/devices/pair",undefined,{
      challengeId:challenge.challengeId,signature:signPair(wrongKeys.privateKey,
        challenge.challengeId,challenge.nonce)})).status,401);
    const paired=await send("POST","/devices/pair",undefined,pairBody);
    assert.equal(paired.status,201);
    const credential=(await paired.json() as {data:{deviceId:string;screenId:string;status:string}}).data;
    assert.equal(credential.status,"paired");
    assert.equal(credential.screenId,screen.id);
    assert.equal((await send("POST","/devices/pair",undefined,pairBody)).status,401);
    assert.equal(await db.deviceCredential.count({where:{screenId:screen.id}}),1);
    assert.equal((await send("POST","/admin/devices/pairing-challenges",
      adminSession,pending,"again-"+seed)).status,409);
    const beat={screenId:screen.id,deviceEventId:"heartbeat-"+seed,
      observedAt:new Date().toISOString(),firmwareVersion:"fw_1.0.0"};
    const deviceSend=(method:string,path:string,body?:Record<string,unknown>,
      options:{nonce?:string;signingKey?:typeof deviceKeys.privateKey;deviceId?:string;timestamp?:string;cookie?:string}={})=>{
      const timestamp=options.timestamp??String(Date.now());
      const nonce=options.nonce??randomBytes(24).toString("base64url");
      const signingKey=options.signingKey??deviceKeys.privateKey;
      const signature=sign(null,deviceMessage(method,api+path,timestamp,nonce,body),signingKey).toString("base64url");
      const headers:Record<string,string>={
        "X-Device-ID":options.deviceId??credential.deviceId,
        "X-Device-Timestamp":timestamp,"X-Device-Nonce":nonce,"X-Device-Signature":signature,
      };
      if(body)headers["Content-Type"]="application/json";
      if(options.cookie)headers.Cookie=options.cookie;
      return fetch(base+api+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
    };
    assert.equal((await send("POST","/devices/heartbeat",driverSession,beat)).status,401);
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat,
      {signingKey:wrongKeys.privateKey})).status,401);
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat,
      {timestamp:String(Date.now()-900_000)})).status,401);
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat,
      {cookie:driverSession.cookie})).status,401);
    assert.equal((await deviceSend("POST","/devices/heartbeat",
      {...beat,screenId:otherVehicle.id})).status,403);
    const heartbeatNonce=randomBytes(24).toString("base64url");
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat,{nonce:heartbeatNonce})).status,201);
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat,{nonce:heartbeatNonce})).status,409);
    assert.equal((await deviceSend("POST","/devices/heartbeat",beat)).status,409,
      "Repeated event ID cannot be replayed with a new request nonce");
    assert.equal(await db.deviceHeartbeat.count({where:{credentialId:credential.deviceId}}),1);
    assert.equal((await deviceSend("GET","/devices/manifest")).status,503);
    const issued=await send("POST","/admin/devices/"+screen.id+"/manifests/empty",
      adminSession,{},"unused");
    assert.equal(issued.status,201);
    const manifest=(await issued.json() as {data:{
      screenId:string;version:number;expiresAt:string;entries:unknown[];signature:string}}).data;
    assert.deepEqual(manifest.entries,[],"B8 cannot begin ad delivery");
    assert.equal(manifest.version,1);
    assert.equal(verify(null,Buffer.from(JSON.stringify({screenId:manifest.screenId,
      version:manifest.version,expiresAt:manifest.expiresAt,entries:manifest.entries})),
      manifestKeys.publicKey,Buffer.from(manifest.signature,"base64url")),true);
    assert.equal((await deviceSend("GET","/devices/manifest")).status,200);
    assert.equal((await send("GET","/devices/manifest",driverSession)).status,401);
    const rev=await send("POST","/admin/devices/"+screen.id+"/revoke",adminSession,{});
    assert.equal(rev.status,201);
    assert.equal((await deviceSend("POST","/devices/heartbeat",
      {...beat,deviceEventId:"new-after-revoke-"+seed})).status,401);
    assert.equal((await deviceSend("GET","/devices/manifest")).status,401);
    assert.ok((await db.deviceCredential.findUniqueOrThrow({
      where:{id:credential.deviceId}})).revokedAt);
    const newKeys=generateKeyPairSync("ed25519");
    const newPublic=newKeys.publicKey.export({type:"spki",format:"der"}).toString("base64url");
    const renewal=await send("POST","/admin/devices/pairing-challenges",adminSession,
      {screenId:screen.id,publicKeySpki:newPublic},"rotate-"+seed);
    assert.equal(renewal.status,201);
    const newChallenge=(await renewal.json() as {data:{challengeId:string;nonce:string}}).data;
    const rotated=await send("POST","/devices/pair",undefined,{
      challengeId:newChallenge.challengeId,
      signature:signPair(newKeys.privateKey,newChallenge.challengeId,newChallenge.nonce)});
    assert.equal(rotated.status,201);
    assert.equal((await deviceSend("GET","/devices/manifest")).status,401,
      "Old private key must fail immediately after rotation");
    assert.equal(await db.deviceCredential.count({where:{screenId:screen.id}}),1);
    assert.equal(await db.auditEvent.count({where:{resourceType:"screen",resourceId:screen.id,
      action:"device.revoked"}}),1);
    // B8 is an authentication/empty-manifest milestone, NOT proof of physical installation.
    assert.equal((await db.vehicle.findUniqueOrThrow({where:{id:vehicle.id}})).verification,"PENDING");
    assert.equal(publicDeviceKey(devicePublic).asymmetricKeyType,"ed25519");
  }finally{
    if(originalManifestEnv===undefined)delete process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64;
    else process.env.DEVICE_MANIFEST_SIGNING_KEY_PKCS8_B64=originalManifestEnv;
    await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    await db.$disconnect();
  }
});
