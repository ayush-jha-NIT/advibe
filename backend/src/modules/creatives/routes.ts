import { randomUUID } from "node:crypto";
import { type Creative, type MediaAsset, type ScreenPlacement } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { AuthDependencies } from "../auth/routes.js";
import { requireBusinessMembership, requireRole, resolvePrincipal, type AuthPrincipal } from "../auth/policy.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { creativeInput, reviewInput, uploadInput, uuid } from "./schemas.js";
import { createCreativeStorage, type PrivateCreativeStorage } from "./storage.js";

export interface CreativeDependencies { storage?:PrivateCreativeStorage }
const handler=(fn:(req:Request,res:Response)=>Promise<void>)=>
  (req:Request,res:Response,next:NextFunction):void=>{void fn(req,res).catch(next);};
function id(req:Request,key:string):string{
  const parsed=uuid.safeParse(req.params[key]);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Resource not found");
  return parsed.data;
}
function mutation(req:Request,config:AppConfig,p:AuthPrincipal,secret:string){
  const origin=req.get("origin");
  if(origin&&!config.corsOrigins.includes(origin))
    throw new HttpError(403,"ORIGIN_FORBIDDEN","Origin not permitted");
  if(req.get("sec-fetch-site")==="cross-site")
    throw new HttpError(403,"CROSS_SITE_FORBIDDEN","Cross-site denied");
  if(config.nodeEnv==="production"&&!origin&&
    !["same-origin","same-site"].includes(req.get("sec-fetch-site")||""))
    throw new HttpError(403,"ORIGIN_REQUIRED","Verified browser origin required");
  if(!constantTimeHexMatch(req.get("x-csrf-token")||"",
    mac({secret} as AuthDependencies["settings"],"csrf",p.tokenHash)))
    throw new HttpError(403,"CSRF_FAILED","CSRF token invalid");
  if(!req.is("application/json"))
    throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","JSON body required");
}
function mediaView(a:MediaAsset){
  return {id:a.id,businessId:a.businessId,state:a.state.toLowerCase(),
    mimeType:a.mimeType,sizeBytes:a.expectedBytes,sha256:a.expectedSha256,
    processedMimeType:a.processedMimeType,uploadedAt:a.uploadedAt?.toISOString()??null,
    processedAt:a.processedAt?.toISOString()??null,
    width:a.width,height:a.height,durationMs:a.durationMs,
    failureCode:a.failureCode};
}
function creativeView(c:Creative) {
  return {id:c.id,ownerBusinessId:c.ownerBusinessId,title:c.title,
    placement:c.placement.toLowerCase(),mediaAssetId:c.mediaAssetId,
    approval:c.approval.toLowerCase(),reviewReason:c.reviewReason,
    createdAt:c.createdAt.toISOString()};
}
export function createCreativeRouter(config:AppConfig,auth:AuthDependencies,
  injected:CreativeDependencies={}):Router {
  const {db,settings}=auth,storage=injected.storage??createCreativeStorage();
  const router=Router();
  const advertiser=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");return p;
  };
  const admin=async(req:Request)=>{
    const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");return p;
  };
  router.post("/creatives/upload-intents",validateBody(uploadInput),handler(async(req,res)=>{
    const p=await advertiser(req);mutation(req,config,p,settings.secret);
    const input=uploadInput.parse(req.body);
    await requireBusinessMembership(db,p,input.businessId,["OWNER","MANAGER"]);
    const business=await db.business.findFirst({where:{id:input.businessId,archivedAt:null}});
    if(!business)throw new HttpError(404,"NOT_FOUND","Business not found");
    const result=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/creatives/upload-intents","POST",input,async tx=>{
        const assetId=randomUUID();
        await tx.mediaAsset.create({data:{
          id:assetId,businessId:input.businessId,uploaderUserId:p.userId,
          mimeType:input.contentType,expectedBytes:input.sizeBytes,expectedSha256:input.sha256,
          sourceKey:"creative-source/"+input.businessId+"/"+assetId,
          uploadExpiresAt:new Date(Date.now()+300000),
        }});
        await tx.auditEvent.create({data:{actorUserId:p.userId,
          action:"creative.upload_intent_created",resourceType:"media_asset",resourceId:assetId}});
        return assetId;
      });
    const asset=await db.mediaAsset.findFirst({where:{
      id:result.resourceId,businessId:input.businessId}});
    if(!asset)throw new HttpError(404,"NOT_FOUND","Asset not found");
    const remaining=Math.floor((asset.uploadExpiresAt.getTime()-Date.now())/1000);
    if(asset.state!=="PENDING_UPLOAD"||remaining<1)
      throw new HttpError(409,"UPLOAD_INTENT_EXPIRED","Create a fresh upload intent");
    const signed=await storage.signedPut(asset.sourceKey,asset.mimeType,asset.expectedBytes,remaining);
    res.status(201).json({data:{assetId:asset.id,uploadUrl:signed.url,
      expiresAt:asset.uploadExpiresAt.toISOString(),requiredHeaders:signed.headers}});
  }));
  router.post("/creatives/assets/:assetId/complete",handler(async(req,res)=>{
    const p=await advertiser(req);mutation(req,config,p,settings.secret);
    const assetId=id(req,"assetId");
    const a=await db.mediaAsset.findUnique({where:{id:assetId}});
    if(!a)throw new HttpError(404,"NOT_FOUND","Asset not found");
    await requireBusinessMembership(db,p,a.businessId,["OWNER","MANAGER"]);
    if(a.state!=="PENDING_UPLOAD"||a.uploadExpiresAt<=new Date())
      throw new HttpError(409,"UPLOAD_NOT_PENDING","Upload not in an active pending state");
    const head=await storage.head(a.sourceKey);
    if(head.sizeBytes!==a.expectedBytes||head.contentType!==a.mimeType||
       !head.versionId||head.versionId==="null")
      throw new HttpError(422,"UPLOAD_MISMATCH","Private object metadata mismatch");
    const updated=await serializableTransaction(db,async tx=>{
      const result=await tx.mediaAsset.updateMany({where:{id:a.id,state:"PENDING_UPLOAD",
        uploadExpiresAt:{gt:new Date()}},data:{
        state:"UPLOADED",sourceVersionId:head.versionId,uploadedAt:new Date()}});
      if(result.count!==1)throw new HttpError(409,"UPLOAD_RACE","Upload no longer active");
      await tx.outboxEvent.create({data:{aggregateType:"media_asset",aggregateId:a.id,
        eventType:"creative.media_uploaded",payload:{assetId:a.id}}});
      await tx.auditEvent.create({data:{actorUserId:p.userId,
        action:"creative.upload_completed",resourceType:"media_asset",resourceId:a.id}});
      return tx.mediaAsset.findUniqueOrThrow({where:{id:a.id}});
    });
    res.status(201).json({data:mediaView(updated)});
  }));
  router.get("/creatives/assets/:assetId",handler(async(req,res)=>{
    const p=await resolvePrincipal(req,db,settings);
    requireRole(p,"ADVERTISER","ADMIN");
    const a=await db.mediaAsset.findUnique({where:{id:id(req,"assetId")}});
    if(!a)throw new HttpError(404,"NOT_FOUND","Asset not found");
    if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,a.businessId);
    res.json({data:mediaView(a)});
  }));
  router.post("/creatives",validateBody(creativeInput),handler(async(req,res)=>{
    const p=await advertiser(req);mutation(req,config,p,settings.secret);
    const input=creativeInput.parse(req.body);
    await requireBusinessMembership(db,p,input.businessId,["OWNER","MANAGER"]);
    const result=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/creatives","POST",input,async tx=>{
      const asset=await tx.mediaAsset.findFirst({where:{
        id:input.mediaAssetId,businessId:input.businessId,state:"READY"}});
      const business=await tx.business.findFirst({where:{
        id:input.businessId,archivedAt:null}});
      if(!asset||!business)throw new HttpError(422,"ASSET_NOT_READY","Owned processed asset required");
      const creative=await tx.creative.create({data:{
        ownerBusinessId:input.businessId,title:input.title,
        placement:input.placement.toUpperCase() as ScreenPlacement,mediaAssetId:asset.id}});
      await tx.auditEvent.create({data:{actorUserId:p.userId,
        action:"creative.created",resourceType:"creative",resourceId:creative.id}});
      return creative.id;
    });
    const c=await db.creative.findFirst({where:{
      id:result.resourceId,ownerBusinessId:input.businessId}});
    if(!c)throw new HttpError(404,"NOT_FOUND","Creative unavailable");
    res.status(201).json({data:creativeView(c)});
  }));
  router.get("/creatives",handler(async(req,res)=>{
    const p=await resolvePrincipal(req,db,settings);
    requireRole(p,"ADVERTISER","ADMIN");
    const raw=req.query.limit;
    const limit=raw===undefined?20:Number(raw);
    if(raw!==undefined&&(typeof raw!=="string"||!/^(?:[1-9]|[1-9][0-9]|100)$/.test(raw)))
      throw new HttpError(422,"VALIDATION_ERROR","Invalid limit");
    if(Object.keys(req.query).some(k=>k!=="limit"&&k!=="businessId"))
      throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
    const businessId=req.query.businessId;
    if(businessId!==undefined&&(typeof businessId!=="string"||!uuid.safeParse(businessId).success))
      throw new HttpError(422,"VALIDATION_ERROR","Invalid business ID");
    const where=p.role==="ADMIN"?
      {...(businessId?{ownerBusinessId:businessId as string}:{})}:{
      ownerBusinessId:businessId as string|undefined,
      business:{memberships:{some:{userId:p.userId,revokedAt:null}},
        archivedAt:null},
    };
    if(p.role==="ADVERTISER"&&businessId)await requireBusinessMembership(db,p,businessId as string);
    const list=await db.creative.findMany({where,
      take:limit,orderBy:[{createdAt:"desc"},{id:"desc"}]});
    res.json({data:list.map(creativeView),meta:{limit}});
  }));
  router.get("/creatives/:creativeId",handler(async(req,res)=>{
    const p=await resolvePrincipal(req,db,settings);
    requireRole(p,"ADVERTISER","ADMIN");
    const c=await db.creative.findUnique({where:{id:id(req,"creativeId")}});
    if(!c)throw new HttpError(404,"NOT_FOUND","Creative not found");
    if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,c.ownerBusinessId);
    res.json({data:creativeView(c)});
  }));
  router.get("/admin/creatives/:creativeId/preview-url",handler(async(req,res)=>{
    const p=await admin(req);const creativeId=id(req,"creativeId");
    const c=await db.creative.findUnique({where:{id:creativeId},include:{asset:true}});
    if(!c||c.asset.state!=="READY"||!c.asset.processedKey||!c.asset.processedVersionId)
      throw new HttpError(404,"NOT_FOUND","Processed creative unavailable");
    const url=await storage.signedGet(c.asset.processedKey,c.asset.processedVersionId);
    await db.auditEvent.create({data:{actorUserId:p.userId,
      action:"creative.preview_accessed",resourceType:"creative",resourceId:creativeId}});
    res.set("Cache-Control","no-store").json({data:{url,expiresInSeconds:60}});
  }));
  router.post("/admin/creatives/:creativeId/decision",validateBody(reviewInput),handler(async(req,res)=>{
    const p=await admin(req);mutation(req,config,p,settings.secret);
    const creativeId=id(req,"creativeId"),input=reviewInput.parse(req.body);
    const result=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/admin/creatives/"+creativeId+"/decision","POST",input,async tx=>{
      const c=await tx.creative.findUnique({where:{id:creativeId},include:{asset:true}});
      if(!c||c.approval!=="PENDING")
        throw new HttpError(409,"CREATIVE_NOT_PENDING","Creative cannot be reviewed");
      if(c.asset.state!=="READY"||!c.asset.scannedAt||!c.asset.processedAt||
         !c.asset.sourceSha256||!c.asset.processedSha256||
         !c.asset.processedVersionId)
        throw new HttpError(422,"MEDIA_NOT_VERIFIED","Processed scanned media required");
      const decision=input.decision.toUpperCase() as "APPROVED"|"REJECTED";
      const change=await tx.creative.updateMany({where:{id:creativeId,approval:"PENDING"},
        data:{approval:decision,reviewedByUserId:p.userId,reviewedAt:new Date(),
          reviewReason:input.reason}});
      if(change.count!==1)throw new HttpError(409,"CREATIVE_REVIEW_RACE","Creative changed");
      await tx.creativeReview.create({data:{creativeId,adminUserId:p.userId,
        decision,reason:input.reason,sourceSha256:c.asset.sourceSha256,
        processedSha256:c.asset.processedSha256}});
      await tx.auditEvent.create({data:{actorUserId:p.userId,
        action:"creative.moderation_decision",resourceType:"creative",resourceId:creativeId,
        metadata:{decision:input.decision}}});
      await tx.outboxEvent.create({data:{aggregateType:"creative",aggregateId:creativeId,
        eventType:"creative.moderated",payload:{creativeId,decision:input.decision}}});
      return creativeId;
    });
    const c=await db.creative.findUniqueOrThrow({where:{id:result.resourceId}});
    res.status(201).json({data:creativeView(c)});
  }));
  return router;
}
