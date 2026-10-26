import { createHash } from "node:crypto";
import { Router,type Request,type Response,type NextFunction } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole,requireBusinessMembership } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { uuid,decisionInput } from "./schemas.js";
import { campaignResponse } from "./serializer.js";
const safe=(fn:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void fn(q,s).catch(n);};
export function createCampaignDecisionRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth;const router=Router();
 router.post("/admin/campaigns/:campaignId/decision",validateBody(decisionInput),safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");
  mutation(req,config,p,settings.secret);
  const parsed=uuid.safeParse(req.params.campaignId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const input=decisionInput.parse(req.body);
  const out=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/campaigns/"+parsed.data+"/decision","POST",input,async tx=>{
    const c=await tx.campaign.findUnique({where:{id:parsed.data},
     include:{creative:{include:{asset:true}}}});
    if(!c||c.status!=="SUBMITTED")
     throw new HttpError(409,"CAMPAIGN_NOT_SUBMITTED","Only submitted campaigns can be reviewed");
    if(c.revision!==input.expectedRevision)
     throw new HttpError(409,"STALE_CAMPAIGN_REVISION","Campaign version is outdated");
    const submission=await tx.campaignSubmission.findUnique({where:{
     campaignId_number:{campaignId:c.id,number:c.submissionNumber}}});
    if(!submission)throw new HttpError(409,"SUBMISSION_MISSING","Submission evidence missing");
    if(input.decision==="approved"&&
       (c.creative.approval!=="APPROVED"||c.creative.asset.state!=="READY"||
        !c.creative.asset.processedSha256||!c.creative.asset.processedVersionId))
     throw new HttpError(422,"CREATIVE_NOT_APPROVED","Approved processed creative required");
    const decision=input.decision.toUpperCase() as "APPROVED"|"REJECTED"|"CHANGES_REQUESTED";
    const updated=await tx.campaign.updateMany({where:{id:c.id,status:"SUBMITTED",
      revision:input.expectedRevision},data:{status:decision,revision:{increment:1},
      reviewedAt:new Date(),reviewedByUserId:p.userId,reviewReason:input.reason}});
    if(updated.count!==1)throw new HttpError(409,"CAMPAIGN_REVIEW_CONFLICT","Decision already made");
    await tx.campaignReview.create({data:{campaignId:c.id,
     submissionNumber:c.submissionNumber,adminUserId:p.userId,decision,
     reason:input.reason,snapshotHash:createHash("sha256")
      .update(JSON.stringify(submission.snapshot)).digest("hex")}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"campaign.reviewed",
     resourceType:"campaign",resourceId:c.id,
     metadata:{decision:input.decision,submissionNumber:c.submissionNumber}}});
    await tx.outboxEvent.create({data:{aggregateType:"campaign",aggregateId:c.id,
     eventType:"campaign.reviewed",payload:{campaignId:c.id,decision:input.decision,
      submissionNumber:c.submissionNumber}}});
    return c.id;
   });
  const c=await db.campaign.findUniqueOrThrow({where:{id:out.resourceId}});
  res.status(201).json({data:campaignResponse(c)});
 }));
 router.get("/campaigns/:campaignId/submissions",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);
  requireRole(p,"ADMIN","ADVERTISER");
  const parsed=uuid.safeParse(req.params.campaignId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const c=await db.campaign.findUnique({where:{id:parsed.data}});
  if(!c)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,c.ownerBusinessId);
  const submissions=await db.campaignSubmission.findMany({where:{campaignId:c.id},
   orderBy:{number:"asc"},take:100});
  res.json({data:submissions.map(s=>({id:s.id,number:s.number,
   campaignRevision:s.campaignRevision,snapshot:s.snapshot,
   createdAt:s.createdAt.toISOString()}))});
 }));
 router.get("/admin/campaigns/:campaignId/reviews",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");
  const parsed=uuid.safeParse(req.params.campaignId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const c=await db.campaign.findUnique({where:{id:parsed.data}});
  if(!c)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const reviews=await db.campaignReview.findMany({where:{campaignId:c.id},
   orderBy:{submissionNumber:"asc"},take:100});
  res.json({data:reviews.map(v=>({id:v.id,submissionNumber:v.submissionNumber,
   decision:v.decision.toLowerCase(),reason:v.reason,snapshotHash:v.snapshotHash,
   reviewedAt:v.createdAt.toISOString()}))});
 }));
 return router;
}
