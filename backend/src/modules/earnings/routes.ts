import { createHash,createHmac,randomUUID,timingSafeEqual } from "node:crypto";
import { Router,type Request,type Response,type NextFunction } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { integerPaise } from "../pricing/money.js";
import { atUtc } from "../pricing/schemas.js";
import { serializableTransaction } from "../../db/transaction.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { financePolicy,configuredPayoutGateway,validTransfer,type PayoutGateway } from "./provider.js";
import { applyVerifiedTransfer } from "./worker.js";

const safe=(fn:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void fn(req,res).catch(next);};
const uuid=z.uuid();
const id=(req:Request,key:string)=>{
 const r=uuid.safeParse(req.params[key]);
 if(!r.success)throw new HttpError(404,"NOT_FOUND","Resource unavailable");
 return r.data;
};
const policyInput=z.strictObject({version:z.string().regex(/^[A-Za-z0-9._-]{3,80}$/),
 paisePerReviewedEvent:z.int().min(1).max(10000000)});
const reviewInput=z.strictObject({sourceProofId:uuid,policyId:uuid,
 evidenceReference:z.string().trim().min(12).max(140).regex(/^[A-Za-z0-9_.:\/-]+$/)});
const settlementInput=z.strictObject({driverUserId:uuid,
 periodStart:z.iso.date(),periodEnd:z.iso.date()});
const beneficiaryInput=z.strictObject({providerToken:z.string().regex(/^[A-Za-z0-9_-]{12,128}$/)});
const payoutInput=z.strictObject({settlementId:uuid,beneficiaryId:uuid});
const webhookInput=z.strictObject({eventId:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
 providerReference:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
 type:z.enum(["PAYOUT_SUCCESS","PAYOUT_FAILED","PAYOUT_PENDING"])});
const number=(v:bigint)=>integerPaise(v);
const beneficiaryView=(v:{id:string;state:string;providerToken:string;verifiedAt:Date|null})=>({
 id:v.id,status:v.state.toLowerCase(),
 tokenSuffix:v.providerToken.slice(-4),verifiedAt:v.verifiedAt?.toISOString()??null,
});
const payoutView=(p:{id:string;settlementId:string;state:string;
 amountPaise:bigint;createdAt:Date;paidAt:Date|null})=>({
 id:p.id,settlementId:p.settlementId,status:p.state.toLowerCase(),
 amountPaise:number(p.amountPaise),createdAt:p.createdAt.toISOString(),
 paidAt:p.paidAt?.toISOString()??null,
});
const settlementView=(s:{id:string;driverUserId:string;state:string;
 periodStart:Date;periodEnd:Date;grossPaise:bigint;createdAt:Date;paidAt:Date|null})=>({
 id:s.id,driverUserId:s.driverUserId,status:s.state.toLowerCase(),
 periodStart:s.periodStart.toISOString().slice(0,10),
 periodEnd:s.periodEnd.toISOString().slice(0,10),
 grossPaise:number(s.grossPaise),createdAt:s.createdAt.toISOString(),
 paidAt:s.paidAt?.toISOString()??null,
});
const client=(p?:PayoutGateway)=>p??configuredPayoutGateway();

