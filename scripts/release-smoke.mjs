/**
 * Part 23: genuine Chromium smoke checks against a built Next.js server.
 * All accounts, screens and financial records are fictitious.
 * Run: BASE_URL=http://127.0.0.1:3100 node scripts/release-smoke.mjs
 */
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";

const base=process.env.BASE_URL??"http://127.0.0.1:3100";
const output="test-results";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let passed=0;
const failures=[];
const viewportWidths=[320,375,768,1024,1440];

async function visit(page,route,{overflow=false}={}){
 const errors=[];
 const onError=e=>errors.push(e.message);
 page.on("pageerror",onError);
 try{
  const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:15000});
  assert.ok(response&&response.status()<400,route+" HTTP "+response?.status());
  await page.locator("main").first().waitFor({state:"visible",timeout:15000});
  await page.waitForTimeout(120);
  assert.equal(await page.getByText("This page could not be found").count(),0,"Not-found page at "+route);
  if(overflow){
   const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(dims.scroll<=dims.viewport+5,route+" horizontal overflow "+JSON.stringify(dims));
  }
  assert.deepEqual(errors,[],route+" client exception");
  passed++;
 }finally{page.off("pageerror",onError);}
}
async function section(name,fn){
 try{await fn();console.log("PASS",name);}
 catch(error){failures.push({name,message:String(error?.stack??error)});console.error("FAIL",name,error);}
}
async function createPage(width){
 const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:"reduce"});
 const page=await ctx.newPage();page.setDefaultTimeout(12000);
 return {ctx,page};
}
async function screenshot(page,label){
 try{await mkdir(output,{recursive:true});await page.screenshot({path:output+"/"+label+".png",fullPage:false,timeout:8000});}catch{}
}
try{
 for(const width of viewportWidths){
  await section("Public site responsive "+width+"px",async()=>{
   const {ctx,page}=await createPage(width);
   try{
    const routes=width===375||width===1440
     ?["/","/for-advertisers","/for-drivers","/locations","/pricing","/help-center","/contact","/about","/ad-formats"]
     :["/","/pricing","/contact"];
    for(const route of routes)await visit(page,route,{overflow:width<=375});
    if(width<=1024){
     await page.goto(base+"/");
     const trigger=page.getByRole("button",{name:"Open public navigation"});
     await trigger.click();
     const panel=page.getByRole("dialog",{name:"Public navigation menu"});
     await panel.waitFor({state:"visible"});
     await page.keyboard.press("Escape");
     await panel.waitFor({state:"hidden"});
     assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,"public drawer focus not restored");
     passed++;
    }
   }catch(e){await screenshot(page,"public-"+width);throw e;}finally{await ctx.close();}
  });
 }
 await section("Auth routes and preset login",async()=>{
  const {ctx,page}=await createPage(375);
  try{
   for(const r of ["/login","/signup","/verify","/forgot-password","/reset-password"])
    await visit(page,r,{overflow:true});
   await page.goto(base+"/login?role=advertiser");
   await page.getByRole("button",{name:"Fill advertiser demo credentials"}).click();
   await page.getByRole("button",{name:/Sign in to demo/}).click();
   await page.waitForURL("**/advertiser");
   await page.getByRole("heading",{level:1}).first().waitFor({timeout:15000});
   assert.equal(new URL(page.url()).pathname,"/advertiser");
   passed++;
  }catch(e){await screenshot(page,"auth");throw e;}finally{await ctx.close();}
 });
 const portalRoutes={
  advertiser:["/advertiser","/advertiser/campaigns","/advertiser/create-campaign","/advertiser/creatives","/advertiser/locations","/advertiser/billing","/advertiser/notifications","/advertiser/support"],
  driver:["/driver","/driver/vehicle","/driver/onboarding","/driver/assigned-ads","/driver/campaigns","/driver/earnings","/driver/payouts","/driver/support","/driver/maintenance"],
  admin:["/admin","/admin/campaigns","/admin/approvals","/admin/drivers","/admin/screens","/admin/bookings","/admin/payments","/admin/analytics","/admin/audit"]
 };
 for(const width of [375,1280]){
  for(const [role,routes] of Object.entries(portalRoutes)){
   await section(role+" portal "+width+"px and routes",async()=>{
    const {ctx,page}=await createPage(width);
    try{
     await page.goto(base+"/"+role);
     const gate=page.getByRole("button",{name:new RegExp("Continue as demo "+role)});
     await gate.waitFor({state:"visible",timeout:15000});
     await gate.click();
     await page.getByRole("heading",{level:1}).first().waitFor({timeout:15000});
     for(const route of (width===375?[routes[0],routes[1],routes[2],routes[routes.length-1]]:routes))
      await visit(page,route,{overflow:width===375});
     if(width===375){
      await page.goto(base+"/"+role);
      const trigger=page.getByRole("button",{name:"Open navigation menu"});
      await trigger.click();
      const dialog=page.getByRole("dialog",{name:"Mobile navigation"});
      await dialog.waitFor({state:"visible"});
      await page.keyboard.press("Escape");
      await dialog.waitFor({state:"hidden"});
      assert.equal(await trigger.evaluate(e=>e===document.activeElement),true,role+" drawer focus not restored");
      passed++;
     }
    }catch(e){await screenshot(page,role+"-"+width);throw e;}finally{await ctx.close();}
   });
  }
 }
 await section("Cross-portal screen status without invented playback",async()=>{
  const {ctx,page}=await createPage(1280);
  try{
   await page.goto(base+"/admin/screens");
   await page.getByRole("button",{name:"Continue as demo admin"}).click();
   await page.getByRole("heading",{name:"Screens & Devices"}).waitFor();
   page.once("dialog",d=>d.accept());
   await page.getByRole("button",{name:"Mark maintenance"}).first().click();
   await page.getByText("Screen scr-1 status updated",{exact:false}).first().waitFor({timeout:10000}).catch(()=>{});
   await page.goto(base+"/driver/vehicle");
   const gate=page.getByRole("button",{name:"Continue as demo driver"});
   if(await gate.count())await gate.click();
   await page.getByRole("heading",{name:"My Vehicle & Screens"}).waitFor({timeout:15000});
   assert.ok((await page.locator("#portal-main").innerText()).includes("maintenance"),"driver inventory not showing changed sample status");
   passed++;
  }catch(e){await screenshot(page,"cross-portal");throw e;}finally{await ctx.close();}
 });
}finally{await browser.close();}
console.log("CHROMIUM SMOKE RESULT",passed+" assertions passed",failures.length+" failed groups");
for(const f of failures)console.error(f.name+"\n"+f.message);
if(failures.length)process.exitCode=1;
