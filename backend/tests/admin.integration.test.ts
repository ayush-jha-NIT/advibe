import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {once} from "node:events";
import type {AddressInfo} from "node:net";
import test from "node:test";
import argon2 from "argon2";
import {PrismaClient,type User} from "@prisma/client";
import {createApp} from "../src/app.js";
import {loadConfig} from "../src/config/env.js";
import {createLogger} from "../src/lib/logger.js";
import {hashToken,mac,makeSessionToken} from "../src/modules/auth/security.js";
import {loadAuthSettings} from "../src/modules/auth/settings.js";
import {encryptTotpSecret} from "../src/modules/auth/mfa.js";
import {exportCsv} from "../src/modules/admin/reports.js";

const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV!=="test"||process.env.DB_TEST_ALLOWED!=="true"||!url)
 throw new Error("B21 requires disposable local PostgreSQL");
const target=new URL(url);
if(!["localhost","127.0.0.1","::1"].includes(target.hostname)||
 !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1)))
 throw new Error("B21 refuses non-test database");
test("B21 exports escape spreadsheet injections",()=>{
 const csv=exportCsv(["description","amount"],[["=HYPERLINK(\"https://evil.invalid\")",-33],
  ["  +cmd",0],["safe \" quote","123"]]);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/"'  \+cmd"/);
 assert.match(csv,/"'\-33"/);
 assert.match(csv,/safe "" quote/);
});
test("B21 MFA admin reports, least-privileged user status changes and audit exports",async()=>{
 const db=new PrismaClient();
 const config=loadConfig({NODE_ENV:"test",LOG_LEVEL:"silent"});
 const settings=loadAuthSettings({AUTH_SECRET:"ci_only_dev_test_auth_secret_32_characters_long_value",
  MFA_ENCRYPTION_KEY:"3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57"},config);
 await db.$connect();
 const tag=randomUUID().slice(0,8);
 const hash=await argon2.hash("B21-Secure-Admin-Integration!",{type:argon2.argon2id});
 const users=await Promise.all(["admin","secondadmin","driver","advertiser","unverified"].map(async name=>
  db.user.create({data:{email:"b21-"+name+"-"+tag+"@example.invalid",
   displayName:"B21 "+name,status:name==="unverified"?"PENDING":"ACTIVE",
   emailVerifiedAt:name==="unverified"?null:new Date(),
   passwordHash:hash,role:name==="admin"||name==="secondadmin"?"ADMIN":
    name==="driver"?"DRIVER":"ADVERTISER"}})));
 const [administrator,secondAdmin,driver,advertiser,unverified]=users as
  [User,User,User,User,User];
 for(const user of [administrator,secondAdmin]){
  await db.adminMfaCredential.create({data:{userId:user.id,
   secretCipher:encryptTotpSecret(settings,user.id,"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
   enabledAt:new Date(Date.now()-60000)}});
 }
 type Auth={cookie:string;csrf:string};
 const sessions=await Promise.all(users.map(async u=>{
  const token=makeSessionToken();
  await db.session.create({data:{userId:u.id,tokenHash:hashToken(token),
   expiresAt:new Date(Date.now()+600000),
   ...(u.role==="ADMIN"?{mfaVerifiedAt:new Date()}:{}),
  }});
  return {cookie:"advibe_dev_session="+token,csrf:mac(settings,"csrf",hashToken(token))};
 }));
 const [staff,staffTwo,motorist,advertiserAuth]=sessions as
  [Auth,Auth,Auth,Auth,Auth];
 const app=createApp(config,createLogger(config),async()=>db.user.count().then(()=>{}),
  {db,settings,sender:async()=>{}},async()=>false);
 const server=app.listen(0,"127.0.0.1");
 try{
  await once(server,"listening");
  const root="http://127.0.0.1:"+(server.address() as AddressInfo).port+"/api/v1";
  const send=(method:string,path:string,auth:Auth,body?:object,key?:string,csrf=true)=>{
   const headers:Record<string,string>={Cookie:auth.cookie,Origin:"http://localhost:3000"};
   if(body)headers["Content-Type"]="application/json";
   if(csrf)headers["X-CSRF-Token"]=auth.csrf;
   if(key)headers["Idempotency-Key"]=key;
   return fetch(root+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  };
  const get=(path:string,who:Auth)=>send("GET",path,who);
  const patch=(path:string,who:Auth,body:object,key?:string,csrf=true)=>
   send("PATCH",path,who,body,key,csrf);
  assert.equal((await get("/admin/users",motorist)).status,403);
  assert.equal((await get("/admin/users",advertiserAuth)).status,403);
  assert.equal((await get("/admin/users?limit=99",staff)).status,422);
  assert.equal((await get("/admin/users?cursor=not-a-uuid",staff)).status,422);
  assert.equal((await get("/admin/users?role=OWNER",staff)).status,422);
  const usersList=await get("/admin/users?search=b21-",staff);
  assert.equal(usersList.status,200);
  const visible=(await usersList.json() as {data:Array<Record<string,unknown>>}).data;
  assert.ok(visible.length>=5);
  assert.ok(visible.every(x=>!Object.hasOwn(x,"passwordHash")&&
   !Object.hasOwn(x,"mfaCredential")&&!Object.hasOwn(x,"session")));
  const suspended={expectedStatus:"ACTIVE",status:"SUSPENDED",
   reason:"Manual account restriction approved by the trust operations reviewer"};
  const changePath="/admin/users/"+driver.id+"/status";
  assert.equal((await patch(changePath,motorist,suspended,"b21-forbidden-"+tag)).status,403);
  assert.equal((await patch(changePath,staff,suspended,"b21-no-csrf-"+tag,false)).status,403);
  assert.equal((await patch(changePath,staff,suspended)).status,422);
  assert.equal((await patch("/admin/users/"+administrator.id+"/status",staff,
   suspended,"b21-self-"+tag)).status,403);
  assert.equal((await patch("/admin/users/"+secondAdmin.id+"/status",staff,
   suspended,"b21-admin-"+tag)).status,404);
  assert.equal((await patch("/admin/users/"+driver.id+"/status",staff,
   {...suspended,reason:"short"},"b21-short-"+tag)).status,422);
  const created=await patch(changePath,staff,suspended,"b21-suspend-"+tag);
  assert.equal(created.status,200);
  const decision=(await created.json() as {data:{id:string;status:string}}).data;
  assert.equal(decision.status,"suspended");
  assert.equal((await db.user.findUniqueOrThrow({where:{id:driver.id}})).status,"SUSPENDED");
  assert.equal(await db.session.count({where:{userId:driver.id,revokedAt:null}}),0);
  assert.equal((await get("/me",motorist)).status,401);
  assert.equal((await patch(changePath,staff,suspended,"b21-suspend-"+tag)).status,200);
  assert.equal((await patch(changePath,staff,{...suspended,status:"ACTIVE"},
   "b21-suspend-"+tag)).status,409);
  assert.equal((await patch(changePath,staff,suspended,"b21-resuspend-"+tag)).status,409);
  const decisionRow=await db.accountStatusDecision.findUniqueOrThrow({
   where:{id:decision.id}});
  assert.equal(decisionRow.administratorUserId,administrator.id);
  assert.equal(decisionRow.subjectUserId,driver.id);
  assert.equal(decisionRow.reason,suspended.reason);
  await assert.rejects(db.accountStatusDecision.update({where:{id:decision.id},
   data:{reason:"Try to corrupt approved record"}}));
  await assert.rejects(db.accountStatusDecision.delete({where:{id:decision.id}}));
  const restore={expectedStatus:"SUSPENDED",status:"ACTIVE",
   reason:"Reviewed account evidence and approved reactivation after investigation"};
  assert.equal((await patch(changePath,staff,restore,"b21-restore-"+tag)).status,200);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:driver.id}})).status,"ACTIVE");
  assert.equal((await get("/me",motorist)).status,401,
   "Suspended user's old login must stay invalid after reactivation");
  assert.equal((await db.accountStatusDecision.count({where:{subjectUserId:driver.id}})),2);
  const history=await get("/admin/users/"+driver.id+"/decisions",staff);
  assert.equal(history.status,200);
  assert.equal((await history.json() as {data:unknown[]}).data.length,2);
  assert.equal((await get("/admin/users/"+driver.id+"/decisions",advertiserAuth)).status,403);
  const since=new Date().toISOString().slice(0,10);
  const query="?from="+since+"&to="+since;
  assert.equal((await get("/admin/audit-events"+query,motorist)).status,403);
  const audit=await get("/admin/audit-events"+query+"&action=admin.account_suspended",staff);
  assert.equal(audit.status,200);
  const rows=(await audit.json() as {data:Array<Record<string,unknown>>}).data;
  assert.ok(rows.some(x=>x.resourceId===driver.id));
  assert.ok(rows.every(x=>!Object.hasOwn(x,"metadata")&&!Object.hasOwn(x,"reason")));
  assert.equal((await get("/admin/audit-events?actorUserId=invalid",staff)).status,422);
  assert.equal((await get("/admin/audit-events?from=2020-01-01&to=2026-10-26",staff)).status,422);
  const event=await db.auditEvent.create({data:{actorUserId:administrator.id,
   action:"admin.export_sanitizer_check",resourceType:"support_ticket",
   resourceId:"=HYPERLINK(https://example.invalid)"}});
  const exportResult=await get("/admin/audit-events/export"+query+"&action=admin.export_sanitizer_check",staff);
  assert.equal(exportResult.status,200);
  assert.match(exportResult.headers.get("content-type")??"",/text\/csv/);
  const csv=await exportResult.text();
  assert.match(csv,/'=HYPERLINK/);
  assert.match(csv,new RegExp(event.id));
  assert.equal((await get("/admin/audit-events/export"+query,advertiserAuth)).status,403);
  assert.equal((await db.auditEvent.count({where:{
   action:"admin.audit_exported",actorUserId:administrator.id}})),1);
  assert.equal((await get("/admin/reports",staffTwo)).status,200);
  assert.equal((await get("/admin/reports",motorist)).status,403);
  assert.equal((await get("/admin/reports?from=nope",staff)).status,422);
  assert.equal((await get("/admin/reports/export?from=2025-01-01&to=2026-10-26",staff)).status,422);
  const reportFile=await get("/admin/reports/export"+query,staff);
  assert.equal(reportFile.status,200);
  assert.match(await reportFile.text(),/confirmedBookingGrossPaise/);
  assert.equal((await db.auditEvent.count({where:{action:"admin.report_exported"}})),1);
  // PENDING accounts cannot be pushed into ACTIVE with this operator status workflow.
  assert.equal((await patch("/admin/users/"+unverified.id+"/status",staff,
   restore,"b21-unverified-"+tag)).status,409);
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  await db.$disconnect();
 }
});
