import { Router,type Request,type Response,type NextFunction } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { updateCampaignInput,uuid,windowMinutes,validateSchedule,
  formatMinute } from "./schemas.js";
import { atUtc,dateString } from "../pricing/schemas.js";
import { campaignResponse } from "./serializer.js";

const handle=(fn:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void fn(q,s).catch(n);};
export function createCampaignEditRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth;const router=Router();
 router.patch("/campaigns/:campaignId",validateBody(updateCampaignInput),handle(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);
  const id=uuid.safeParse(req.params.campaignId);
  if(!id.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const input=updateCampaignInput.parse(req.body);
  const updated=await serializableTransaction(db,async tx=>{
   const c=await tx.campaign.findUnique({where:{id:id.data}});
   if(!c)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
   const member=await tx.businessMembership.findUnique({where:{
    businessId_userId:{businessId:c.ownerBusinessId,userId:p.userId}},
    include:{business:true}});
   if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
      member.business.archivedAt)
    throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
   if(!["DRAFT","CHANGES_REQUESTED"].includes(c.status))
    throw new HttpError(409,"CAMPAIGN_LOCKED","Campaign cannot be edited in this state");
   if(c.revision!==input.expectedRevision)
    throw new HttpError(409,"STALE_CAMPAIGN_REVISION","Campaign has changed");
   const start=input.startDate??dateString(c.startDate),
    end=input.endDate??dateString(c.endDate);
   const weekdays=input.weekdays??c.weekdays;
   const window=input.timeWindow??{start:formatMinute(c.startMinute),
    end:formatMinute(c.endMinute)};
   let mins:{startMinute:number;endMinute:number};
   try{validateSchedule(start,end,weekdays);mins=windowMinutes(window);}
   catch{throw new HttpError(422,"SCHEDULE_INVALID","Invalid schedule");}
   const creativeId=input.creativeId??c.creativeId;
   const creative=await tx.creative.findFirst({where:{id:creativeId,
    ownerBusinessId:c.ownerBusinessId}});
   if(!creative)throw new HttpError(422,"CREATIVE_NOT_OWNED","Business creative required");
   const changed=await tx.campaign.updateMany({where:{id:c.id,
    revision:input.expectedRevision,status:{in:["DRAFT","CHANGES_REQUESTED"]}},
    data:{title:input.title??c.title,creativeId,
     startDate:atUtc(start),endDate:atUtc(end),weekdays,
     ...mins,revision:{increment:1}}});
   if(changed.count!==1)throw new HttpError(409,"STALE_CAMPAIGN_REVISION","Concurrent update");
   await tx.auditEvent.create({data:{actorUserId:p.userId,
    action:"campaign.draft_updated",resourceType:"campaign",resourceId:c.id,
    metadata:{revision:input.expectedRevision+1}}});
   return tx.campaign.findUniqueOrThrow({where:{id:c.id}});
  });
  res.json({data:campaignResponse(updated)});
 }));
 return router;
}
