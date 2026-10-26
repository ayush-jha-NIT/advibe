import type { Request } from "express";
import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal, requireRole, type AuthPrincipal } from "../auth/policy.js";
import { constantTimeHexMatch,mac } from "../auth/security.js";

export function mutation(req:Request,config:AppConfig,p:AuthPrincipal,secret:string):void {
  const origin=req.get("origin");
  if(origin&&!config.corsOrigins.includes(origin))
    throw new HttpError(403,"ORIGIN_FORBIDDEN","Unapproved origin");
  if(req.get("sec-fetch-site")==="cross-site")
    throw new HttpError(403,"CROSS_SITE_FORBIDDEN","Cross-site mutation rejected");
  if(config.nodeEnv==="production"&&!origin&&
    !["same-origin","same-site"].includes(req.get("sec-fetch-site")||""))
    throw new HttpError(403,"ORIGIN_REQUIRED","Trusted browser origin required");
  if(!constantTimeHexMatch(req.get("x-csrf-token")||"",
      mac({secret} as AuthDependencies["settings"],"csrf",p.tokenHash)))
    throw new HttpError(403,"CSRF_FAILED","Invalid CSRF token");
  if(!req.is("application/json"))
    throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","JSON body required");
}
export async function admin(req:Request,db:PrismaClient,settings:AuthDependencies["settings"]){
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");return p;
}
export async function advertiser(req:Request,db:PrismaClient,settings:AuthDependencies["settings"]){
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");return p;
}
export const viewRule=(v:{id:string;cityId:string;placement:string;createdAt:Date;
 revisions:Array<{id:string;version:number;ratePaisePerScreenDay:number;
 active:boolean;validFrom:Date;validTo:Date}>})=>{
  const cur=v.revisions[0];
  return {id:v.id,cityId:v.cityId,placement:v.placement.toLowerCase(),
    version:cur?.version??0,
    ratePaisePerScreenDay:cur?.ratePaisePerScreenDay??null,
    active:cur?.active??false,validFrom:cur?.validFrom.toISOString().slice(0,10)??null,
    validTo:cur?.validTo.toISOString().slice(0,10)??null};
};
