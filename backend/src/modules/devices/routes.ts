import { Prisma, type PrismaClient, type DeviceCredential } from "@prisma/client";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal, requireRole, type AuthPrincipal } from "../auth/policy.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { serializableTransaction } from "../../db/transaction.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { provisionInput, challengeInput, pairInput, heartbeatInput } from "./schemas.js";
import { publicDeviceKey, fingerprint, randomChallenge, pairingMessage,
  verifyEd25519, deviceMessage, getManifestSigner, signEmptyManifest } from "./crypto.js";

const handle=(f:(req:Request,res:Response)=>Promise<void>)=>
  (req:Request,res:Response,next:NextFunction):void=>{void f(req,res).catch(next);};
const id=(req:Request,key:string)=>{
  const p=z.uuid().safeParse(req.params[key]);
  if(!p.success)throw new HttpError(404,"NOT_FOUND","Resource not found");
  return p.data;
};
function csrf(req:Request,config:AppConfig,p:AuthPrincipal,secret:string){
  const origin=req.get("origin");
  if(origin&&!config.corsOrigins.includes(origin))throw new HttpError(403,"ORIGIN_FORBIDDEN","Untrusted origin");
  if(req.get("sec-fetch-site")==="cross-site")throw new HttpError(403,"CROSS_SITE_FORBIDDEN","Cross-site request");
  if(config.nodeEnv==="production"&&!origin&&
      !["same-site","same-origin"].includes(req.get("sec-fetch-site")||""))
    throw new HttpError(403,"ORIGIN_REQUIRED","Trusted browser origin required");
  if(!constantTimeHexMatch(req.get("x-csrf-token")||"",
      mac({secret} as AuthDependencies["settings"],"csrf",p.tokenHash)))
    throw new HttpError(403,"CSRF_FAILED","CSRF token invalid");
  if(!req.is("application/json"))throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","JSON required");
}
function screenResponse(screen:{id:string;vehicleId:string;placement:string;state:string}){
  return {id:screen.id,vehicleId:screen.vehicleId,placement:screen.placement.toLowerCase(),
    status:screen.state.toLowerCase(),lastTrustedHeartbeatAt:null};
}
function getLimit(req:Request){
  const l=req.query.limit;
  if(l===undefined)return 20;
  if(typeof l!=="string"||!/^(?:[1-9]|[1-9][0-9]|100)$/.test(l))
    throw new HttpError(422,"VALIDATION_ERROR","Invalid page limit");
  return Number(l);
}
async function authenticateDevice(req:Request,db:PrismaClient){
  if(req.get("cookie")||req.get("authorization"))throw new HttpError(401,"DEVICE_AUTH_REQUIRED","Device authentication required");
  const credentialId=req.get("x-device-id")||"";
  const timestamp=req.get("x-device-timestamp")||"";
  const nonce=req.get("x-device-nonce")||"";
  const sig=req.get("x-device-signature")||"";
  if(!z.uuid().safeParse(credentialId).success||!/^[0-9]{13}$/.test(timestamp)||
     Math.abs(Date.now()-Number(timestamp))>120_000||
     !/^[A-Za-z0-9_-]{22,64}$/.test(nonce))
    throw new HttpError(401,"DEVICE_AUTH_REQUIRED","Invalid device signature metadata");
  const credential=await db.deviceCredential.findUnique({where:{id:credentialId},include:{screen:true}});
  if(!credential||credential.revokedAt||credential.screen.state!=="PAIRED")
    throw new HttpError(401,"DEVICE_REVOKED","Inactive device");
  const path=req.originalUrl.split("?")[0]!;
  if(!verifyEd25519(publicDeviceKey(credential.publicKeySpki),
      deviceMessage(req.method,path,timestamp,nonce,req.body),sig))
    throw new HttpError(401,"DEVICE_AUTH_REQUIRED","Invalid device signature");
  return {credential,nonce};
}
async function performSigned<T>(req:Request,db:PrismaClient,
  action:(tx:Prisma.TransactionClient,cred:DeviceCredential)=>Promise<T>):Promise<T>{
  const {credential,nonce}=await authenticateDevice(req,db);
  return serializableTransaction(db,async tx=>{
    const latest=await tx.deviceCredential.findUnique({where:{id:credential.id},include:{screen:true}});
    if(!latest||latest.revokedAt||latest.screen.state!=="PAIRED")
      throw new HttpError(401,"DEVICE_REVOKED","Device identity revoked");
    try {await tx.deviceRequestNonce.create({data:{credentialId:latest.id,nonce}});}
    catch(e){
      if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002")
        throw new HttpError(409,"DEVICE_REPLAY","Device nonce already used");
      throw e;
    }
    return action(tx,latest);
  });
}

