import {Router,type Request,type Response,type NextFunction} from "express";
import {z} from "zod";
import type {Prisma,PrismaClient} from "@prisma/client";
import type {AppConfig} from "../../config/env.js";
import type {AuthDependencies} from "../auth/routes.js";
import {resolvePrincipal,requireRole,requireBusinessMembership,type AuthPrincipal} from "../auth/policy.js";
import {mutation} from "../pricing/guard.js";
import {executeIdempotent} from "../drivers/idempotency.js";
import {serializableTransaction} from "../../db/transaction.js";
import {HttpError} from "../../lib/http-error.js";
import {validateBody} from "../../middleware/validate.js";
import {enqueueSupportNotice} from "./jobs.js";
const safe=(f:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void f(q,s).catch(n);};
const uuid=z.uuid();
const parseId=(req:Request,key:string)=>{
 const out=uuid.safeParse(req.params[key]);
 if(!out.success)throw new HttpError(404,"NOT_FOUND","Resource unavailable");
 return out.data;
};
const ticketInput=z.strictObject({
 category:z.enum(["GENERAL","BILLING","DEVICE"]),
 businessId:uuid.optional(),screenId:uuid.optional(),
 subject:z.string().trim().min(5).max(160),description:z.string().trim().min(12).max(2000),
}).refine(v=>!(v.businessId&&v.screenId),{message:"Choose one support scope"});
const messageInput=z.strictObject({body:z.string().trim().min(1).max(2000),
 visibility:z.enum(["PUBLIC","INTERNAL"]).default("PUBLIC")});
