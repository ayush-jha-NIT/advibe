import { Router,type NextFunction,type Request,type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { discountInput,atUtc,dateString } from "./schemas.js";
import { admin,mutation } from "./guard.js";
const safe=(h:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void h(req,res).catch(next);};
export function createDiscountRouter(config:AppConfig,{db,settings}:AuthDependencies):Router{
 const router=Router();
 router.get("/admin/pricing/discounts",safe(async(req,res)=>{
  await admin(req,db,settings);
  const rows=await db.discountPolicy.findMany({take:100,
   orderBy:[{code:"asc"},{version:"desc"}]});
  res.json({data:rows.map(x=>({id:x.id,code:x.code,version:x.version,
   kind:x.kind.toLowerCase(),value:x.value,active:x.active,
   validFrom:dateString(x.validFrom),validTo:dateString(x.validTo)}))});
 }));
 router.post("/admin/pricing/discounts",validateBody(discountInput),safe(async(req,res)=>{
  const p=await admin(req,db,settings);mutation(req,config,p,settings.secret);
  const input=discountInput.parse(req.body);
  const created=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/pricing/discounts","POST",input,async tx=>{
    const latest=await tx.discountPolicy.findFirst({where:{code:input.code},
     orderBy:{version:"desc"}});
    if((latest?.version??0)!==input.expectedVersion)
     throw new HttpError(409,"STALE_DISCOUNT_VERSION","Expected discount version is outdated");
    const row=await tx.discountPolicy.create({data:{
     code:input.code,version:input.expectedVersion+1,kind:input.kind.toUpperCase() as
      "PERCENT_BPS"|"FIXED_PAISE",value:input.value,active:input.active,
     validFrom:atUtc(input.validFrom),validTo:atUtc(input.validTo),createdByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"pricing.discount_revised",
     resourceType:"discount_policy",resourceId:row.id,
     metadata:{code:row.code,version:row.version}}});
    return row.id;
   });
  const row=await db.discountPolicy.findUniqueOrThrow({where:{id:created.resourceId}});
  res.status(201).json({data:{id:row.id,code:row.code,version:row.version,
   kind:row.kind.toLowerCase(),value:row.value,active:row.active,
   validFrom:dateString(row.validFrom),validTo:dateString(row.validTo)}});
 }));
 return router;
}
