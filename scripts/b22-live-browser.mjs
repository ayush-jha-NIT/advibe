import assert from "node:assert/strict";
import {chromium} from "playwright";
const BASE=process.env.BASE_URL||"http://127.0.0.1:3101";
const uid="11111111-1111-4111-8111-111111111111";
const campaignId="22222222-2222-4222-8222-222222222222";
const ownerId="33333333-3333-4333-8333-333333333333";
const creativeId="44444444-4444-4444-8444-444444444444";
const ensure=async(page,path)=>{await page.goto(BASE+path,{waitUntil:"domcontentloaded"});};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let passes=0;
try{
 for(const role of ["advertiser","driver","admin"]){
  const context=await browser.newContext({baseURL:BASE});
  const page=await context.newPage();
  let loggedIn=false;
  const mutations=[];
  await page.route("**/api/backend/**",async route=>{
   const r=route.request(),path=new URL(r.url()).pathname.replace("/api/backend",""),method=r.method();
   const json=(status,data)=>route.fulfill({status,contentType:"application/json",
    headers:{"cache-control":"no-store"},body:JSON.stringify({data})});
   const failed=(status,code)=>route.fulfill({status,contentType:"application/json",
    body:JSON.stringify({error:{code,message:code}})});
   if(path==="/auth/login"&&method==="POST"){
    const body=JSON.parse(r.postData()??"{}");
    assert.equal(body.email,"verified@example.invalid");
    if(role==="admin")return json(202,{challengeId:uid,ticket:"x".repeat(43)});
    loggedIn=true;return json(200,{userId:uid,role});
   }
   if(path==="/auth/mfa/verify"&&role==="admin"&&method==="POST"){
    assert.equal(JSON.parse(r.postData()??"{}").code,"123456");
    loggedIn=true;return json(201,{userId:uid,role});
   }
   if(path==="/auth/session"){
    if(!loggedIn)return failed(401,"UNAUTHENTICATED");
    return json(200,{userId:uid,role,csrfToken:"a".repeat(64),
     expiresAt:"2028-01-01T00:00:00Z"});
   }
   if(!loggedIn)return failed(401,"UNAUTHENTICATED");
   if(method==="POST"||method==="PATCH"){
    assert.ok(r.headers()["x-csrf-token"],"CSRF forwarded for "+path);
    mutations.push({method,path,body:JSON.parse(r.postData()??"{}"),
     key:r.headers()["idempotency-key"]});
    if(path==="/campaigns")return json(201,{id:campaignId});
    return json(200,{id:uid});
   }
   if(path==="/admin/reports")return json(200,{
    counts:{newUsers:4,paidBookings:2},financial:{confirmedBookingGrossPaise:"37000",
     confirmedRefundsPaise:"7000"},currency:"INR"});
   if(path.startsWith("/admin/users"))return json(200,[{id:ownerId,
    displayName:"Driver Example",email:"driver@example.invalid",role:"driver",status:"active"}]);
   if(path==="/drivers/me/earnings")return json(200,{
    earnedPaise:22000,paidPaise:11000,availablePaise:11000,entries:[]});
   if(path==="/drivers/me")return json(200,{id:uid,city:"Prayagraj"});
   if(path==="/businesses")return json(200,[{id:ownerId,displayName:"Business Example"}]);
   if(path==="/creatives")return json(200,[{id:creativeId,title:"Creative One",approval:"approved"}]);
   if(path==="/campaigns")return json(200,[{id:campaignId,title:"Verified Campaign",status:"draft"}]);
   if(path.startsWith("/campaigns/"))return json(200,{id:campaignId,title:"Verified Campaign",status:"draft"});
   if(path==="/notifications")return json(200,[{id:uid,title:"Service updated",body:"There is a new update",kind:"support",readAt:null}]);
   return json(200,[]);
  });
  await ensure(page,"/"+role);
  await page.getByText("Live session required").waitFor();
  assert.equal(await page.getByText("Continue as demo "+role).count(),0);
  await ensure(page,"/login?next=%2F"+role);
  await page.getByLabel("Email").fill("verified@example.invalid");
  await page.getByLabel("Password").fill("valid-live-password");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  if(role==="admin"){
   await page.getByText("Enter your authenticator's 6-digit code.").waitFor();
   await page.getByLabel("Authenticator code").fill("123456");
   await page.getByRole("button",{name:"Verify authenticator"}).click();
  }
  await page.getByText("LIVE API").waitFor();
  assert.equal(await page.getByText("DEMO DRIVER PORTAL").count(),0);
  if(role==="admin"){
   await ensure(page,"/admin");
   await page.getByText("Confirmed Booking Gross Paise").waitFor();
   await ensure(page,"/admin/users");
   await page.getByText("Driver Example").waitFor();
   page.on("dialog",dialog=>void dialog.accept(dialog.type()==="prompt"?
    "Reviewed and approved suspension for a test driver account":undefined));
   await page.getByRole("button",{name:"Manage"}).first().click();
   await page.waitForTimeout(250);
   assert.ok(mutations.some(x=>x.path.endsWith("/status")&&x.method==="PATCH"&&x.key));
  }else if(role==="driver"){
   await ensure(page,"/driver/earnings");
   await page.getByText("Earned Paise").waitFor();
   await ensure(page,"/driver/notifications");
   await page.getByText("Service updated").waitFor();
   await page.getByRole("button",{name:"Manage"}).first().click();
   assert.ok(mutations.some(x=>x.path.endsWith("/read")));
  }else{
   await ensure(page,"/advertiser/create-campaign");
   await page.getByLabel("Business",{exact:true}).selectOption(ownerId);
   await page.getByLabel("Approved or uploaded creative").selectOption(creativeId);
   await page.getByLabel("Campaign title").fill("Example verified draft");
   await page.getByLabel("Start").fill("2027-01-12");
   await page.getByLabel("End (within 60 days)").fill("2027-01-19");
   await page.getByRole("button",{name:"Save campaign draft"}).click();
   await page.waitForURL("**/advertiser/campaigns/"+campaignId);
   assert.ok(mutations.some(x=>x.path==="/campaigns"&&x.key));
  }
  passes++;await context.close();
 }
 console.log("B22 live browser API-mode role flows passed: "+passes+"/3");
}finally{await browser.close();}
