import { Router,type Request,type Response,type NextFunction } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole,requireBusinessMembership } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { holdInput,uuid } from "./schemas.js";
import { HOLD_TTL_MS,assertReservationEligible,lockScreens,reclaimExpired } from "./core.js";
import { effectiveState,holdView } from "./serialize.js";
import { dateString } from "../pricing/schemas.js";

const safe=(fn:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void fn(q,s).catch(n);};
function holdId(req:Request){
 const id=uuid.safeParse(req.params.holdId);
 if(!id.success)throw new HttpError(404,"NOT_FOUND","Hold unavailable");
 return id.data;
}
export function createReservationRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth;
 const router=Router();
 router.post("/reservations/holds",validateBody(holdInput),safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);
  if(config.nodeEnv==="production"&&process.env.BOOKING_HOLDS_ENABLED!=="true")
   throw new HttpError(503,"INVENTORY_UNVERIFIED","Live reservations not enabled");
  const input=holdInput.parse(req.body);
  const quote=await db.priceQuote.findUnique({where:{id:input.quoteId}});
  if(!quote||quote.campaignId!==input.campaignId)
   throw new HttpError(404,"NOT_FOUND","Quote unavailable");
  await requireBusinessMembership(db,p,quote.businessId,["OWNER","MANAGER"]);
  const made=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/reservations/holds","POST",input,async tx=>{
    const now=new Date();
    const member=await tx.businessMembership.findUnique({where:{
     businessId_userId:{businessId:quote.businessId,userId:p.userId}},
     include:{business:true}});
    if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
       member.business.archivedAt)
     throw new HttpError(404,"NOT_FOUND","Active business unavailable");
    // Explicit row locks plus the unique screen/day PK are the inventory authority.
    await lockScreens(tx,input.screenIds);
    const eligible=await assertReservationEligible(tx,input.campaignId,input.quoteId,input.screenIds,now);
    if(eligible.campaign.ownerBusinessId!==quote.businessId)
     throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
    await reclaimExpired(tx,input.screenIds,eligible.dates,now);
    const expiresAt=new Date(Math.min(now.getTime()+HOLD_TTL_MS,eligible.quote.expiresAt.getTime()));
    if(expiresAt.getTime()<=now.getTime())
     throw new HttpError(409,"QUOTE_EXPIRED","Quote already expired");
    const hold=await tx.reservationHold.create({data:{
     businessId:quote.businessId,campaignId:input.campaignId,quoteId:input.quoteId,
     createdByUserId:p.userId,expiresAt}});
    const items=input.screenIds.flatMap(screenId=>eligible.dates.map(serviceDate=>({
     holdId:hold.id,screenId,serviceDate})));
    await tx.reservationHoldItem.createMany({data:items});
    await tx.inventorySlot.createMany({data:items});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"inventory.hold_created",resourceType:"reservation_hold",resourceId:hold.id,
     metadata:{screenCount:input.screenIds.length,dayCount:eligible.dates.length,
      quoteId:input.quoteId}}});
    await tx.outboxEvent.create({data:{aggregateType:"reservation_hold",aggregateId:hold.id,
     eventType:"inventory.hold_created",payload:{holdId:hold.id,campaignId:input.campaignId,
      expiresAt:expiresAt.toISOString()}}});
    return hold.id;
   });
  const hold=await db.reservationHold.findUniqueOrThrow({where:{id:made.resourceId},
   include:{items:{orderBy:[{serviceDate:"asc"},{screenId:"asc"}]}}});
  res.status(201).set("Cache-Control","no-store").json({data:holdView(hold)});
 }));
 router.get("/reservations/holds/:holdId",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  const h=await db.reservationHold.findUnique({where:{id:holdId(req)},
   include:{items:{orderBy:[{serviceDate:"asc"},{screenId:"asc"}]}}});
  if(!h)throw new HttpError(404,"NOT_FOUND","Hold unavailable");
  await requireBusinessMembership(db,p,h.businessId);
  res.set("Cache-Control","no-store").json({data:holdView(h)});
 }));
 router.delete("/reservations/holds/:holdId",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);
  if(Object.keys(req.body??{}).length)
   throw new HttpError(422,"VALIDATION_ERROR","Release body must be empty");
  const id=holdId(req);
  const hold=await db.reservationHold.findUnique({where:{id},
   include:{items:{select:{screenId:true}}}});
  if(!hold)throw new HttpError(404,"NOT_FOUND","Hold unavailable");
  await requireBusinessMembership(db,p,hold.businessId,["OWNER","MANAGER"]);
  const changed=await serializableTransaction(db,async tx=>{
   await lockScreens(tx,hold.items.map(x=>x.screenId));
   const h=await tx.reservationHold.findUnique({where:{id}});
   if(!h)throw new HttpError(404,"NOT_FOUND","Hold unavailable");
   const membership=await tx.businessMembership.findUnique({where:{
    businessId_userId:{businessId:h.businessId,userId:p.userId}},
    include:{business:true}});
   if(!membership||membership.revokedAt||!["OWNER","MANAGER"].includes(membership.role)||
      membership.business.archivedAt)
    throw new HttpError(404,"NOT_FOUND","Hold unavailable");
   if(h.state==="CONFIRMED")
    throw new HttpError(409,"CONFIRMED_BOOKING","Cannot release confirmed capacity");
   if(h.state==="HELD"){
    // Delete slots before changing state. This never touches immutable history.
    await tx.inventorySlot.deleteMany({where:{holdId:id}});
    const expired=h.expiresAt<=new Date();
    await tx.reservationHold.update({where:{id},data:expired?
     {state:"EXPIRED"}:{state:"RELEASED",releasedAt:new Date()}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:expired?"inventory.hold_expired":"inventory.hold_released",
     resourceType:"reservation_hold",resourceId:id}});
    await tx.outboxEvent.create({data:{aggregateType:"reservation_hold",aggregateId:id,
     eventType:expired?"inventory.hold_expired":"inventory.hold_released",
     payload:{holdId:id,campaignId:h.campaignId}}});
   }
   return tx.reservationHold.findUniqueOrThrow({where:{id},
    include:{items:{orderBy:[{serviceDate:"asc"},{screenId:"asc"}]}}});
  });
  res.set("Cache-Control","no-store").json({data:holdView(changed)});
 }));
 router.get("/campaigns/:campaignId/bookings",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);
  requireRole(p,"ADVERTISER","ADMIN");
  const id=uuid.safeParse(req.params.campaignId);
  if(!id.success)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  const campaign=await db.campaign.findUnique({where:{id:id.data}});
  if(!campaign)throw new HttpError(404,"NOT_FOUND","Campaign unavailable");
  if(p.role==="ADVERTISER")
   await requireBusinessMembership(db,p,campaign.ownerBusinessId);
  const holds=await db.reservationHold.findMany({where:{campaignId:id.data},
   include:{items:{orderBy:[{serviceDate:"asc"},{screenId:"asc"}]}},
   orderBy:{createdAt:"desc"},take:100});
  const data=holds.flatMap(h=>h.items.map(item=>({
   id:item.id,holdId:h.id,campaignId:h.campaignId,screenId:item.screenId,
   startDate:dateString(item.serviceDate),endDate:dateString(item.serviceDate),
   status:effectiveState(h)==="held"?"held":
    effectiveState(h)==="confirmed"?"confirmed":"cancelled",
   holdState:effectiveState(h),expiresAt:h.expiresAt.toISOString(),
   paymentStatus:"unpaid",
  })));
  res.set("Cache-Control","no-store").json({data,meta:{holdCount:holds.length}});
 }));
 return router;
}
