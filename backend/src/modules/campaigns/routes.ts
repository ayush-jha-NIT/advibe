import { Router,type Request,type Response,type NextFunction } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole,requireBusinessMembership } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { createCampaignInput,updateCampaignInput,windowMinutes,validateSchedule,uuid } from "./schemas.js";
import { atUtc,dateString } from "../pricing/schemas.js";
import { campaignResponse } from "./serializer.js";
import { createCampaignWorkflowRouter } from "./workflow.js";
const safe=(f:(q:Request,s:Response)=>Promise<void>)=>(q:Request,s:Response,n:NextFunction):void=>{
 void f(q,s).catch(n);};
const principal=async(q:Request,a:AuthDependencies)=>{
 const p=await resolvePrincipal(q,a.db,a.settings);requireRole(p,"ADVERTISER","ADMIN");return p;};
function id(req:Request){
 const x=uuid.safeParse(req.params.campaignId);
 if(!x.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
 return x.data;
}
export function safeSchedule(start:string,end:string,days:number[],time?:{start:string;end:string},
 submission=false){
 try{validateSchedule(start,end,days,submission);return windowMinutes(time);}
 catch{throw new HttpError(422,"SCHEDULE_INVALID","Invalid campaign schedule");}
}
export function createCampaignRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth;const router=Router();
 router.post("/campaigns",validateBody(createCampaignInput),safe(async(req,res)=>{
  const p=await principal(req,auth);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);
  const input=createCampaignInput.parse(req.body);
  const minutes=safeSchedule(input.startDate,input.endDate,input.weekdays,input.timeWindow);
  await requireBusinessMembership(db,p,input.businessId,["OWNER","MANAGER"]);
  const created=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/campaigns","POST",input,async tx=>{
    const member=await tx.businessMembership.findUnique({where:{
     businessId_userId:{businessId:input.businessId,userId:p.userId}},
     include:{business:true}});
    if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
      member.business.archivedAt)
     throw new HttpError(404,"NOT_FOUND","Business unavailable");
    const creative=await tx.creative.findFirst({where:{id:input.creativeId,
     ownerBusinessId:input.businessId}});
    if(!creative)throw new HttpError(422,"CREATIVE_NOT_OWNED","Business creative required");
    const c=await tx.campaign.create({data:{ownerBusinessId:input.businessId,
     createdByUserId:p.userId,title:input.title,creativeId:creative.id,
     startDate:atUtc(input.startDate),endDate:atUtc(input.endDate),
     weekdays:input.weekdays,...minutes}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"campaign.created",
     resourceType:"campaign",resourceId:c.id}});
    return c.id;
   });
  const c=await db.campaign.findUniqueOrThrow({where:{id:created.resourceId}});
  res.status(201).json({data:campaignResponse(c)});
 }));
 router.get("/campaigns",safe(async(req,res)=>{
  const p=await principal(req,auth);
  const allowed=new Set(["limit","cursor","businessId","status"]);
  if(Object.keys(req.query).some(k=>!allowed.has(k)))
   throw new HttpError(422,"VALIDATION_ERROR","Unsupported filter");
  const limit=req.query.limit===undefined?20:Number(req.query.limit);
  if(typeof req.query.limit==="object"||!Number.isInteger(limit)||limit<1||limit>100)
   throw new HttpError(422,"VALIDATION_ERROR","Invalid limit");
  const businessId=req.query.businessId,cursor=req.query.cursor,status=req.query.status;
  if(businessId!==undefined&&(typeof businessId!=="string"||!uuid.safeParse(businessId).success))
   throw new HttpError(422,"VALIDATION_ERROR","Invalid business");
  if(cursor!==undefined&&(typeof cursor!=="string"||!uuid.safeParse(cursor).success))
   throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
  const states=["draft","submitted","changes_requested","approved","rejected","cancelled"];
  if(status!==undefined&&(typeof status!=="string"||!states.includes(status)))
   throw new HttpError(422,"VALIDATION_ERROR","Invalid status");
  if(p.role==="ADVERTISER"&&businessId)
   await requireBusinessMembership(db,p,businessId as string);
  const list=await db.campaign.findMany({where:{
   ...(businessId?{ownerBusinessId:businessId as string}:{}),
   ...(cursor?{id:{gt:cursor as string}}:{}),
   ...(status?{status:(status as string).toUpperCase() as "DRAFT"|"SUBMITTED"|"CHANGES_REQUESTED"|"APPROVED"|"REJECTED"|"CANCELLED"}:{}),
   ...(p.role==="ADVERTISER"?{business:{archivedAt:null,
    memberships:{some:{userId:p.userId,revokedAt:null}}}}:{}),
  },orderBy:{id:"asc"},take:limit+1});
  const page=list.slice(0,limit);
  res.json({data:page.map(campaignResponse),meta:{limit,
   nextCursor:list.length>limit?page[page.length-1]?.id??null:null}});
 }));
 router.get("/campaigns/:campaignId",safe(async(req,res)=>{
  const p=await principal(req,auth);
  const c=await db.campaign.findUnique({where:{id:id(req)}});
  if(!c)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,c.ownerBusinessId);
  res.json({data:campaignResponse(c)});
 }));
 router.use(createCampaignWorkflowRouter(config,auth));
 return router;
}
