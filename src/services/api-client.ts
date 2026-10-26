export type LiveRole="advertiser"|"driver"|"admin";
export type LiveSession={userId:string;role:LiveRole;expiresAt:string;csrfToken:string};
export class ApiError extends Error{
 constructor(public status:number,public code:string,message:string){super(message);this.name="ApiError";}
}
type Envelope<T>={data:T;meta?:{nextCursor?:string|null;unreadCount?:number}};
const base="/api/backend/";
export async function api<T=unknown>(path:string,options:{
 method?:"GET"|"POST"|"PATCH"|"DELETE";body?:unknown;csrfToken?:string;
 idempotencyKey?:string;signal?:AbortSignal;
}={}):Promise<T>{
 if(!path.startsWith("/")||path.startsWith("//")||path.includes("..")||/[#\\]/.test(path))
  throw new ApiError(400,"INVALID_PATH","Invalid service path");
 const method=options.method??"GET";
 const headers:Record<string,string>={Accept:"application/json"};
 if(method!=="GET"){
  headers["Content-Type"]="application/json";
  if(options.csrfToken)headers["X-CSRF-Token"]=options.csrfToken;
  if(options.idempotencyKey)headers["Idempotency-Key"]=options.idempotencyKey;
 }
 let response:Response;
 try{
  response=await fetch(base+path.slice(1),{
   method,credentials:"same-origin",cache:"no-store",headers,
   ...(method!=="GET"?{body:JSON.stringify(options.body??{})}:{}),signal:options.signal,
  });
 }catch(e){
  if(options.signal?.aborted)throw e;
  throw new ApiError(503,"NETWORK_UNAVAILABLE","Could not connect to AdVibe. No sample data has been substituted.");
 }
 let payload:unknown=null;
 try{payload=await response.json();}catch{
  throw new ApiError(response.status,"INVALID_RESPONSE","The API returned an unreadable response");
 }
 if(!response.ok){
  const e=(payload as {error?:{code?:string;message?:string}})?.error;
  throw new ApiError(response.status,e?.code??"HTTP_ERROR",
   e?.message??"The operation could not be completed");
 }
 return (payload as Envelope<T>).data;
}
export async function apiPage<T>(path:string,signal?:AbortSignal):Promise<{
 data:T[];meta:{nextCursor?:string|null;unreadCount?:number}}>{
 const response=await fetch(base+path.replace(/^\//,""),{
  credentials:"same-origin",cache:"no-store",signal});
 const payload=await response.json() as Envelope<T[]> & {error?:{code?:string;message?:string}};
 if(!response.ok)throw new ApiError(response.status,payload.error?.code??"HTTP_ERROR",
  payload.error?.message??"Unable to fetch records");
 return {data:payload.data,meta:payload.meta??{}};
}
export function newIdempotencyKey(){return crypto.randomUUID();}
export async function liveSession(signal?:AbortSignal):Promise<LiveSession>{
 const session=await api<LiveSession>("/auth/session",{signal});
 if(!["admin","driver","advertiser"].includes(session.role)||!session.csrfToken)
  throw new ApiError(401,"SESSION_INVALID","Authentication needs renewal");
 return session;
}
export async function downloadApiCsv(path:string,filename:string){
 const r=await fetch(base+path.replace(/^\//,""),{credentials:"same-origin",cache:"no-store"});
 if(!r.ok)throw new ApiError(r.status,"EXPORT_FAILED","Could not export live records");
 if(!(r.headers.get("content-type")??"").includes("text/csv"))
  throw new ApiError(502,"EXPORT_TYPE_INVALID","Invalid export response");
 const url=URL.createObjectURL(await r.blob());
 try{
  const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();
 }finally{window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
