import {NextRequest,NextResponse} from "next/server";
import {allowedApiPath,backendOrigin} from "@/services/api-route-policy.mjs";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const NO_STORE="no-store, max-age=0";
type Params={params:Promise<{path:string[]}>};
async function proxy(req:NextRequest,{params}:Params){
 if(process.env.NEXT_PUBLIC_DEMO_MODE!=="false")
  return NextResponse.json({error:{code:"DEMO_MODE",message:"API bridge disabled in demo mode"}},{status:404,headers:{"Cache-Control":NO_STORE}});
 const base=backendOrigin(process.env.ADVIBE_BACKEND_ORIGIN,
  process.env.NODE_ENV==="production");
 if(!base)return NextResponse.json({error:{code:"BACKEND_NOT_CONFIGURED",
  message:"Live backend has not been configured"}},{status:503,headers:{"Cache-Control":NO_STORE}});
 const path=(await params).path,method=req.method;
 if(!allowedApiPath(path,method)||req.nextUrl.search.length>2048)
  return NextResponse.json({error:{code:"PATH_FORBIDDEN",message:"API route unavailable"}},{status:404});
 if(method!=="GET"){
  const origin=req.headers.get("origin");
  const site=req.headers.get("sec-fetch-site");
  if(site==="cross-site"||origin!==req.nextUrl.origin)
   return NextResponse.json({error:{code:"ORIGIN_REQUIRED",
    message:"Same-origin request required"}},{status:403,headers:{"Cache-Control":NO_STORE}});
  if(req.headers.get("content-type")?.split(";")[0]?.trim()!=="application/json")
   return NextResponse.json({error:{code:"JSON_REQUIRED",message:"JSON required"}},{status:415});
 }
 const source=req.headers.get("content-length");
 if(method!=="GET"&&(!source?false:Number(source)>65536))
  return NextResponse.json({error:{code:"BODY_TOO_LARGE"}},{status:413});
 let body:string|undefined;
 if(method!=="GET"){
  body=await req.text();
  if(Buffer.byteLength(body)>65536)
   return NextResponse.json({error:{code:"BODY_TOO_LARGE"}},{status:413});
  try{JSON.parse(body);}catch{return NextResponse.json({error:{code:"INVALID_JSON"}},{status:400});}
 }
 const headers=new Headers({Accept:"application/json"});
 if(method!=="GET"){
  headers.set("Content-Type","application/json");
  headers.set("Origin",req.nextUrl.origin);
  if(req.headers.has("x-csrf-token"))headers.set("X-CSRF-Token",req.headers.get("x-csrf-token")!);
  if(req.headers.has("idempotency-key"))headers.set("Idempotency-Key",req.headers.get("idempotency-key")!);
 }
 if(req.headers.has("cookie"))headers.set("Cookie",req.headers.get("cookie")!);
 try{
  const upstream=await fetch(base+"/api/v1/"+path.join("/")+req.nextUrl.search,{
   method,headers,body,cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(12000),
  });
  if(upstream.status>=300&&upstream.status<400)
   return NextResponse.json({error:{code:"UPSTREAM_REDIRECT_DENIED"}},{status:502});
  const type=upstream.headers.get("content-type")??"";
  if(!type.includes("application/json")&&!type.includes("text/csv"))
   return NextResponse.json({error:{code:"UPSTREAM_CONTENT_INVALID"}},{status:502});
  const bytes=await upstream.arrayBuffer();
  if(bytes.byteLength>2_000_000)
   return NextResponse.json({error:{code:"UPSTREAM_RESPONSE_TOO_LARGE"}},{status:502});
  const response=new NextResponse(bytes,{status:upstream.status,headers:{
   "Content-Type":type,"Cache-Control":NO_STORE,"X-Content-Type-Options":"nosniff",
   ...(upstream.headers.get("content-disposition")?
     {"Content-Disposition":upstream.headers.get("content-disposition")!}:{})}});
  for(const cookie of upstream.headers.getSetCookie())response.headers.append("Set-Cookie",cookie);
  return response;
 }catch{
  return NextResponse.json({error:{code:"BACKEND_UNAVAILABLE",
   message:"The live service is unavailable; no demo data has been substituted"}},{
    status:503,headers:{"Cache-Control":NO_STORE}});
 }
}
export const GET=proxy;
export const POST=proxy;
export const PATCH=proxy;
export const PUT=proxy;
export const DELETE=proxy;
