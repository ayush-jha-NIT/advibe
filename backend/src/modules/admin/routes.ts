import {Router,type Request,type Response,type NextFunction} from "express";
import {z} from "zod";
import {Prisma,type AccountRole,type AccountStatus} from "@prisma/client";
import type {AppConfig} from "../../config/env.js";
import type {AuthDependencies} from "../auth/routes.js";
import {resolvePrincipal,requireRole} from "../auth/policy.js";
import {mutation} from "../pricing/guard.js";
import {executeIdempotent} from "../drivers/idempotency.js";
import {HttpError} from "../../lib/http-error.js";
import {validateBody} from "../../middleware/validate.js";
import {collectReport,exportCsv,reportRange} from "./reports.js";
const safe=(fn:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void fn(req,res).catch(next);};
const id=z.uuid();
const accountUpdate=z.strictObject({
 expectedStatus:z.enum(["ACTIVE","SUSPENDED"]),
 status:z.enum(["ACTIVE","SUSPENDED"]),
 reason:z.string().trim().min(20).max(500),
}).refine(v=>v.expectedStatus!==v.status,{message:"Status must change"});
const auditAction=z.string().regex(/^[a-z0-9._-]{3,120}$/);
const resource=z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const getId=(req:Request,key:string)=>{
 const value=id.safeParse(req.params[key]);
 if(!value.success)throw new HttpError(404,"NOT_FOUND","Resource unavailable");
 return value.data;
};
function safeQuery(req:Request,allowed:string[]):void {
 if(Object.keys(req.query).some(k=>!allowed.includes(k)))
  throw new HttpError(422,"FILTER_INVALID","Unsupported filter");
}
function page(req:Request){
 const limit=req.query.limit??"20",cursor=req.query.cursor;
 if(typeof limit!=="string"||!/^(?:[1-9]|[1-4][0-9]|50)$/.test(limit))
  throw new HttpError(422,"PAGE_LIMIT_INVALID","Limit must be 1–50");
 if(cursor!==undefined&&(typeof cursor!=="string"||!id.safeParse(cursor).success))
  throw new HttpError(422,"CURSOR_INVALID","Invalid cursor");
 return {take:Number(limit),cursor:cursor as string|undefined};
}
function optionalEnum<T extends readonly [string,...string[]]>(input:unknown,values:T){
 if(input===undefined)return undefined;
 const p=z.enum(values).safeParse(input);
 if(!p.success)throw new HttpError(422,"FILTER_INVALID","Unknown filter value");
 return p.data;
}
function optionalText(input:unknown,kind:"action"|"resource"|"search"){
 if(input===undefined)return undefined;
 if(typeof input!=="string")throw new HttpError(422,"FILTER_INVALID","Invalid text filter");
 if(kind==="search"){
  if(input.trim().length<2||input.length>80)
   throw new HttpError(422,"FILTER_INVALID","Search requires 2–80 characters");
  return input.trim();
 }
 const ok=(kind==="action"?auditAction:resource).safeParse(input);
 if(!ok.success)throw new HttpError(422,"FILTER_INVALID","Invalid audit filter");
 return ok.data;
}
const userView=(u:{id:string;displayName:string;email:string;role:string;status:string;
 emailVerifiedAt:Date|null;createdAt:Date})=>({
 id:u.id,displayName:u.displayName,email:u.email,role:u.role.toLowerCase(),
 status:u.status.toLowerCase(),verified:u.emailVerifiedAt!==null,
 createdAt:u.createdAt.toISOString(),
});
const auditView=(e:{id:string;actorUserId:string|null;action:string;resourceType:string;
 resourceId:string;createdAt:Date})=>({
 id:e.id,actorUserId:e.actorUserId,action:e.action,resourceType:e.resourceType,
 resourceId:e.resourceId,createdAt:e.createdAt.toISOString(),
 // No metadata, secret IDs, PII or arbitrary request body is published here.
});
export function createAdminRouter(config:AppConfig,auth:AuthDependencies):Router {
 const {db,settings}=auth,router=Router();
 const admin=async(req:Request)=>{
  const principal=await resolvePrincipal(req,db,settings);
  requireRole(principal,"ADMIN");return principal;
 };
 router.get("/admin/reports",safe(async(req,res)=>{
  await admin(req);
  const report=await collectReport(db,reportRange(req.query));
  res.set("Cache-Control","private, no-store").json({data:report});
 }));
 router.get("/admin/reports/export",safe(async(req,res)=>{
  const p=await admin(req),range=reportRange(req.query,31);
  const report=await collectReport(db,range);
  const values=Object.entries(report.counts).map(([key,value])=>["count",key,value]);
  const money=Object.entries(report.financial).map(([key,value])=>["paise",key,value]);
  const csv=exportCsv(["category","metric","value"],[...values,...money]);
  await db.auditEvent.create({data:{
   actorUserId:p.userId,action:"admin.report_exported",
   resourceType:"admin_report",resourceId:range.from+"_"+range.to,
   metadata:{from:range.from,to:range.to,format:"csv",rows:values.length+money.length},
  }});
  res.set({"Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":'attachment; filename="advibe-admin-report.csv"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}).send(csv);
 }));
 router.get("/admin/users",safe(async(req,res)=>{
  await admin(req);
  safeQuery(req,["limit","cursor","role","status","search"]);
  const {take,cursor}=page(req);
  const role=optionalEnum(req.query.role,["ADVERTISER","DRIVER","ADMIN"]);
  const status=optionalEnum(req.query.status,["PENDING","ACTIVE","SUSPENDED","CLOSED"]);
  const search=optionalText(req.query.search,"search");
  const where:Prisma.UserWhereInput={
   ...(role?{role:role as AccountRole}:{}),...(status?{status:status as AccountStatus}:{}),
   ...(search?{OR:[{email:{contains:search,mode:"insensitive"}},
    {displayName:{contains:search,mode:"insensitive"}}]}:{}),
   ...(cursor?{id:{gt:cursor}}:{}),
  };
  const rows=await db.user.findMany({where,select:{
   id:true,displayName:true,email:true,role:true,status:true,emailVerifiedAt:true,
   createdAt:true},orderBy:{id:"asc"},take:take+1});
  res.set("Cache-Control","private, no-store").json({data:rows.slice(0,take).map(userView),
   meta:{limit:take,nextCursor:rows.length>take?rows[take-1]?.id??null:null}});
 }));
 router.patch("/admin/users/:userId/status",validateBody(accountUpdate),safe(async(req,res)=>{
  const p=await admin(req);
  mutation(req,config,p,settings.secret);
  const targetId=getId(req,"userId"),input=accountUpdate.parse(req.body);
  if(p.userId===targetId)
   throw new HttpError(403,"ADMIN_SELF_MODIFICATION","Admin cannot change own status");
  if(input.expectedStatus==="ACTIVE"&&input.status!=="SUSPENDED"||
    input.expectedStatus==="SUSPENDED"&&input.status!=="ACTIVE")
   throw new HttpError(422,"STATUS_TRANSITION_INVALID","Only suspension and reactivation supported");
  const output=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/users/"+targetId+"/status","PATCH",input,async tx=>{
    const user=await tx.user.findUnique({where:{id:targetId},select:{
     id:true,role:true,status:true,emailVerifiedAt:true,passwordHash:true}});
    if(!user||user.role==="ADMIN")
     throw new HttpError(404,"NOT_FOUND","Managed user unavailable");
    if(user.status!==input.expectedStatus)
     throw new HttpError(409,"ACCOUNT_VERSION_CONFLICT","Account status changed");
    if(input.status==="ACTIVE"&&(!user.emailVerifiedAt||!user.passwordHash))
     throw new HttpError(409,"ACCOUNT_NOT_VERIFIED","Cannot activate unverified account");
    const changed=await tx.user.updateMany({where:{id:targetId,
     role:{in:["ADVERTISER","DRIVER"]},status:input.expectedStatus},
     data:{status:input.status}});
    if(changed.count!==1)
     throw new HttpError(409,"ACCOUNT_VERSION_CONFLICT","Account changed");
    // Invalidate all sessions, including sessions previously created for other devices.
    await tx.session.updateMany({where:{userId:targetId,revokedAt:null},
     data:{revokedAt:new Date()}});
    const decision=await tx.accountStatusDecision.create({data:{
     subjectUserId:targetId,administratorUserId:p.userId,
     previousStatus:input.expectedStatus,newStatus:input.status,reason:input.reason}});
    await tx.auditEvent.create({data:{
     actorUserId:p.userId,action:input.status==="SUSPENDED"?
      "admin.account_suspended":"admin.account_reactivated",
     resourceType:"user",resourceId:targetId,
     metadata:{decisionId:decision.id,previousStatus:input.expectedStatus,
      newStatus:input.status},
    }});
    await tx.outboxEvent.create({data:{
     aggregateType:"user",aggregateId:targetId,
     eventType:input.status==="SUSPENDED"?"user.suspended":"user.reactivated",
     payload:{userId:targetId,decisionId:decision.id}}});
    return decision.id;
  });
  const decision=await db.accountStatusDecision.findUniqueOrThrow({
   where:{id:output.resourceId}});
  res.status(200).set("Cache-Control","private, no-store").json({data:{
   id:decision.id,userId:decision.subjectUserId,
   previousStatus:decision.previousStatus.toLowerCase(),
   status:decision.newStatus.toLowerCase(),createdAt:decision.createdAt.toISOString(),
   replayed:output.replayed,
  }});
 }));
 router.get("/admin/users/:userId/decisions",safe(async(req,res)=>{
  await admin(req);
  const target=getId(req,"userId");
  safeQuery(req,["limit","cursor"]);const {take,cursor}=page(req);
  const rows=await db.accountStatusDecision.findMany({where:{
   subjectUserId:target,...(cursor?{id:{gt:cursor}}:{})},
   select:{id:true,subjectUserId:true,administratorUserId:true,
    previousStatus:true,newStatus:true,reason:true,createdAt:true},
   orderBy:{id:"asc"},take:take+1});
  res.set("Cache-Control","private, no-store").json({
   data:rows.slice(0,take).map(x=>({
    id:x.id,userId:x.subjectUserId,administratorUserId:x.administratorUserId,
    previousStatus:x.previousStatus.toLowerCase(),status:x.newStatus.toLowerCase(),
    reason:x.reason,createdAt:x.createdAt.toISOString()})),
   meta:{limit:take,nextCursor:rows.length>take?rows[take-1]?.id??null:null}});
 }));
 const auditFilters=(req:Request,maxDays=366)=>{
  safeQuery(req,["from","to","limit","cursor","action","resourceType","actorUserId"]);
  const range=reportRange(Object.fromEntries(Object.entries(req.query).filter(([k])=>
   k==="from"||k==="to")),maxDays);
  const action=optionalText(req.query.action,"action"),
   resourceType=optionalText(req.query.resourceType,"resource");
  const actor= req.query.actorUserId;
  if(actor!==undefined&&(typeof actor!=="string"||!id.safeParse(actor).success))
   throw new HttpError(422,"FILTER_INVALID","Invalid actor");
  const where:Prisma.AuditEventWhereInput={
   createdAt:{gte:range.start,lt:range.endExclusive},
   ...(action?{action}:{}),...(resourceType?{resourceType}:{}),
   ...(actor?{actorUserId:actor}:{}),
  };
  return {range,where};
 };
 router.get("/admin/audit-events",safe(async(req,res)=>{
  await admin(req);const {where}=auditFilters(req);
  const {take,cursor}=page(req);
  const rows=await db.auditEvent.findMany({where:{
   ...where,...(cursor?{id:{gt:cursor}}:{})},select:{
    id:true,actorUserId:true,action:true,resourceType:true,
    resourceId:true,createdAt:true},orderBy:{id:"asc"},take:take+1});
  res.set("Cache-Control","private, no-store").json({data:rows.slice(0,take).map(auditView),
   meta:{limit:take,nextCursor:rows.length>take?rows[take-1]?.id??null:null}});
 }));
 router.get("/admin/audit-events/export",safe(async(req,res)=>{
  const p=await admin(req);const {range,where}=auditFilters(req,31);
  const rows=await db.auditEvent.findMany({where,select:{
   id:true,actorUserId:true,action:true,resourceType:true,resourceId:true,
   createdAt:true},orderBy:{id:"asc"},take:1001});
  if(rows.length>1000)
   throw new HttpError(422,"AUDIT_EXPORT_TOO_LARGE","Reduce date filters; export limited to 1000 rows");
  const csv=exportCsv(["id","created_at_utc","actor_user_id","action","resource_type","resource_id"],
   rows.map(x=>[x.id,x.createdAt.toISOString(),x.actorUserId??"",
    x.action,x.resourceType,x.resourceId]));
  await db.auditEvent.create({data:{
   actorUserId:p.userId,action:"admin.audit_exported",resourceType:"audit_log",
   resourceId:range.from+"_"+range.to,
   metadata:{from:range.from,to:range.to,rows:rows.length,format:"csv"},
  }});
  res.set({"Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":'attachment; filename="advibe-audit-export.csv"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}).send(csv);
 }));
 return router;
}
