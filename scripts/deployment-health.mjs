/**
 * Read-only post-deployment verification. Supply your own HTTPS URL.
 * Usage: node scripts/deployment-health.mjs https://your-deployment.vercel.app
 */
const value=process.argv[2]??process.env.ADVIBE_DEPLOY_URL??"";
let base;
try{base=new URL(value);}catch{console.error("Pass a valid HTTPS deployment URL.");process.exit(2);}
if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash||base.pathname!=="/"){
 console.error("Provide an HTTPS origin URL with no credentials, path or query.");
 process.exit(2);
}
const routes=["/","/for-advertisers","/for-drivers","/pricing","/contact","/login","/api/health"];
let failed=0;
for(const route of routes){
 try{
  const response=await fetch(new URL(route,base),{redirect:"manual",signal:AbortSignal.timeout(15000),headers:{"User-Agent":"AdVibe-release-health/1.0"}});
  const ok=response.status===200;
  let mode="";
  if(route==="/api/health"&&ok){
   const data=await response.json();
   mode=data.mode==="demo"?"demo":String(data.mode??"unknown");
   if(data.service!=="advibe-frontend"||data.status!=="ok"||data.productionIntegrationsReady!==false)throw Error("Unexpected health payload.");
  }
  console.log(ok?"PASS":"FAIL",route,response.status,mode);
  if(!ok)failed++;
 }catch(e){console.error("FAIL",route,String(e));failed++;}
}
if(failed){console.error("Deployment health checks failed:",failed);process.exit(1);}
console.log("PASS: HTTP routes respond. Browser interactivity, production services, and auth security are not verified by this command.");
