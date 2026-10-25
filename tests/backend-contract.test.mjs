import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const spec=JSON.parse(read("contracts/openapi.v1.json"));
const operations=Object.entries(spec.paths).flatMap(([path,methods])=>Object.entries(methods).map(([method,operation])=>({path,method,operation})));
const paramName=(parameter)=>{
 if(parameter.$ref)return parameter.$ref.split("/").at(-1);
 return parameter.name;
};
function getPointer(reference){
 assert.match(reference,/^#\//,"Local reference required");
 const segments=reference.slice(2).split("/").map(s=>s.replaceAll("~1","/").replaceAll("~0","~"));
 let v=spec;
 for(const segment of segments){assert.ok(v!==null&&typeof v==="object"&&Object.hasOwn(v,segment),"Unresolved OpenAPI reference "+reference);v=v[segment];}
 return v;
}
function walk(node,visitor){
 if(!node||typeof node!=="object")return;
 if(Array.isArray(node)){for(const part of node)walk(part,visitor);return;}
 visitor(node);
 for(const value of Object.values(node))walk(value,visitor);
}

test("B0 is a versioned, non-deployed design contract with useful coverage",()=>{
 assert.equal(spec.openapi,"3.1.2");
 assert.match(spec.info.version,/b0/);
 assert.match(spec.info.description,/NOT deployed|NOT deployed or implemented/i);
 assert.match(spec.servers[0].url,/\.invalid\/api\/v1$/);
 assert.ok(operations.length>=75,"Expected complete cross-portal operation inventory");
 assert.ok(Object.keys(spec.components.schemas).length>=50);
 assert.deepEqual([...new Set(operations.map(x=>x.operation.operationId))].length,operations.length,"Duplicate operationId");
});
test("every local JSON schema/parameter/response reference resolves",()=>{
 let found=0;
 walk(spec,node=>{if(typeof node.$ref==="string"){getPointer(node.$ref);found++;}});
 assert.ok(found>400,"Expected meaningful reusable model references");
});
test("all endpoints declare phase, roles, safe errors and coherent transport security",()=>{
 const tags=new Set(spec.tags.map(x=>x.name));
 const methods=new Set(["get","post","patch","put","delete"]);
 const seen=new Set();
 for(const {path,method,operation:op} of operations){
  assert.ok(methods.has(method),method+" "+path);
  assert.match(path,/^\//);
  assert.ok(tags.has(op.tags?.[0]),"Undeclared tag "+path);
  assert.match(op.operationId,/^[A-Za-z][A-Za-z0-9]+$/);
  assert.ok(!seen.has(op.operationId),"Duplicate ID "+op.operationId);
  seen.add(op.operationId);
  assert.match(op["x-backend-phase"],/^B(?:[1-9]|1\d|2[01])$/,"Unknown backend phase "+op.operationId);
  assert.ok(Array.isArray(op["x-access-roles"])&&op["x-access-roles"].length,"Missing access roles "+op.operationId);
  assert.ok(op.responses?.["400"]&&op.responses?.["401"]&&op.responses?.["403"]&&op.responses?.["409"]&&op.responses?.["429"],"Missing standard HTTP error contracts "+op.operationId);
  assert.ok(op.responses?.["200"]||op.responses?.["201"],"No success response "+op.operationId);
  const names=(op.parameters??[]).map(paramName);
  for(const p of path.match(/\{([^}]+)\}/g)??[])assert.ok(names.includes(p.slice(1,-1)),"Missing parameter "+p+" in "+op.operationId);
  const trust=op["x-trust-boundary"];
  assert.ok(["session","public","device","webhook"].includes(trust),"Missing trust boundary "+op.operationId);
  const sig=JSON.stringify(op.security);
  if(trust==="session"){
   assert.match(sig,/sessionCookie/,"Missing authenticated session "+op.operationId);
   if(!["get","head"].includes(method)){
    assert.equal(op["x-csrf-required"],true,"CSRF required "+op.operationId);
    assert.ok(names.includes("CsrfToken"),"CSRF header required "+op.operationId);
   }
  }else if(trust==="device"){
   assert.match(sig,/deviceBearer/);
   assert.doesNotMatch(sig,/sessionCookie/);
  }else {
   assert.deepEqual(op.security,[],"Public/provider requests must not rely on browser session");
  }
  if(trust==="webhook")assert.equal(op["x-signature-verification-required"],true,"Webhook must require provider signature");
  if(op["x-idempotency-required"])assert.ok(names.includes("IdempotencyKey"),"Missing Idempotency-Key "+op.operationId);
 }
});
test("payments, bookings and KYC stay behind authoritative input boundaries",()=>{
 const get=(path,method="post")=>spec.paths[path]?.[method];
 const requiredIdempotent=[
  ["/reservations/holds","post"],["/reservations/holds/{holdId}/confirm","post"],
  ["/payments/orders","post"],["/admin/payouts","post"],["/admin/refunds","post"],["/admin/bookings/confirm","post"],
  ["/admin/driver-applications/{applicationId}/decision","post"],["/admin/creatives/{creativeId}/decision","post"]
 ];
 for(const [path,method] of requiredIdempotent)assert.equal(get(path,method)["x-idempotency-required"],true,path);
 const req=(path)=>get(path)?.requestBody?.content?.["application/json"]?.schema?.$ref;
 assert.equal(req("/payments/orders"),"#/components/schemas/PaymentOrderInput");
 assert.deepEqual(spec.components.schemas.PaymentOrderInput.required,["campaignId","quoteId","reservationHoldId"]);
 assert.ok(!Object.hasOwn(spec.components.schemas.PaymentOrderInput.properties,"amountPaise"),"Client must not set charge amount");
 assert.equal(req("/admin/refunds"),"#/components/schemas/RefundInput");
 assert.deepEqual(spec.paths["/admin/bookings/confirm"].post["x-access-roles"],["admin"]);
 assert.equal(req("/admin/bookings/confirm"),"#/components/schemas/AdminBookingConfirmationInput");
 assert.equal(req("/devices/trip-events"),"#/components/schemas/GpsBatchInput");
 assert.equal(req("/drivers/documents/upload-intents"),"#/components/schemas/KycDocumentIntentInput");
 assert.equal(get("/webhooks/cashfree/payments")["x-trust-boundary"],"webhook");
 assert.equal(get("/webhooks/cashfree/payouts")["x-trust-boundary"],"webhook");
 const values=["Quote","PaymentOrder","Settlement","RateRule"];
 for(const key of values){
  const props=spec.components.schemas[key].properties;
  for(const [field,s] of Object.entries(props))if(/Paise|paise/.test(field))assert.equal(s.type,"integer",key+"."+field+" must be integer");
 }
});
test("existing portal navigation is completely covered by frontend-to-API migration matrix",()=>{
 const nav=read("src/config/navigation.ts");
 const map=read("docs/backend/B0_API_MAPPING.md");
 const frontendRoutes=[...new Set([...nav.matchAll(/href:"(\/(?:admin|advertiser|driver)(?:\/[^"]*)?)"/g)].map(x=>x[1]))];
 assert.ok(frontendRoutes.length>=40);
 for(const path of frontendRoutes)assert.ok(map.includes("| "+path+" |"),"Missing frontend route mapping: "+path);
 for(const path of ["/login","/signup","/verify","/forgot-password","/reset-password","/contact","/pricing"])
  assert.ok(map.includes("| "+path+" |"),"Missing public/auth mapping: "+path);
});
test("B0/B1 documentation preserves production safety gates",()=>{
 const docs=["B0_ARCHITECTURE.md","B0_DATABASE.md","B0_API_MAPPING.md","B0_DECISIONS.md","BACKEND_ROADMAP.md","B0_CONTRACT_RULES.md"];
 for(const filename of docs){
  const content=read("docs/backend/"+filename);
  assert.ok(content.length>1000,filename+" is unexpectedly incomplete");
 }
 const blueprint=read("docs/backend/B0_DATABASE.md");
 for(const topic of ["idempotency","exclusion","private","webhook","retention","settlement"])
  assert.match(blueprint,new RegExp(topic,"i"),"Missing DB risk topic "+topic);
 const runtime=read("backend/README.md");
 assert.match(runtime,/B1 implements an isolated Node 22/,"B1 runtime must be documented");
 assert.match(runtime,/no database, authentication, payments, KYC/i,"B1 must disclose missing integrations");
 assert.equal(spec.paths["/health"].get["x-implementation-status"],"implemented-b1");
 assert.equal(spec.paths["/ready"].get["x-implementation-status"],"implemented-b2");
 assert.equal(spec.paths["/ready"].get.responses["503"].content["application/json"].schema.$ref,"#/components/schemas/ErrorEnvelope");

 const roadmap=read("docs/backend/BACKEND_ROADMAP.md");
 for(let p=0;p<=23;p++)assert.ok(roadmap.includes("B"+p+" |"),"Missing B"+p+" milestone");
});
