import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {allowedApiPath,backendOrigin} from "../src/services/api-route-policy.mjs";
const read=p=>fs.readFileSync(p,"utf8");
test("B22 bridge allows only validated browser API paths",()=>{
 assert.equal(allowedApiPath(["auth","session"],"GET"),true);
 assert.equal(allowedApiPath(["auth","login"],"POST"),true);
 assert.equal(allowedApiPath(["admin","reports","export"],"GET"),true);
 assert.equal(allowedApiPath(["support","tickets","f964d7a5-37c1-4d21-8d6d-0e9efdfb7ef4","messages"],"POST"),true);
 assert.equal(allowedApiPath(["webhooks","cashfree","payouts"],"POST"),false);
 assert.equal(allowedApiPath(["devices","pair"],"POST"),false);
 assert.equal(allowedApiPath(["drivers","screens","123","trips","start"],"POST"),false);
 assert.equal(allowedApiPath(["drivers","vehicles","123","gps-consent"],"POST"),false);
 assert.equal(allowedApiPath(["auth","session"],"TRACE"),false);
 assert.equal(allowedApiPath(["auth","..","session"],"GET"),false);
 assert.equal(allowedApiPath(["auth","%2e%2e"],"GET"),false);
 assert.equal(allowedApiPath(["https:","//bad"],"GET"),false);
});
test("B22 fails closed without a secure configured backend",()=>{
 assert.equal(backendOrigin(""),null);
 assert.equal(backendOrigin("https://example.com/api"),null);
 assert.equal(backendOrigin("https://user:secret@example.com"),null);
 assert.equal(backendOrigin("http://example.com"),null);
 assert.equal(backendOrigin("http://127.0.0.1:4000",true),null);
 assert.equal(backendOrigin("http://127.0.0.1:4000"),"http://127.0.0.1:4000");
 assert.equal(backendOrigin("https://api.example.com"),"https://api.example.com");
});
test("B22 never lets API mode rehydrate demo data when backend is unavailable",()=>{
 const bridge=read("src/app/api/backend/[...path]/route.ts");
 const layouts=["admin","advertiser","driver"].map(role=>
  read("src/app/(portals)/"+role+"/layout.tsx"));
 for(const layout of layouts){
  assert.match(layout,/NEXT_PUBLIC_DEMO_MODE==="false"/);
  assert.match(layout,/<ApiPortal role=/);
 }
 assert.match(bridge,/BACKEND_NOT_CONFIGURED/);
 assert.match(bridge,/BACKEND_UNAVAILABLE/);
 assert.match(bridge,/allowedApiPath/);
 assert.match(bridge,/getSetCookie/);
 assert.match(bridge,/redirect:"manual"/);
 assert.match(bridge,/no-store/);
 assert.doesNotMatch(bridge,/DEMO_USERS|useDemoStore|demoLogin/);
 const live=read("src/features/live/api-portal.tsx");
 assert.match(live,/liveSession/);
 assert.match(live,/csrfToken/);
 assert.match(live,/newIdempotencyKey/);
 assert.doesNotMatch(live,/useDemoStore|useDemoAuth|DEMO_USERS/);
});
test("B22 live routes include secure login, MFA and signup without browser-persisted secrets",()=>{
 for(const role of ["admin","driver","advertiser"]){
  assert.match(read("src/app/(portals)/"+role+"/layout.tsx"),/ApiPortal/);
 }
 const auth=read("src/components/auth/api-auth-screen.tsx");
 assert.match(auth,/\/auth\/login/);
 assert.match(auth,/\/auth\/mfa\/verify/);
 assert.match(auth,/\/auth\/register/);
 assert.match(auth,/\/auth\/reset-password/);
 assert.doesNotMatch(auth,/sessionStorage|localStorage/);
 const client=read("src/services/api-client.ts");
 assert.match(client,/credentials:"same-origin"/);
 assert.match(client,/Cache|cache:"no-store"/);
 assert.doesNotMatch(client,/sessionStorage|localStorage/);
});
