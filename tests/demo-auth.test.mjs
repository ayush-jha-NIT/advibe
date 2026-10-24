import test from "node:test";
import assert from "node:assert/strict";
import {authHome,DEMO_CODE,DEMO_PASSWORD,DEMO_CODE_TTL_MS,DEMO_MAX_ATTEMPTS,DEMO_RESEND_DELAY_MS,makePending,normalizeEmail,parseAuthRole,parsePublicRole,passwordIssues,resendAllowed,safeNext,verifyPending,validDemoLogin} from "../src/lib/demo-auth.ts";

test("role parser accepts known roles and never grants admin public registration",()=>{
 assert.equal(parseAuthRole("admin"),"admin");
 assert.equal(parseAuthRole("driver"),"driver");
 assert.equal(parseAuthRole("other"),"advertiser");
 assert.equal(parsePublicRole("admin"),"advertiser");
 assert.equal(authHome("driver"),"/driver");
});
test("emails normalize; password strength rejects incomplete candidates",()=>{
 assert.equal(normalizeEmail("  TEST@EXAMPLE.COM "),"test@example.com");
 assert.deepEqual(passwordIssues("AdVibe@123"),[]);
 assert.ok(passwordIssues("12345678").length>2);
});
test("demo OTP has expiry, attempt cap, and resend cooldown",()=>{
 const now=1_000_000;
 const p=makePending({purpose:"signup",email:" Test@Example.COM ",role:"driver",displayName:"  Test Driver  "},now);
 assert.equal(p.email,"test@example.com");
 assert.equal(p.displayName,"Test Driver");
 assert.equal(verifyPending(p,DEMO_CODE,now),"ok");
 assert.equal(verifyPending(p,"000000",now),"invalid");
 assert.equal(verifyPending(p,DEMO_CODE,now+DEMO_CODE_TTL_MS+1),"expired");
 assert.equal(verifyPending({...p,attempts:DEMO_MAX_ATTEMPTS},DEMO_CODE,now),"locked");
 assert.equal(resendAllowed(p,now+DEMO_RESEND_DELAY_MS-1),false);
 assert.equal(resendAllowed(p,now+DEMO_RESEND_DELAY_MS),true);
});
test("preset identity requires selected role and public demo password",()=>{
 assert.equal(validDemoLogin("advertiser@demo.advibe.test",DEMO_PASSWORD,"advertiser"),true);
 assert.equal(validDemoLogin("advertiser@demo.advibe.test","wrong","advertiser"),false);
 assert.equal(validDemoLogin("advertiser@demo.advibe.test",DEMO_PASSWORD,"admin"),false);
});
test("redirects cannot jump roles or escape the site",()=>{
 assert.equal(safeNext("/driver/earnings","driver"),"/driver/earnings");
 assert.equal(safeNext("/admin","driver"),"/driver");
 assert.equal(safeNext("//outside.example","admin"),"/admin");
 assert.equal(safeNext("/\\outside","advertiser"),"/advertiser");
 assert.equal(safeNext("https://example.test","admin"),"/admin");
});
