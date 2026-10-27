/**
 * Read-only release probe. It never sends cookies, webhooks, payments or personal data.
 * Usage:
 *   B23_FRONTEND_ORIGIN=https://stage.example.com B23_BACKEND_ORIGIN=https://api-stage.example.com
 *   node scripts/b23-staging-probe.mjs
 */
import {strict as assert} from "node:assert";
const origin=(raw)=>{
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||
    u.search||u.hash||u.origin!==raw)return null;
  return u.origin;
 }catch{return null;}
};
const frontend=origin(process.env.B23_FRONTEND_ORIGIN);
const backend=origin(process.env.B23_BACKEND_ORIGIN);
if(!frontend||!backend||frontend===backend){
 console.error("B23 probe requires separate configured HTTPS frontend and backend origins");
 process.exit(2);
}
async function check(base,path,expectStatus,validate){
 const res=await fetch(base+path,{
  redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(8000),
  headers:{Accept:"application/json","User-Agent":"AdVibe-B23-ReadOnly-Probe/1.0"}});
 assert.equal(res.status,expectStatus,path+" unexpected HTTP status");
 if(res.headers.get("access-control-allow-origin")==="*")
  throw Error("Wildcard CORS exposed on "+path);
 const body=await res.json();
 validate(body);
 console.log("PASS",path,expectStatus);
}
try{
 await check(frontend,"/api/health",200,v=>{
  assert.equal(v.service,"advibe-frontend");
  assert.equal(v.status,"ok");
  assert.equal(v.mode,"api","staging must not be running demo mode");
  assert.equal(v.productionIntegrationsReady,false);
 });
 await check(frontend,"/api/ready",200,v=>{
  assert.equal(v.status,"ready");
  assert.equal(v.backendDependency,"reachable");
 });
 await check(backend,"/api/v1/health",200,v=>assert.equal(v.data?.message,"ok"));
 await check(backend,"/api/v1/ready",200,v=>assert.equal(v.data?.message,"ready"));
 await check(backend,"/api/v1/auth/session",401,v=>{
  if(!v.error?.code)throw Error("Expected unauthenticated session error");
 });
 console.log("PASS: Staging liveness, DB readiness, API mode and denied anonymous auth. This does NOT prove external providers or launch approval.");
}catch(e){
 console.error("B23 staging read-only probe failed:",e instanceof Error?e.message:"Unknown error");
 process.exitCode=1;
}
