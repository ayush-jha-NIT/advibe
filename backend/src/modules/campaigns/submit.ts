import { Router,type Request,type Response,type NextFunction } from "express";
import { Prisma } from "@prisma/client";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { HttpError } from "../../lib/http-error.js";
import { uuid,validateSchedule,formatMinute } from "./schemas.js";
import { dateString } from "../pricing/schemas.js";
import { campaignResponse } from "./serializer.js";
const handle=(fn:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void fn(q,s).catch(n);};
export function createCampaignSubmitRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth;const router=Router();
 router.post("/campaigns/:campaignId/submit",handle(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);
  const parsed=uuid.safeParse(req.params.campaignId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  if(Object.keys(req.body??{}).length)
   throw new HttpError(422,"VALIDATION_ERROR","Submission body must be empty");
  const made=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/campaigns/"+parsed.data+"/submit","POST",{},async tx=>{
    const c=await tx.campaign.findUnique({where:{id:parsed.data}});
    if(!c)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
    const member=await tx.businessMembership.findUnique({where:{
     businessId_userId:{businessId:c.ownerBusinessId,userId:p.userId}},
     include:{business:true}});
    if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
       member.business.archivedAt)
     throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
    if(!["DRAFT","CHANGES_REQUESTED"].includes(c.status))
     throw new HttpError(409,"CAMPAIGN_ALREADY_SUBMITTED","Campaign not ready to resubmit");
    const prev=await tx.campaignSubmission.findFirst({where:{campaignId:c.id},
     orderBy:{number:"desc"}});
    if(c.status==="CHANGES_REQUESTED"&&
       (!prev||c.revision<=prev.campaignRevision+2))
     throw new HttpError(409,"CAMPAIGN_REVISION_REQUIRED","Edit campaign after requested changes");
    try{validateSchedule(dateString(c.startDate),dateString(c.endDate),c.weekdays,true);}
    catch{throw new HttpError(422,"SCHEDULE_INVALID","Campaign dates or weekdays invalid");}
    const creative=await tx.creative.findFirst({where:{id:c.creativeId,
     ownerBusinessId:c.ownerBusinessId},include:{asset:true}});
    if(!creative||creative.approval!=="APPROVED"||creative.asset.state!=="READY"||
       !creative.asset.processedSha256||!creative.asset.sourceSha256||
       !creative.asset.processedVersionId||!creative.asset.scannedAt||!creative.asset.processedAt)
     throw new HttpError(422,"CREATIVE_NOT_APPROVED",
      "An approved, processed and business-owned creative is required");
    const number=c.submissionNumber+1;
    const snapshot:Prisma.InputJsonValue={
     schema:"b12-campaign-submission-v1",businessId:c.ownerBusinessId,campaignId:c.id,
     revision:c.revision,submissionNumber:number,title:c.title,creativeId:c.creativeId,
     creativeApproval:"approved",assetId:creative.mediaAssetId,
     sourceSha256:creative.asset.sourceSha256,
     processedSha256:creative.asset.processedSha256,
     processedVersionId:creative.asset.processedVersionId,
     startDate:dateString(c.startDate),endDate:dateString(c.endDate),
     weekdays:c.weekdays,timeWindow:{start:formatMinute(c.startMinute),
      end:formatMinute(c.endMinute)},bookingStatus:"NOT_BOOKED",
    };
    const changed=await tx.campaign.updateMany({where:{id:c.id,
     revision:c.revision,status:c.status},data:{
     status:"SUBMITTED",revision:{increment:1},submissionNumber:number,
     submittedAt:new Date(),reviewedAt:null,reviewedByUserId:null,reviewReason:null}});
    if(changed.count!==1)throw new HttpError(409,"CAMPAIGN_CONFLICT","Campaign changed");
    await tx.campaignSubmission.create({data:{campaignId:c.id,number,
     campaignRevision:c.revision,snapshot}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"campaign.submitted",resourceType:"campaign",resourceId:c.id,
     metadata:{number,revision:c.revision}}});
    await tx.outboxEvent.create({data:{aggregateType:"campaign",aggregateId:c.id,
     eventType:"campaign.submitted",payload:{campaignId:c.id,submissionNumber:number}}});
    return c.id;
   });
  const campaign=await db.campaign.findUniqueOrThrow({where:{id:made.resourceId}});
  res.status(201).json({data:campaignResponse(campaign)});
 }));
 return router;
}