const updateTicketInput=z.strictObject({
 expectedVersion:z.int().min(1),
 status:z.enum(["OPEN","IN_PROGRESS","RESOLVED","CLOSED"]),
 assignedToUserId:uuid.nullish(),
});
const maintenanceInput=z.strictObject({resolutionNote:z.string().trim().max(1500).optional()});
const updateMaintenanceInput=z.strictObject({
 expectedState:z.enum(["OPEN","IN_PROGRESS"]),
 state:z.enum(["IN_PROGRESS","RESOLVED"]),
 resolutionNote:z.string().trim().min(10).max(1500).optional(),
});
const empty=z.strictObject({});
const snapshot=(t:{id:string;createdByUserId:string;businessId:string|null;screenId:string|null;
 category:string;status:string;subject:string;description:string;version:number;
 assignedToUserId:string|null;createdAt:Date;updatedAt:Date;resolvedAt:Date|null})=>({
 id:t.id,createdByUserId:t.createdByUserId,businessId:t.businessId,screenId:t.screenId,
 category:t.category.toLowerCase(),status:t.status.toLowerCase(),subject:t.subject,
 description:t.description,version:t.version,assignedToUserId:t.assignedToUserId,
 createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),
 resolvedAt:t.resolvedAt?.toISOString()??null,
});
const maintenanceView=(m:{id:string;ticketId:string;screenId:string;state:string;
 resolutionNote:string|null;openedAt:Date;updatedAt:Date;resolvedAt:Date|null})=>({
 id:m.id,ticketId:m.ticketId,screenId:m.screenId,state:m.state.toLowerCase(),
 resolutionNote:m.resolutionNote,openedAt:m.openedAt.toISOString(),
 updatedAt:m.updatedAt.toISOString(),resolvedAt:m.resolvedAt?.toISOString()??null,
});
async function visible(db:PrismaClient,p:AuthPrincipal,t:{
 createdByUserId:string;businessId:string|null},adminAllowed=true):Promise<void>{
 if(p.role==="ADMIN"&&adminAllowed)return;
 if(t.createdByUserId===p.userId)return;
 if(p.role==="ADVERTISER"&&t.businessId){
  await requireBusinessMembership(db,p,t.businessId);
  return;
 }
 throw new HttpError(404,"NOT_FOUND","Ticket unavailable");
}
async function writable(db:PrismaClient,p:AuthPrincipal,t:{
 createdByUserId:string;businessId:string|null}):Promise<void>{
 if(p.role==="ADMIN"||t.createdByUserId===p.userId)return;
 if(p.role==="ADVERTISER"&&t.businessId){
  await requireBusinessMembership(db,p,t.businessId,["OWNER","MANAGER"]);
  return;
 }
 throw new HttpError(404,"NOT_FOUND","Ticket unavailable");
}
async function admins(tx:Prisma.TransactionClient){
 return (await tx.user.findMany({where:{role:"ADMIN",status:"ACTIVE",emailVerifiedAt:{not:null}},
  select:{id:true},take:100})).map(x=>x.id);
}
function readLimit(req:Request){
 if(Object.keys(req.query).some(k=>k!=="limit"&&k!=="cursor"))
  throw new HttpError(422,"VALIDATION_ERROR","Unsupported query");
 const v=req.query.limit??"20";
 if(typeof v!=="string"||!/^(?:[1-9]|[1-4][0-9]|50)$/.test(v))
  throw new HttpError(422,"VALIDATION_ERROR","Limit must be 1-50");
 const cursor=req.query.cursor;
 if(cursor!==undefined&&(typeof cursor!=="string"||!uuid.safeParse(cursor).success))
  throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
 return {limit:Number(v),cursor:cursor as string|undefined};
}
export function createSupportRouter(config:AppConfig,auth:AuthDependencies):Router{
 const {db,settings}=auth,router=Router();
 const principal=(req:Request)=>resolvePrincipal(req,db,settings);
 const guard=(req:Request,p:AuthPrincipal)=>mutation(req,config,p,settings.secret);
 const admin=async(req:Request)=>{const p=await principal(req);requireRole(p,"ADMIN");return p;};
 router.post("/support/tickets",validateBody(ticketInput),safe(async(req,res)=>{
  const p=await principal(req);requireRole(p,"ADVERTISER","DRIVER");guard(req,p);
  const input=ticketInput.parse(req.body);
  if(p.role==="DRIVER"){
   if(input.businessId||input.category==="BILLING")
    throw new HttpError(403,"FORBIDDEN","Driver support scope is invalid");
   if(input.screenId){
    const screen=await db.screen.findUnique({where:{id:input.screenId},include:{vehicle:true}});
    if(!screen||screen.vehicle.driverUserId!==p.userId)
     throw new HttpError(404,"NOT_FOUND","Screen unavailable");
   }
   if(input.category==="DEVICE"&&!input.screenId)
    throw new HttpError(422,"SCREEN_REQUIRED","Device ticket needs owned screen");
  }else{
   if(input.screenId||input.category==="DEVICE"||!input.businessId)
    throw new HttpError(422,"BUSINESS_REQUIRED","Advertiser support requires owned business");
   await requireBusinessMembership(db,p,input.businessId,["OWNER","MANAGER"]);
  }
  const done=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/support/tickets","POST",input,async tx=>{
    if(input.businessId){
     const member=await tx.businessMembership.findUnique({where:{businessId_userId:{
      businessId:input.businessId,userId:p.userId}}});
     if(!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role))
      throw new HttpError(404,"NOT_FOUND","Business unavailable");
    }
    const ticket=await tx.supportTicket.create({data:{
     createdByUserId:p.userId,businessId:input.businessId??null,screenId:input.screenId??null,
     category:input.category,subject:input.subject,description:input.description,
    }});
    await enqueueSupportNotice(tx,"b20:ticket:"+ticket.id,await admins(tx),ticket.id,
     "SUPPORT","New support ticket","A support request needs review");
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"support.ticket_opened",resourceType:"support_ticket",resourceId:ticket.id}});
    return ticket.id;
  });
  const ticket=await db.supportTicket.findUniqueOrThrow({where:{id:done.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:snapshot(ticket)});
 }));
 router.get("/support/tickets",safe(async(req,res)=>{
  const p=await principal(req),{limit,cursor}=readLimit(req);
  const where:Prisma.SupportTicketWhereInput=p.role==="ADMIN"?{}:
   p.role==="DRIVER"?{createdByUserId:p.userId}:{
    OR:[{createdByUserId:p.userId},{business:{
     memberships:{some:{userId:p.userId,revokedAt:null}}}}]};
  // Business relation not required by B20 schema: use eligible IDs from membership.
  if(p.role==="ADVERTISER"){
   const owned=await db.businessMembership.findMany({where:{
    userId:p.userId,revokedAt:null},select:{businessId:true}});
   where.OR=[{createdByUserId:p.userId},{businessId:{in:owned.map(x=>x.businessId)}}];
  }
  const rows=await db.supportTicket.findMany({where:{
   ...where,...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:"asc"},take:limit+1});
  const page=rows.slice(0,limit);
  res.set("Cache-Control","no-store").json({data:page.map(snapshot),meta:{
   limit,nextCursor:rows.length>limit?page.at(-1)?.id??null:null}});
 }));
 router.get("/support/tickets/:ticketId",safe(async(req,res)=>{
  const p=await principal(req),ticket=await db.supportTicket.findUnique({
   where:{id:parseId(req,"ticketId")},include:{messages:{orderBy:[
    {createdAt:"asc"},{id:"asc"}],take:200},maintenance:true}});
  if(!ticket)throw new HttpError(404,"NOT_FOUND","Ticket unavailable");
  await visible(db,p,ticket);
  const show=ticket.messages.filter(x=>p.role==="ADMIN"||x.visibility==="PUBLIC");
  res.set("Cache-Control","no-store").json({data:{...snapshot(ticket),
   messages:show.map(x=>({id:x.id,authorUserId:x.authorUserId,
    visibility:x.visibility.toLowerCase(),body:x.body,createdAt:x.createdAt.toISOString()})),
   maintenance:ticket.maintenance?maintenanceView(ticket.maintenance):null}});
 }));
 router.post("/support/tickets/:ticketId/messages",validateBody(messageInput),safe(async(req,res)=>{
  const p=await principal(req);guard(req,p);
  const id=parseId(req,"ticketId"),input=messageInput.parse(req.body);
  if(input.visibility==="INTERNAL"&&p.role!=="ADMIN")
   throw new HttpError(403,"FORBIDDEN","Internal notes require Admin");
  const done=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/support/tickets/"+id+"/messages","POST",input,async tx=>{
    const t=await tx.supportTicket.findUnique({where:{id}});
    if(!t)throw new HttpError(404,"NOT_FOUND","Ticket unavailable");
    await writable(db,p,t);
    if(t.status==="CLOSED")throw new HttpError(409,"TICKET_CLOSED","Ticket is closed");
    const message=await tx.supportMessage.create({data:{
     ticketId:id,authorUserId:p.userId,visibility:input.visibility,body:input.body}});
    const receivers=p.role==="ADMIN"?[t.createdByUserId]:await admins(tx);
    if(input.visibility==="PUBLIC")await enqueueSupportNotice(tx,
     "b20:message:"+message.id,receivers.filter(x=>x!==p.userId),id,
     "SUPPORT","Support ticket updated","A new support message is available");
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"support.message_added",
     resourceType:"support_ticket",resourceId:id}});
    return message.id;
  });
  const message=await db.supportMessage.findUniqueOrThrow({where:{id:done.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:{
   id:message.id,ticketId:message.ticketId,visibility:message.visibility.toLowerCase(),
   body:message.body,createdAt:message.createdAt.toISOString()}});
 }));
 router.patch("/admin/support/tickets/:ticketId",validateBody(updateTicketInput),safe(async(req,res)=>{
  const p=await admin(req);guard(req,p);const id=parseId(req,"ticketId");
  const input=updateTicketInput.parse(req.body);
  const record=await serializableTransaction(db,async tx=>{
   const old=await tx.supportTicket.findUnique({where:{id}});
   if(!old)throw new HttpError(404,"NOT_FOUND","Ticket unavailable");
   if(old.status==="CLOSED"||input.status==="OPEN"&&old.status!=="OPEN"||
     input.status==="CLOSED"&&old.status!=="RESOLVED"||
     input.status==="RESOLVED"&&old.status!=="IN_PROGRESS"||
     input.status==="IN_PROGRESS"&&old.status!=="OPEN")
    throw new HttpError(409,"SUPPORT_TRANSITION_INVALID","Invalid support transition");
   if(input.assignedToUserId){
    const assignee=await tx.user.findUnique({where:{id:input.assignedToUserId}});
    if(!assignee||assignee.role!=="ADMIN"||assignee.status!=="ACTIVE")
     throw new HttpError(422,"ASSIGNEE_INVALID","Active Admin required");
   }
   const updated=await tx.supportTicket.updateMany({where:{id,version:input.expectedVersion},
    data:{status:input.status,version:{increment:1},
     assignedToUserId:input.assignedToUserId??old.assignedToUserId,
     resolvedAt:input.status==="RESOLVED"?new Date():old.resolvedAt}});
   if(updated.count!==1)throw new HttpError(409,"SUPPORT_VERSION_CONFLICT","Ticket version changed");
   const result=await tx.supportTicket.findUniqueOrThrow({where:{id}});
   await enqueueSupportNotice(tx,"b20:status:"+id+":"+result.version,[result.createdByUserId],id,
    "SUPPORT","Support ticket status changed","Your support request has an update");
   await tx.auditEvent.create({data:{actorUserId:p.userId,action:"support.status_changed",
    resourceType:"support_ticket",resourceId:id}});
   return result;
  });
  res.set("Cache-Control","no-store").json({data:snapshot(record)});
 }));
 router.post("/admin/support/tickets/:ticketId/maintenance",validateBody(maintenanceInput),
 safe(async(req,res)=>{
  const p=await admin(req);guard(req,p);const id=parseId(req,"ticketId");
  const done=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/support/tickets/"+id+"/maintenance","POST",req.body,async tx=>{
    const ticket=await tx.supportTicket.findUnique({where:{id}});
    if(!ticket||ticket.category!=="DEVICE"||!ticket.screenId||ticket.status==="CLOSED")
     throw new HttpError(409,"MAINTENANCE_TICKET_INVALID","Open device support ticket required");
    const screen=await tx.screen.findUnique({where:{id:ticket.screenId},include:{vehicle:true}});
    if(!screen||screen.vehicle.driverUserId!==ticket.createdByUserId)
     throw new HttpError(409,"MAINTENANCE_OWNER_INVALID","Ticket screen ownership mismatch");
    const caseFile=await tx.screenMaintenance.create({data:{
     ticketId:id,screenId:screen.id,openedByUserId:p.userId}});
    await enqueueSupportNotice(tx,"b20:maintenance:"+caseFile.id,[ticket.createdByUserId],
     ticket.id,"MAINTENANCE","Screen maintenance opened","A screen service case has been opened");
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"maintenance.opened",
     resourceType:"screen_maintenance",resourceId:caseFile.id}});
    return caseFile.id;
  });
  const found=await db.screenMaintenance.findUniqueOrThrow({where:{id:done.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:maintenanceView(found)});
 }));
 router.patch("/admin/maintenance/:caseId",validateBody(updateMaintenanceInput),safe(async(req,res)=>{
  const p=await admin(req);guard(req,p);
  const id=parseId(req,"caseId"),input=updateMaintenanceInput.parse(req.body);
  if(input.state==="RESOLVED"&&!input.resolutionNote)
   throw new HttpError(422,"RESOLUTION_NOTE_REQUIRED","Resolution evidence required");
  if(input.expectedState==="IN_PROGRESS"&&input.state!=="RESOLVED"||
    input.expectedState==="OPEN"&&input.state!=="IN_PROGRESS")
   throw new HttpError(409,"MAINTENANCE_TRANSITION_INVALID","Invalid maintenance transition");
  const result=await serializableTransaction(db,async tx=>{
   const file=await tx.screenMaintenance.findUnique({where:{id},
    include:{ticket:true}});
   if(!file)throw new HttpError(404,"NOT_FOUND","Maintenance unavailable");
   const changed=await tx.screenMaintenance.updateMany({where:{
    id,state:input.expectedState},data:{state:input.state,
    ...(input.state==="RESOLVED"?{resolutionNote:input.resolutionNote,
     resolvedAt:new Date()}:{})}});
   if(changed.count!==1)throw new HttpError(409,"MAINTENANCE_VERSION_CONFLICT","Case state changed");
   await enqueueSupportNotice(tx,"b20:maintenance:"+id+":"+input.state,
    [file.ticket.createdByUserId],file.ticketId,"MAINTENANCE",
    "Screen maintenance updated","Your screen service status has changed");
   await tx.auditEvent.create({data:{actorUserId:p.userId,action:"maintenance.state_changed",
    resourceType:"screen_maintenance",resourceId:id}});
   return tx.screenMaintenance.findUniqueOrThrow({where:{id}});
  });
  res.set("Cache-Control","no-store").json({data:maintenanceView(result)});
 }));
 router.get("/maintenance",safe(async(req,res)=>{
  const p=await principal(req),{limit,cursor}=readLimit(req);
  const where:Prisma.ScreenMaintenanceWhereInput=p.role==="ADMIN"?{}:
   {ticket:{createdByUserId:p.userId}};
  const rows=await db.screenMaintenance.findMany({where:{
   ...where,...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:"asc"},take:limit+1});
  res.set("Cache-Control","no-store").json({data:rows.slice(0,limit).map(maintenanceView),
   meta:{limit,nextCursor:rows.length>limit?rows[limit-1]?.id??null:null}});
 }));
 router.get("/notifications",safe(async(req,res)=>{
  const p=await principal(req),{limit,cursor}=readLimit(req);
  const rows=await db.userNotification.findMany({where:{
   recipientUserId:p.userId,...(cursor?{id:{gt:cursor}}:{})},
   orderBy:{id:"asc"},take:limit+1});
  const unread=await db.userNotification.count({where:{recipientUserId:p.userId,readAt:null}});
  res.set("Cache-Control","no-store").json({data:rows.slice(0,limit).map(n=>({
   id:n.id,kind:n.kind.toLowerCase(),title:n.title,body:n.body,ticketId:n.ticketId,
   createdAt:n.createdAt.toISOString(),readAt:n.readAt?.toISOString()??null,
  })),meta:{limit,unreadCount:unread,
   nextCursor:rows.length>limit?rows[limit-1]?.id??null:null}});
 }));
 router.post("/notifications/:notificationId/read",validateBody(empty),safe(async(req,res)=>{
  const p=await principal(req);guard(req,p);const id=parseId(req,"notificationId");
  const count=await db.userNotification.updateMany({where:{id,recipientUserId:p.userId,
   readAt:null},data:{readAt:new Date()}});
  if(!count.count){
   const old=await db.userNotification.findFirst({where:{id,recipientUserId:p.userId}});
   if(!old)throw new HttpError(404,"NOT_FOUND","Notification unavailable");
  }
  res.set("Cache-Control","no-store").json({data:{read:true}});
 }));
 router.get("/admin/jobs",safe(async(req,res)=>{
  await admin(req);const {limit,cursor}=readLimit(req);
  const rows=await db.durableJob.findMany({where:{...(cursor?{id:{gt:cursor}}:{})},
   orderBy:{id:"asc"},take:limit+1});
  res.set("Cache-Control","no-store").json({data:rows.slice(0,limit).map(j=>({
   id:j.id,state:j.state.toLowerCase(),attempts:j.attempts,
   availableAt:j.availableAt.toISOString(),lastError:j.lastError,
   ticketId:j.ticketId,
  })),meta:{limit,nextCursor:rows.length>limit?rows[limit-1]?.id??null:null}});
 }));
 router.post("/admin/jobs/:jobId/retry",validateBody(empty),safe(async(req,res)=>{
  const p=await admin(req);guard(req,p);
  const id=parseId(req,"jobId");
  await serializableTransaction(db,async tx=>{
   const changed=await tx.durableJob.updateMany({where:{id,state:"DEAD"},
    data:{state:"PENDING",attempts:0,leaseToken:null,leaseUntil:null,lastError:null,
     availableAt:new Date()}});
   if(changed.count!==1)throw new HttpError(409,"JOB_NOT_DEAD","Dead-letter job required");
   await tx.auditEvent.create({data:{actorUserId:p.userId,action:"jobs.retry_authorized",
    resourceType:"durable_job",resourceId:id}});
  });
  res.set("Cache-Control","no-store").json({data:{queued:true}});
 }));
 return router;
}
