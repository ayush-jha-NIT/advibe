import type { ScreenPlacement } from "@prisma/client";
import { Router,type NextFunction,type Request,type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import type { AuthDependencies } from "../auth/routes.js";
import { serializableTransaction } from "../../db/transaction.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { createRuleInput,updateRuleInput,taxPolicyInput,atUtc,dateString,uuid } from "./schemas.js";
import { admin,mutation,viewRule } from "./guard.js";
const route=(h:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void h(req,res).catch(next);};
export function createPricingAdminRouter(config:AppConfig,{db,settings}:AuthDependencies):Router {
 const router=Router();
 router.get("/pricing/rules",route(async(req,res)=>{
  await admin(req,db,settings);
  if(Object.keys(req.query).length)throw new HttpError(422,"VALIDATION_ERROR","Unsupported filter");
  const rules=await db.rateRule.findMany({include:{revisions:{take:1,orderBy:{version:"desc"}}},
   orderBy:[{cityId:"asc"},{placement:"asc"}],take:100});
  res.json({data:rules.map(viewRule)});
 }));
 router.post("/admin/pricing/rules",validateBody(createRuleInput),route(async(req,res)=>{
  const p=await admin(req,db,settings);mutation(req,config,p,settings.secret);
  const input=createRuleInput.parse(req.body);
  const result=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/pricing/rules","POST",input,async tx=>{
    const city=await tx.city.findUnique({where:{id:input.cityId}});
    if(!city||city.state==="ARCHIVED")throw new HttpError(404,"NOT_FOUND","City unavailable");
    const rule=await tx.rateRule.create({data:{
     cityId:city.id,placement:input.placement.toUpperCase() as ScreenPlacement,
     revisions:{create:{version:1,active:input.active,ratePaisePerScreenDay:input.ratePaisePerScreenDay,
      validFrom:atUtc(input.validFrom),validTo:atUtc(input.validTo),createdByUserId:p.userId}},
    }});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"pricing.rule_created",
     resourceType:"rate_rule",resourceId:rule.id}});
    return rule.id;
   });
  const rule=await db.rateRule.findUniqueOrThrow({where:{id:result.resourceId},
   include:{revisions:{take:1,orderBy:{version:"desc"}}}});
  res.status(201).json({data:viewRule(rule)});
 }));
 router.put("/admin/pricing/rules/:ruleId",validateBody(updateRuleInput),route(async(req,res)=>{
  const p=await admin(req,db,settings);mutation(req,config,p,settings.secret);
  const parsed=uuid.safeParse(req.params.ruleId);
  if(!parsed.success)throw new HttpError(404,"NOT_FOUND","Rule not found");
  const input=updateRuleInput.parse(req.body);
  const updated=await serializableTransaction(db,async tx=>{
    const rule=await tx.rateRule.findUnique({where:{id:parsed.data},
     include:{revisions:{orderBy:{version:"desc"},take:1}}});
    if(!rule)throw new HttpError(404,"NOT_FOUND","Rule not found");
    if(rule.revisions[0]?.version!==input.expectedVersion)
     throw new HttpError(409,"STALE_RATE_VERSION","Expected rule version is no longer current");
    await tx.rateRevision.create({data:{ruleId:rule.id,version:input.expectedVersion+1,
     ratePaisePerScreenDay:input.ratePaisePerScreenDay,active:input.active,
     validFrom:atUtc(input.validFrom),validTo:atUtc(input.validTo),createdByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"pricing.rule_revised",
     resourceType:"rate_rule",resourceId:rule.id,metadata:{version:input.expectedVersion+1}}});
    return rule.id;
  });
  const rule=await db.rateRule.findUniqueOrThrow({where:{id:updated},
   include:{revisions:{take:1,orderBy:{version:"desc"}}}});
  res.json({data:viewRule(rule)});
 }));
 router.get("/admin/pricing/tax-policies",route(async(req,res)=>{
  await admin(req,db,settings);
  const list=await db.taxPolicy.findMany({orderBy:{createdAt:"desc"},take:100});
  res.json({data:list.map(x=>({id:x.id,version:x.version,taxBps:x.taxBps,
   active:x.active,validFrom:dateString(x.validFrom),validTo:dateString(x.validTo),
   sourceReference:x.sourceReference}))});
 }));
 router.post("/admin/pricing/tax-policies",validateBody(taxPolicyInput),route(async(req,res)=>{
  const p=await admin(req,db,settings);mutation(req,config,p,settings.secret);
  const input=taxPolicyInput.parse(req.body);
  const made=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/pricing/tax-policies","POST",input,async tx=>{
    if(input.active){
     const overlaps=await tx.taxPolicy.count({where:{active:true,
      validFrom:{lte:atUtc(input.validTo)},validTo:{gte:atUtc(input.validFrom)}}});
     if(overlaps)throw new HttpError(409,"TAX_POLICY_OVERLAP","Active policy period overlaps another");
    }
    const policy=await tx.taxPolicy.create({data:{...input,
     validFrom:atUtc(input.validFrom),validTo:atUtc(input.validTo),createdByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"pricing.tax_policy_published",
     resourceType:"tax_policy",resourceId:policy.id,metadata:{version:policy.version}}});
    return policy.id;
   });
  const x=await db.taxPolicy.findUniqueOrThrow({where:{id:made.resourceId}});
  res.status(201).json({data:{id:x.id,version:x.version,taxBps:x.taxBps,active:x.active,
   validFrom:dateString(x.validFrom),validTo:dateString(x.validTo),sourceReference:x.sourceReference}});
 }));
 return router;
}
