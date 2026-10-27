import {NextResponse} from "next/server";
import {backendOrigin} from "@/services/api-route-policy.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(ready:boolean)=>NextResponse.json({
 service:"advibe-frontend",status:ready?"ready":"not_ready",
 backendDependency:ready?"reachable":"unavailable",
 productionIntegrationsReady:false,
},{status:ready?200:503,headers:{"Cache-Control":"no-store, max-age=0"}});
/** Unlike /api/health this validates the live backend's migrated database readiness. */
export async function GET(){
 if(process.env.NEXT_PUBLIC_DEMO_MODE!=="false")return response(false);
 const origin=backendOrigin(process.env.ADVIBE_BACKEND_ORIGIN,process.env.NODE_ENV==="production");
 if(!origin)return response(false);
 try{
  const upstream=await fetch(origin+"/api/v1/ready",{
   cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(5000),
   headers:{Accept:"application/json"}});
  if(upstream.status!==200)return response(false);
  const data=await upstream.json() as {data?:{message?:string}};
  return response(data?.data?.message==="ready");
 }catch{return response(false);}
}