export function createDeviceRouter(config:AppConfig,auth:AuthDependencies):Router{
  const {db,settings}=auth;const router=Router();
  const admin=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");return p;
  };
  const viewer=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);requireRole(p,"DRIVER","ADMIN");return p;
  };
  router.post("/admin/devices/screens",validateBody(provisionInput),handle(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const input=provisionInput.parse(req.body);
    const created=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/admin/devices/screens","POST",input,async tx=>{
        const vehicle=await tx.vehicle.findUnique({where:{id:input.vehicleId}});
        if(!vehicle)throw new HttpError(404,"NOT_FOUND","Vehicle unavailable");
        const place=input.placement.toUpperCase();
        const compatible=(vehicle.type==="BIKE"&&["BIKE_REAR","HELMET"].includes(place))||
          (vehicle.type==="AUTO"&&["AUTO_REAR","AUTO_SIDE"].includes(place))||
          (vehicle.type==="CAR"&&["CAR_REAR","CAR_INTERIOR"].includes(place));
        if(!compatible)throw new HttpError(422,"PLACEMENT_INVALID","Placement incompatible with vehicle");
        const approved=await tx.driverApplication.findFirst({where:{
          vehicleId:vehicle.id,driverUserId:vehicle.driverUserId,state:"APPROVED"}});
        if(!approved)throw new HttpError(409,"DRIVER_NOT_APPROVED","Approved driver application required");
        const screen=await tx.screen.create({data:{
          vehicleId:vehicle.id,placement:place as
            "BIKE_REAR"|"AUTO_REAR"|"AUTO_SIDE"|"CAR_REAR"|"CAR_INTERIOR"|"HELMET",
          installationReference:input.installationReference}});
        await tx.auditEvent.create({data:{actorUserId:p.userId,action:"device.screen_provisioned",
          resourceType:"screen",resourceId:screen.id}});
        return screen.id;
      });
    const screen=await db.screen.findUniqueOrThrow({where:{id:created.resourceId}});
    res.status(201).json({data:screenResponse(screen)});
  }));
  router.post("/admin/devices/pairing-challenges",validateBody(challengeInput),handle(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const input=challengeInput.parse(req.body);publicDeviceKey(input.publicKeySpki);
    const made=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/admin/devices/pairing-challenges","POST",input,async tx=>{
        const screen=await tx.screen.findUnique({where:{id:input.screenId}});
        if(!screen)throw new HttpError(404,"NOT_FOUND","Screen unavailable");
        if(screen.state==="PAIRED")throw new HttpError(409,"ALREADY_PAIRED","Revoke existing device before rotation");
        await tx.devicePairingChallenge.updateMany({where:{screenId:screen.id,consumedAt:null},
          data:{consumedAt:new Date()}});
        const challenge=await tx.devicePairingChallenge.create({data:{
          screenId:screen.id,adminUserId:p.userId,nonce:randomChallenge(),
          publicKeySpki:input.publicKeySpki,expiresAt:new Date(Date.now()+300_000)}});
        await tx.auditEvent.create({data:{actorUserId:p.userId,action:"device.pairing_challenge_created",
          resourceType:"screen",resourceId:screen.id}});
        return challenge.id;
      });
    const challenge=await db.devicePairingChallenge.findUniqueOrThrow({where:{id:made.resourceId}});
    if(challenge.consumedAt||challenge.expiresAt<=new Date())throw new HttpError(409,"PAIRING_EXPIRED","Challenge expired");
    res.status(201).json({data:{challengeId:challenge.id,screenId:challenge.screenId,
      nonce:challenge.nonce,expiresAt:challenge.expiresAt.toISOString(),
      keyFingerprint:fingerprint(challenge.publicKeySpki)}});
  }));
  router.post("/devices/pair",validateBody(pairInput),handle(async(req,res)=>{
    if(req.get("cookie")||req.get("authorization"))throw new HttpError(401,"DEVICE_AUTH_REQUIRED","Device private-key proof required");
    const input=pairInput.parse(req.body);
    const challenge=await db.devicePairingChallenge.findUnique({where:{id:input.challengeId},
      include:{screen:true}});
    if(!challenge||challenge.consumedAt||challenge.expiresAt<=new Date()||
       challenge.screen.state==="PAIRED")throw new HttpError(401,"PAIRING_INVALID","Invalid pairing challenge");
    if(!verifyEd25519(publicDeviceKey(challenge.publicKeySpki),
      pairingMessage(challenge.id,challenge.screenId,challenge.nonce),input.signature))
      throw new HttpError(401,"PAIRING_INVALID","Device signature invalid");
    const cred=await serializableTransaction(db,async tx=>{
      const consumed=await tx.devicePairingChallenge.updateMany({where:{
        id:challenge.id,consumedAt:null,expiresAt:{gt:new Date()}},data:{consumedAt:new Date()}});
      if(consumed.count!==1)throw new HttpError(409,"PAIRING_REPLAY","Challenge already used");
      const changed=await tx.screen.updateMany({where:{id:challenge.screenId,
        state:{in:["UNPAIRED","REVOKED"]}},data:{state:"PAIRED"}});
      if(changed.count!==1)throw new HttpError(409,"PAIRING_REPLAY","Device already paired");
      const result=await tx.deviceCredential.upsert({where:{screenId:challenge.screenId},
        create:{screenId:challenge.screenId,publicKeySpki:challenge.publicKeySpki,
          fingerprint:fingerprint(challenge.publicKeySpki)},
        update:{publicKeySpki:challenge.publicKeySpki,
          fingerprint:fingerprint(challenge.publicKeySpki),revokedAt:null,pairedAt:new Date()}});
      await tx.auditEvent.create({data:{actorUserId:challenge.adminUserId,action:"device.paired",
        resourceType:"screen",resourceId:challenge.screenId}});
      return result;
    });
    res.status(201).json({data:{screenId:cred.screenId,deviceId:cred.id,
      fingerprint:cred.fingerprint,status:"paired"}});
  }));
  router.post("/admin/devices/:screenId/revoke",handle(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);const screenId=id(req,"screenId");
    await serializableTransaction(db,async tx=>{
      const changed=await tx.screen.updateMany({where:{id:screenId,state:"PAIRED"},data:{state:"REVOKED"}});
      if(changed.count!==1)throw new HttpError(409,"NOT_PAIRED","Screen not paired");
      await tx.deviceCredential.updateMany({where:{screenId,revokedAt:null},data:{revokedAt:new Date()}});
      await tx.devicePairingChallenge.updateMany({where:{screenId,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.auditEvent.create({data:{actorUserId:p.userId,action:"device.revoked",
        resourceType:"screen",resourceId:screenId}});
    });
    res.status(201).json({data:{screenId,status:"revoked"}});
  }));
  router.get("/screens",handle(async(req,res)=>{
    const p=await viewer(req);const limit=getLimit(req);
    const rows=await db.screen.findMany({where:p.role==="ADMIN"?{}:{
      vehicle:{driverUserId:p.userId}},take:limit,orderBy:[{createdAt:"desc"},{id:"desc"}]});
    res.json({data:rows.map(screenResponse)});
  }));
  router.get("/screens/:screenId",handle(async(req,res)=>{
    const p=await viewer(req);const screen=await db.screen.findFirst({where:{id:id(req,"screenId"),
      ...(p.role==="ADMIN"?{}:{vehicle:{driverUserId:p.userId}})}});
    if(!screen)throw new HttpError(404,"NOT_FOUND","Screen unavailable");
    res.json({data:screenResponse(screen)});
  }));
  router.post("/admin/devices/:screenId/manifests/empty",handle(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings.secret);
    const screenId=id(req,"screenId");const signer=getManifestSigner();
    const manifest=await serializableTransaction(db,async tx=>{
      const screen=await tx.screen.findUnique({where:{id:screenId}});
      if(!screen||screen.state!=="PAIRED")throw new HttpError(409,"NOT_PAIRED","Device not paired");
      const last=await tx.deviceManifestVersion.findFirst({where:{screenId},orderBy:{version:"desc"}});
      const value=signEmptyManifest(signer,screenId,(last?.version??0)+1,new Date(Date.now()+300_000));
      await tx.deviceManifestVersion.create({data:{screenId,version:value.version,
        expiresAt:new Date(value.expiresAt),entries:value.entries,signature:value.signature}});
      await tx.auditEvent.create({data:{actorUserId:p.userId,action:"device.empty_manifest_issued",
        resourceType:"screen",resourceId:screenId}});
      return value;
    });
    res.status(201).json({data:manifest});
  }));
  router.get("/devices/manifest",handle(async(req,res)=>{
    const result=await performSigned(req,db,async(tx,cred)=>{
      const m=await tx.deviceManifestVersion.findFirst({where:{screenId:cred.screenId,
        expiresAt:{gt:new Date()}},orderBy:{version:"desc"}});
      if(!m)throw new HttpError(503,"MANIFEST_UNAVAILABLE","No valid signed manifest");
      return {screenId:m.screenId,version:m.version,
        expiresAt:m.expiresAt.toISOString(),entries:[],signature:m.signature};
    });
    res.set("Cache-Control","no-store").json({data:result});
  }));
  router.post("/devices/heartbeat",validateBody(heartbeatInput),handle(async(req,res)=>{
    const input=heartbeatInput.parse(req.body);
    const observedAt=new Date(input.observedAt);
    if(Math.abs(Date.now()-observedAt.getTime())>120_000)
      throw new HttpError(422,"STALE_HEARTBEAT","Heartbeat too old");
    const eventId=await performSigned(req,db,async(tx,cred)=>{
      if(input.screenId!==cred.screenId)throw new HttpError(403,"DEVICE_SCREEN_MISMATCH","Wrong screen");
      try{
        const row=await tx.deviceHeartbeat.create({data:{credentialId:cred.id,
          deviceEventId:input.deviceEventId,observedAt,firmwareVersion:input.firmwareVersion}});
        return row.id;
      }catch(e){
        if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002")
          throw new HttpError(409,"DEVICE_EVENT_REPLAY","Duplicate device event");
        throw e;
      }
    });
    res.status(201).json({data:{received:true,eventId}});
  }));
  return router;
}
