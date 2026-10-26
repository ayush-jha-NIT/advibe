
import { Router,type Request,type Response,type NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole,requireBusinessMembership,type AuthPrincipal } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { lockScreens } from "../reservations/core.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { deliveryEvidence,effectiveDeliveryState } from "./eligibility.js";
import { dateString } from "../pricing/schemas.js";

const safe=(f:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void f(q,s).catch(n);};
const uuid=z.uuid();
const empty=z.strictObject({});
const pauseInput=z.strictObject({expectedRevision:z.int().min(1),
 reason:z.string().trim().min(10).max(1000)});
const resumeInput=z.strictObject({expectedRevision:z.int().min(1)});
const id=(req:Request,key="holdId")=>{
 const r=uuid.safeParse(req.params[key]);
 if(!r.success)throw new HttpError(404,"NOT_FOUND","Delivery unavailable");
 return r.data;
};
type PlanView=Prisma.DeliveryPlanGetPayload<{include:{windows:true}}>;
const view=(p:PlanView)=>({
 id:p.id,reservationHoldId:p.reservationHoldId,paymentOrderId:p.paymentOrderId,
 campaignId:p.campaignId,businessId:p.businessId,status:p.state.toLowerCase(),
 revision:p.revision,activatedAt:p.activatedAt.toISOString(),
 pausedAt:p.pausedAt?.toISOString()??null,
 resumedAt:p.resumedAt?.toISOString()??null,completedAt:p.completedAt?.toISOString()??null,
 pauseReason:p.pauseReason,
 windows:p.windows.map(w=>({id:w.id,screenId:w.screenId,
  serviceDate:dateString(w.serviceDate),startAt:w.startsAt.toISOString(),
  endAt:w.endsAt.toISOString(),timeZone:w.cityTimeZone})),
});
async function authorise(db:AuthDependencies["db"],p:AuthPrincipal,businessId:string,
 write:boolean){
 if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,businessId,
  write?["OWNER","MANAGER"]:["OWNER","MANAGER","VIEWER"]);
}
async function current(db:AuthDependencies["db"],holdId:string){
 const plan=await db.deliveryPlan.findUnique({where:{reservationHoldId:holdId},
  include:{windows:{orderBy:[{startsAt:"asc"},{screenId:"asc"}]}}});
 if(!plan)throw new HttpError(404,"NOT_FOUND","Delivery plan unavailable");
 return plan;
}
export function createDeliveryRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth,router=Router();
 // Activation is operational approval, not a browser redirect or payment claim.
 router.post("/admin/reservations/holds/:holdId/delivery/activate",
  validateBody(empty),safe(async(req,res)=>{
   const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");
   mutation(req,config,p,settings.secret);
   const holdId=id(req);
   const preliminary=await db.reservationHold.findUnique({where:{id:holdId},
    include:{items:{select:{screenId:true}}}});
   if(!preliminary)throw new HttpError(404,"NOT_FOUND","Booking unavailable");
   const done=await executeIdempotent(db,p,req.get("idempotency-key"),
    "/api/v1/admin/reservations/holds/"+holdId+"/delivery/activate","POST",{},async tx=>{
     await lockScreens(tx,preliminary.items.map(i=>i.screenId));
     const now=new Date();
     const {hold,c,o,windows}=await deliveryEvidence(tx,holdId,now);
     if(await tx.deliveryPlan.findUnique({where:{reservationHoldId:holdId}}))
      throw new HttpError(409,"DELIVERY_ALREADY_ACTIVATED","Booking already has a delivery plan");
     const state=effectiveDeliveryState(windows,now);
     if(state==="COMPLETED")
      throw new HttpError(409,"DELIVERY_WINDOW_ENDED","Booked delivery window has elapsed");
     const plan=await tx.deliveryPlan.create({data:{reservationHoldId:hold.id,
      campaignId:c.id,businessId:hold.businessId,paymentOrderId:o.id,
      activatedAt:now,state}});
     await tx.deliveryWindow.createMany({data:windows.map(w=>({...w,planId:plan.id}))});
     await tx.auditEvent.create({data:{actorUserId:p.userId,action:"delivery.activated",
      resourceType:"delivery_plan",resourceId:plan.id,
      metadata:{holdId,windowCount:windows.length,state}}});
     await tx.outboxEvent.create({data:{aggregateType:"delivery_plan",aggregateId:plan.id,
      eventType:"delivery.activated",payload:{planId:plan.id,holdId,campaignId:c.id,state}}});
     return plan.id;
    });
   const result=await current(db,holdId);
   if(result.id!==done.resourceId)throw new HttpError(409,"DELIVERY_CONFLICT","Delivery plan changed");
   res.status(201).set("Cache-Control","no-store").json({data:view(result)});
  }));
 router.get("/reservations/holds/:holdId/delivery",safe(async(req,res)=>{
   const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER","ADMIN");
   const holdId=id(req);
   const plan=await db.deliveryPlan.findUnique({where:{reservationHoldId:holdId},
    include:{windows:{orderBy:[{startsAt:"asc"},{screenId:"asc"}]}}});
   if(!plan)throw new HttpError(404,"NOT_FOUND","Delivery plan unavailable");
   await authorise(db,p,plan.businessId,false);
   res.set("Cache-Control","no-store").json({data:view(plan)});
 }));
 const change=async(req:Request,res:Response,action:"pause"|"resume")=>{
   const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER","ADMIN");
   mutation(req,config,p,settings.secret);
   const holdId=id(req),input=action==="pause"?pauseInput.parse(req.body):resumeInput.parse(req.body);
   const plan=await db.deliveryPlan.findUnique({where:{reservationHoldId:holdId},
    include:{windows:{select:{screenId:true}}}});
   if(!plan)throw new HttpError(404,"NOT_FOUND","Delivery plan unavailable");
   await authorise(db,p,plan.businessId,true);
   const done=await executeIdempotent(db,p,req.get("idempotency-key"),
    "/api/v1/reservations/holds/"+holdId+"/delivery/"+action,"POST",input,async tx=>{
     await lockScreens(tx,plan.windows.map(w=>w.screenId));
     const fresh=await tx.deliveryPlan.findUnique({where:{reservationHoldId:holdId},
      include:{windows:true}});
     if(!fresh||fresh.revision!==input.expectedRevision)
      throw new HttpError(409,"DELIVERY_REVISION_CONFLICT","Delivery plan changed");
     if(p.role==="ADVERTISER"){
      const member=await tx.businessMembership.findUnique({where:{
       businessId_userId:{businessId:fresh.businessId,userId:p.userId}},
       include:{business:true}});
      if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
       member.business.archivedAt)
       throw new HttpError(404,"NOT_FOUND","Delivery plan unavailable");
     }
     const now=new Date();
     if(action==="pause"){
      if(!["ACTIVE","SCHEDULED"].includes(fresh.state))
       throw new HttpError(409,"DELIVERY_CANNOT_PAUSE","Only scheduled/active delivery can pause");
     }else{
      if(fresh.state!=="PAUSED")
       throw new HttpError(409,"DELIVERY_NOT_PAUSED","Delivery is not paused");
      const check=await deliveryEvidence(tx,holdId,now);
      if(fresh.windows.length!==check.windows.length||
        fresh.windows.some(w=>!check.windows.some(a=>
         a.screenId===w.screenId&&a.serviceDate.getTime()===w.serviceDate.getTime()&&
         a.startsAt.getTime()===w.startsAt.getTime()&&a.endsAt.getTime()===w.endsAt.getTime())))
       throw new HttpError(409,"DELIVERY_SCHEDULE_CHANGED","Immutable schedule no longer matches booking");
     }
     const state=action==="pause"?"PAUSED":
      effectiveDeliveryState(fresh.windows,now);
     if(state==="COMPLETED")throw new HttpError(409,"DELIVERY_WINDOW_ENDED","Cannot resume ended delivery");
     const result=await tx.deliveryPlan.updateMany({where:{id:fresh.id,revision:fresh.revision,
      state:fresh.state},data:{state,revision:{increment:1},
      ...(action==="pause"?{pausedAt:now,pauseReason:(input as z.infer<typeof pauseInput>).reason}:
       {resumedAt:now,pausedAt:null,pauseReason:null})}});
     if(result.count!==1)throw new HttpError(409,"DELIVERY_REVISION_CONFLICT","Delivery plan changed");
     await tx.auditEvent.create({data:{actorUserId:p.userId,
      action:"delivery."+action+"d",resourceType:"delivery_plan",resourceId:fresh.id,
      metadata:{holdId,state,reason:action==="pause"?(input as z.infer<typeof pauseInput>).reason:null}}});
     await tx.outboxEvent.create({data:{aggregateType:"delivery_plan",aggregateId:fresh.id,
      eventType:"delivery."+action+"d",payload:{planId:fresh.id,holdId,state}}});
     return fresh.id;
   });
   const result=await current(db,holdId);
   if(result.id!==done.resourceId)throw new HttpError(409,"DELIVERY_CONFLICT","Delivery plan changed");
   res.set("Cache-Control","no-store").json({data:view(result)});
 };
 router.post("/reservations/holds/:holdId/delivery/pause",
  validateBody(pauseInput),safe(async(req,res)=>change(req,res,"pause")));
 router.post("/reservations/holds/:holdId/delivery/resume",
  validateBody(resumeInput),safe(async(req,res)=>change(req,res,"resume")));
 router.get("/admin/screens/:screenId/delivery",safe(async(req,res)=>{
   const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");
   const screenId=id(req,"screenId");
   const rows=await db.deliveryWindow.findMany({where:{screenId},include:{plan:true},
    orderBy:[{startsAt:"asc"},{id:"asc"}],take:100});
   res.set("Cache-Control","no-store").json({data:rows.map(w=>({
    id:w.id,planId:w.planId,campaignId:w.plan.campaignId,
    status:w.plan.state.toLowerCase(),serviceDate:dateString(w.serviceDate),
    startAt:w.startsAt.toISOString(),endAt:w.endsAt.toISOString(),
    timeZone:w.cityTimeZone,
    currentlyInWindow:w.startsAt<=new Date()&&w.endsAt>new Date(),
   }))});
 }));
 return router;
}