export interface EarningsDependencies {gateway?:PayoutGateway;webhookSecret?:string}
export function createEarningsRoutes(config:AppConfig,auth:AuthDependencies,
 deps:EarningsDependencies={}):{api:Router;webhooks:Router}{
 const {db,settings}=auth,api=Router(),webhooks=Router();
 const admin=async(req:Request)=>{
  const principal=await resolvePrincipal(req,db,settings);requireRole(principal,"ADMIN");
  return principal;
 };
 const driver=async(req:Request)=>{
  const principal=await resolvePrincipal(req,db,settings);requireRole(principal,"DRIVER");
  return principal;
 };
 api.post("/admin/earnings/policies",validateBody(policyInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  const version=financePolicy(process.env,config.nodeEnv==="production");
  const input=policyInput.parse(req.body);
  if(input.version!==version)throw new HttpError(409,"EARNING_POLICY_VERSION","Configured policy version mismatch");
  const outcome=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/earnings/policies","POST",input,async tx=>{
    const policy=await tx.earningPolicy.create({data:{
     version:input.version,paisePerReviewedEvent:BigInt(input.paisePerReviewedEvent),
     activatedByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"earnings.policy_created",
     resourceType:"earning_policy",resourceId:policy.id}});
    return policy.id;
   });
  const policy=await db.earningPolicy.findUniqueOrThrow({where:{id:outcome.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:{
   id:policy.id,version:policy.version,paisePerReviewedEvent:number(policy.paisePerReviewedEvent)}});
 }));
 api.post("/admin/earnings/accrue",validateBody(reviewInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  const activeVersion=financePolicy(process.env,config.nodeEnv==="production");
  const input=reviewInput.parse(req.body);
  const outcome=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/earnings/accrue","POST",input,async tx=>{
    const policy=await tx.earningPolicy.findUnique({where:{id:input.policyId}});
    if(!policy||policy.version!==activeVersion)
     throw new HttpError(409,"EARNING_POLICY_INACTIVE","Approved policy required");
    const proof=await tx.playbackProof.findUnique({where:{id:input.sourceProofId},
     include:{trip:{include:{vehicle:true}}}});
    if(!proof||proof.trip.vehicleId!==proof.trip.vehicle.id)
     throw new HttpError(404,"NOT_FOUND","Playback evidence unavailable");
    const window=await tx.deliveryWindow.findFirst({where:{
     screenId:proof.screenId,startsAt:{lte:proof.playedAt},
     endsAt:{gt:proof.playedAt},
     plan:{campaignId:proof.campaignId,state:{in:["ACTIVE","COMPLETED"]},
      order:{state:"PAID",requiresResolution:false}}},
     include:{plan:true}});
    if(!window)throw new HttpError(409,"EARNING_DELIVERY_UNVERIFIED",
     "Confirmed paid delivery and independently reviewed service required");
    if(proof.methodVersion!=="b17-v1"||!proof.credentialId)
     throw new HttpError(409,"EARNING_SOURCE_UNVERIFIED","B17 evidence required");
    // Financial entitlement is an explicit administrative review of driver service,
    // NOT human impression verification and never triggered automatically by telemetry.
    const earning=await tx.driverEarning.create({data:{
     sourceProofId:proof.id,policyId:policy.id,driverUserId:proof.trip.vehicle.driverUserId,
     reviewedByUserId:p.userId,evidenceReference:input.evidenceReference,
     amountPaise:policy.paisePerReviewedEvent}});
    await tx.driverLedgerEntry.create({data:{
     driverUserId:earning.driverUserId,earningId:earning.id,kind:"EARNING",
     amountPaise:earning.amountPaise}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"earnings.reviewed_credit",
     resourceType:"driver_earning",resourceId:earning.id,
     metadata:{sourceProofId:proof.id,policyVersion:policy.version,
      evidenceReference:input.evidenceReference}}});
    return earning.id;
   });
  const earning=await db.driverEarning.findUniqueOrThrow({where:{id:outcome.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:{
   id:earning.id,sourceProofId:earning.sourceProofId,amountPaise:number(earning.amountPaise),
   driverUserId:earning.driverUserId,settlementId:earning.settlementId}});
 }));
 api.get("/drivers/me/earnings",safe(async(req,res)=>{
  const p=await driver(req);
  const rows=await db.driverEarning.findMany({where:{driverUserId:p.userId},
   orderBy:[{createdAt:"desc"},{id:"desc"}],take:100});
  const total=await db.driverLedgerEntry.findMany({where:{driverUserId:p.userId},
   select:{amountPaise:true,kind:true}});
  const earned=total.filter(v=>v.kind==="EARNING").reduce((n,v)=>n+v.amountPaise,0n);
  const paid=total.filter(v=>v.kind==="PAYOUT").reduce((n,v)=>n+v.amountPaise,0n);
  const reserved=await db.driverSettlement.findMany({where:{driverUserId:p.userId,
   state:{in:["READY","PAYOUT_PENDING","NEEDS_REVIEW"]}},
   select:{grossPaise:true}});
  const locked=reserved.reduce((n,v)=>n+v.grossPaise,0n);
  res.set("Cache-Control","no-store").json({data:{
   currency:"INR",earnedPaise:number(earned),paidPaise:number(paid),
   reservedPaise:number(locked),availablePaise:number(earned-paid-locked),
   entries:rows.map(e=>({id:e.id,amountPaise:number(e.amountPaise),
    settlementId:e.settlementId,createdAt:e.createdAt.toISOString()})),
  }});
 }));
 api.post("/admin/settlements",validateBody(settlementInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  financePolicy(process.env,config.nodeEnv==="production");
  const input=settlementInput.parse(req.body);
  const first=atUtc(input.periodStart),last=atUtc(input.periodEnd);
  if(last<first||last.getTime()-first.getTime()>31*86400000||last>=new Date())
   throw new HttpError(422,"SETTLEMENT_PERIOD_INVALID","Closed period up to 32 days required");
  const done=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/settlements","POST",input,async tx=>{
    const owner=await tx.user.findUnique({where:{id:input.driverUserId}});
    if(!owner||owner.role!=="DRIVER"||owner.status!=="ACTIVE")
     throw new HttpError(404,"NOT_FOUND","Driver unavailable");
    const until=new Date(last.getTime()+86400000);
    const earnings=await tx.driverEarning.findMany({where:{
     driverUserId:owner.id,settlementId:null,
     createdAt:{gte:first,lt:until}},select:{id:true,amountPaise:true}});
    const gross=earnings.reduce((n,e)=>n+e.amountPaise,0n);
    if(!earnings.length||gross<=0n||gross>BigInt(Number.MAX_SAFE_INTEGER))
     throw new HttpError(409,"SETTLEMENT_NOT_READY","No eligible reviewed earnings");
    const settlement=await tx.driverSettlement.create({data:{
     driverUserId:owner.id,periodStart:first,periodEnd:last,grossPaise:gross}});
    const moved=await tx.driverEarning.updateMany({where:{
     id:{in:earnings.map(e=>e.id)},settlementId:null},data:{settlementId:settlement.id}});
    if(moved.count!==earnings.length)throw new HttpError(409,"SETTLEMENT_RACE","Earnings changed");
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"settlement.frozen",resourceType:"driver_settlement",resourceId:settlement.id}});
    return settlement.id;
   });
  const settlement=await db.driverSettlement.findUniqueOrThrow({where:{id:done.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:settlementView(settlement)});
 }));
 api.get("/drivers/me/settlements",safe(async(req,res)=>{
  const p=await driver(req);
  const rows=await db.driverSettlement.findMany({where:{driverUserId:p.userId},
   orderBy:[{createdAt:"desc"},{id:"desc"}],take:100});
  res.set("Cache-Control","no-store").json({data:rows.map(settlementView)});
 }));
 api.post("/drivers/me/beneficiaries",validateBody(beneficiaryInput),safe(async(req,res)=>{
  const p=await driver(req);mutation(req,config,p,settings.secret);
  financePolicy(process.env,config.nodeEnv==="production");
  const input=beneficiaryInput.parse(req.body);
  const gateway=client(deps.gateway);
  const verified=await gateway.verifyBeneficiary(input.providerToken,p.userId);
  if(!verified.verified||verified.provider!=="cashfree"||
   verified.token!==input.providerToken||verified.driverUserId!==p.userId)
   throw new HttpError(409,"BENEFICIARY_NOT_VERIFIED","Provider verification required");
  const beneficiary=await db.payoutBeneficiary.upsert({where:{
   driverUserId_provider_providerToken:{driverUserId:p.userId,
    provider:"cashfree",providerToken:input.providerToken}},
   create:{driverUserId:p.userId,provider:"cashfree",
    providerToken:input.providerToken,state:"VERIFIED",verifiedAt:new Date()},
   update:{state:"VERIFIED",verifiedAt:new Date()}});
  res.status(201).set("Cache-Control","no-store").json({data:beneficiaryView(beneficiary)});
 }));
 api.get("/drivers/me/beneficiaries",safe(async(req,res)=>{
  const p=await driver(req);
  const rows=await db.payoutBeneficiary.findMany({where:{driverUserId:p.userId},
   orderBy:{createdAt:"desc"},take:20});
  res.set("Cache-Control","no-store").json({data:rows.map(beneficiaryView)});
 }));
 api.post("/admin/payouts",validateBody(payoutInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  financePolicy(process.env,config.nodeEnv==="production");
  client(deps.gateway); // Fail closed if no provider integration.
  const input=payoutInput.parse(req.body);
  const result=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/payouts","POST",input,async tx=>{
    const settlement=await tx.driverSettlement.findUnique({where:{id:input.settlementId}});
    if(!settlement||settlement.state!=="READY")
     throw new HttpError(409,"SETTLEMENT_NOT_READY","Frozen settlement required");
    const beneficiary=await tx.payoutBeneficiary.findUnique({where:{id:input.beneficiaryId}});
    if(!beneficiary||beneficiary.driverUserId!==settlement.driverUserId||
      beneficiary.state!=="VERIFIED"||!beneficiary.verifiedAt)
     throw new HttpError(409,"BENEFICIARY_NOT_VERIFIED","Same-driver beneficiary required");
    const payout=await tx.driverPayout.create({data:{
     settlementId:settlement.id,beneficiaryId:beneficiary.id,
     amountPaise:settlement.grossPaise,
     providerReference:"adv_b18_"+randomUUID().replaceAll("-",""),state:"QUEUED"}});
    await tx.driverSettlement.update({where:{id:settlement.id},
     data:{state:"PAYOUT_PENDING"}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"payout.queued",resourceType:"driver_payout",resourceId:payout.id}});
    await tx.outboxEvent.create({data:{aggregateType:"driver_payout",aggregateId:payout.id,
     eventType:"payout.queued",payload:{payoutId:payout.id}}});
    return payout.id;
   });
  const payout=await db.driverPayout.findUniqueOrThrow({where:{id:result.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:payoutView(payout)});
 }));
 api.get("/admin/payouts/:payoutId",safe(async(req,res)=>{
  await admin(req);const payout=await db.driverPayout.findUnique({
   where:{id:id(req,"payoutId")}});
  if(!payout)throw new HttpError(404,"NOT_FOUND","Payout unavailable");
  res.set("Cache-Control","no-store").json({data:payoutView(payout)});
 }));
 webhooks.post("/",safe(async(req,res)=>{
  if(!Buffer.isBuffer(req.body)||!req.is("application/json"))
   throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","Raw payout JSON required");
  const secret=deps.webhookSecret;
  if(!secret||secret.length<16||config.nodeEnv==="production"&&
    process.env.B18_WEBHOOK_COMPAT_VERIFIED!=="true")
   throw new HttpError(503,"PAYOUT_WEBHOOK_UNAVAILABLE","Verified payout webhook adapter unavailable");
  const stamp=req.get("x-webhook-timestamp")??"";
  const signature=req.get("x-webhook-signature")??"";
  if(!/^\d{10}$/.test(stamp)||Math.abs(Date.now()-Number(stamp)*1000)>300000)
   throw new HttpError(401,"PAYOUT_WEBHOOK_INVALID","Webhook timestamp invalid");
  const mac=createHmac("sha256",secret).update(stamp).update(req.body).digest("base64");
  const a=Buffer.from(mac),b=Buffer.from(signature);
  if(a.length!==b.length||!timingSafeEqual(a,b))
   throw new HttpError(401,"PAYOUT_WEBHOOK_INVALID","Webhook signature invalid");
  let payload:unknown;
  try{payload=JSON.parse(req.body.toString("utf8"));}catch{
   throw new HttpError(400,"PAYOUT_WEBHOOK_INVALID","Invalid JSON");}
  const event=webhookInput.parse(payload);
  const payout=await db.driverPayout.findUnique({where:{
   providerReference:event.providerReference}});
  if(!payout){res.json({data:{received:true,processed:false}});return;}
  const remote=validTransfer(await client(deps.gateway).getTransfer(payout.providerReference),
   payout.providerReference,payout.amountPaise);
  if(event.type==="PAYOUT_SUCCESS"&&remote.state!=="SUCCESS"||
     event.type==="PAYOUT_FAILED"&&remote.state!=="FAILED")
   throw new HttpError(503,"PAYOUT_NOT_CONFIRMED","Provider evidence differs from webhook");
  const hash=createHash("sha256").update(event.eventId).update(req.body).digest("hex");
  const processed=await applyVerifiedTransfer(db,payout.id,remote,{
   hash,type:event.type});
  res.set("Cache-Control","no-store").json({data:{received:true,processed}});
 }));
 return {api,webhooks};
}
