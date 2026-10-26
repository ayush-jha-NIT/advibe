import { Prisma,type PriceQuote } from "@prisma/client";
import { Router,type NextFunction,type Request,type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { requireBusinessMembership } from "../auth/policy.js";
import type { AuthDependencies } from "../auth/routes.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { advertiser,mutation } from "./guard.js";
import { quoteInput,atUtc,dateString,uuid } from "./schemas.js";
import { computeMoney,integerPaise,selectedDays } from "./money.js";

const safe=(h:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void h(req,res).catch(next);};
const MAX_FUTURE_DAYS=180;
function quoteResponse(q:PriceQuote){
 return {id:q.id,businessId:q.businessId,campaignId:q.campaignId,currency:q.currency.trim(),
  version:q.version,startDate:dateString(q.startDate),endDate:dateString(q.endDate),
  weekdays:q.selectedWeekdays,screenIds:q.screenIds,
  subtotalPaise:integerPaise(q.subtotalPaise),discountPaise:integerPaise(q.discountPaise),
  taxablePaise:integerPaise(q.taxablePaise),taxPaise:integerPaise(q.taxPaise),
  totalPaise:integerPaise(q.totalPaise),taxPolicyVersion:q.taxPolicyVersion,
  discountCode:q.discountCode,discountVersion:q.discountVersion,
  pricingSnapshot:q.pricingSnapshot,createdAt:q.createdAt.toISOString(),
  expiresAt:q.expiresAt.toISOString(),reservationStatus:"NOT_BOOKED"};
}
export function createQuoteRouter(config:AppConfig,{db,settings}:AuthDependencies):Router{
 const router=Router();
 router.post("/pricing/quotes",validateBody(quoteInput),safe(async(req,res)=>{
  const p=await advertiser(req,db,settings);mutation(req,config,p,settings.secret);
  // Live tax treatment must be independently signed off; a sample demo rate is NOT lawful approval.
  if(config.nodeEnv==="production"&&process.env.PRICING_TAX_POLICY_APPROVED!=="true")
   throw new HttpError(503,"TAX_POLICY_NOT_APPROVED","Live tax pricing is not approved");
  const input=quoteInput.parse(req.body);
  await requireBusinessMembership(db,p,input.businessId,["OWNER","MANAGER"]);
  const today=new Date().toISOString().slice(0,10);
  const future=(atUtc(input.startDate).getTime()-atUtc(today).getTime())/86400000;
  if(future<0||future>MAX_FUTURE_DAYS)
   throw new HttpError(422,"CAMPAIGN_DATE_RANGE","Start date must be within 180 days");
  const days=selectedDays(input.startDate,input.endDate,input.weekdays);
  const started=atUtc(input.startDate),ended=atUtc(input.endDate),issued=atUtc(today);
  const result=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/pricing/quotes","POST",input,async tx=>{
    // Recheck business role inside the same serializable transaction as the quote.
    const membership=await tx.businessMembership.findUnique({where:{
     businessId_userId:{businessId:input.businessId,userId:p.userId}},
     include:{business:true}});
    if(!membership||membership.revokedAt||!["OWNER","MANAGER"].includes(membership.role)||
       membership.business.archivedAt)
     throw new HttpError(404,"NOT_FOUND","Active business unavailable");
    const taxes=await tx.taxPolicy.findMany({where:{active:true,
     validFrom:{lte:issued},validTo:{gte:issued}},take:2,
     orderBy:{createdAt:"desc"}});
    if(taxes.length!==1)throw new HttpError(409,"TAX_POLICY_UNAVAILABLE",
     "One approved effective tax policy must be configured");
    const tax=taxes[0]!;
    const discount=input.discountCode?await tx.discountPolicy.findFirst({
     where:{code:input.discountCode},orderBy:{version:"desc"}}):null;
    if(input.discountCode&&(!discount||!discount.active||
       discount.validFrom>issued||discount.validTo<issued))
     throw new HttpError(422,"DISCOUNT_INVALID","Discount not active for quotation");
    const screens=await tx.screen.findMany({where:{id:{in:input.screenIds}},
     include:{vehicle:true,location:{include:{zone:{include:{city:true}}}}}});
    if(screens.length!==input.screenIds.length)
     throw new HttpError(422,"SCREEN_UNAVAILABLE","All screens must exist");
    const byId=new Map(screens.map(s=>[s.id,s]));
    const rules=new Map<string,{version:number;ruleId:string;rate:number}>();
    const lines:Array<{screenId:string;cityId:string;placement:string;
      rateRuleId:string;rateVersion:number;ratePaisePerScreenDay:number;
      selectedDays:number;subtotalPaise:number}>=[];
    for(const screenId of input.screenIds){
     const screen=byId.get(screenId)!;
     const site=screen.location;
     if(screen.state!=="PAIRED"||!site||site.state!=="PUBLISHED"||
        site.zone.state!=="PUBLISHED"||site.zone.city.state!=="PUBLISHED")
      throw new HttpError(422,"SCREEN_UNAVAILABLE","Screen not mapped to a published location");
     const authorized=await tx.driverApplication.count({where:{
      vehicleId:screen.vehicleId,driverUserId:screen.vehicle.driverUserId,state:"APPROVED"}});
     if(!authorized)throw new HttpError(422,"SCREEN_UNAVAILABLE","Driver application not approved");
     const key=site.zone.cityId+":"+screen.placement;
     let price=rules.get(key);
     if(!price){
      const rule=await tx.rateRule.findUnique({where:{
       cityId_placement:{cityId:site.zone.cityId,placement:screen.placement}},
       include:{revisions:{take:1,orderBy:{version:"desc"}}}});
      const current=rule?.revisions[0];
      if(!rule||!current||!current.active||
         current.validFrom>started||current.validTo<ended)
       throw new HttpError(409,"RATE_NOT_CONFIGURED","Active rate must cover full campaign period");
      price={version:current.version,ruleId:rule.id,rate:current.ratePaisePerScreenDay};
      rules.set(key,price);
     }
     lines.push({screenId,cityId:site.zone.cityId,placement:screen.placement.toLowerCase(),
      rateRuleId:price.ruleId,rateVersion:price.version,
      ratePaisePerScreenDay:price.rate,selectedDays:days,
      subtotalPaise:integerPaise(BigInt(price.rate)*BigInt(days))});
    }
    const totals=computeMoney(lines.map(l=>l.ratePaisePerScreenDay),days,
     tax.taxBps,discount?{kind:discount.kind,value:discount.value}:undefined);
    const snapshot:Prisma.InputJsonValue={model:"exclusive-whole-screen-day-estimate-v1",
     bookable:false,startDate:input.startDate,endDate:input.endDate,weekdays:input.weekdays,
     selectedDays:days,lines,tax:{version:tax.version,basisPoints:tax.taxBps,
      taxablePaise:integerPaise(totals.taxablePaise)},
     discount:discount?{code:discount.code,version:discount.version,kind:discount.kind,
      value:discount.value}:null};
    const quote=await tx.priceQuote.create({data:{
     businessId:input.businessId,requestedByUserId:p.userId,campaignId:input.campaignId,
     startDate:started,endDate:ended,selectedWeekdays:input.weekdays,
     screenIds:input.screenIds,subtotalPaise:totals.subtotalPaise,
     discountPaise:totals.discountPaise,taxablePaise:totals.taxablePaise,
     taxPaise:totals.taxPaise,totalPaise:totals.totalPaise,
     taxPolicyVersion:tax.version,discountCode:discount?.code??null,
     discountVersion:discount?.version??null,pricingSnapshot:snapshot,
     expiresAt:new Date(Date.now()+15*60*1000)}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"pricing.quote_created",
     resourceType:"price_quote",resourceId:quote.id,metadata:{currency:"INR",
      taxPolicyVersion:tax.version,screenCount:input.screenIds.length}}});
    return quote.id;
   });
  const quote=await db.priceQuote.findUniqueOrThrow({where:{id:result.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:quoteResponse(quote)});
 }));
 router.get("/pricing/quotes/:quoteId",safe(async(req,res)=>{
  const p=await advertiser(req,db,settings);
  const parsed=uuid.safeParse(req.params.quoteId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Quote unavailable");
  const q=await db.priceQuote.findUnique({where:{id:parsed.data}});
  if(!q)throw new HttpError(404,"NOT_FOUND","Quote unavailable");
  await requireBusinessMembership(db,p,q.businessId);
  res.set("Cache-Control","no-store").json({data:quoteResponse(q)});
 }));
 router.get("/pricing/quotes",safe(async(req,res)=>{
  const p=await advertiser(req,db,settings);
  const b=req.query.businessId;
  if(typeof b!=="string"||!uuid.safeParse(b).success||
     Object.keys(req.query).some(x=>x!=="businessId"))
   throw new HttpError(422,"VALIDATION_ERROR","Business ID required");
  await requireBusinessMembership(db,p,b);
  const list=await db.priceQuote.findMany({where:{businessId:b},
   orderBy:[{createdAt:"desc"},{id:"desc"}],take:50});
  res.set("Cache-Control","no-store").json({data:list.map(quoteResponse)});
 }));
 return router;
}
