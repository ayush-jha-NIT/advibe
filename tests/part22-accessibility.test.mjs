import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {focusWrapIndex} from "../src/lib/overlay-focus.ts";
const read=p=>fs.readFileSync(path.join(process.cwd(),p),"utf8");
test("keyboard focus trapping cycles first and last, including focus outside",()=>{
 assert.equal(focusWrapIndex(0,3,true),2);
 assert.equal(focusWrapIndex(2,3,false),0);
 assert.equal(focusWrapIndex(1,3,true),null);
 assert.equal(focusWrapIndex(1,3,false),null);
 assert.equal(focusWrapIndex(-1,3,true),2);
 assert.equal(focusWrapIndex(-1,3,false),0);
 assert.equal(focusWrapIndex(0,0,false),null);
 assert.equal(focusWrapIndex(0,1,true),0);
});
test("mobile public and portal navigation use shared focus trap and accessible dialogs",()=>{
 const portal=read("src/components/layout/portal-shell.tsx");
 const site=read("src/components/layout/public-shell.tsx");
 for(const text of [portal,site]){
  assert.match(text,/trapOverlayTab/);
  assert.match(text,/aria-modal="true"/);
  assert.match(text,/aria-label="Close menu"/);
  assert.match(text,/focus\(\)/);
 }
});
test("the two simultaneously mounted portal search controls have instance-scoped IDs",()=>{
 const shell=read("src/components/layout/portal-shell.tsx");
 assert.match(shell,/React\.useId\(\)/);
 assert.match(shell,/resultsId/);
 assert.doesNotMatch(shell,/id="portal-search-results"/);
 assert.doesNotMatch(shell,/id=\{"portal-result-"\+i\}/);
});
test("every portal sidebar destination has an explicit page",()=>{
 const nav=read("src/config/navigation.ts");
 const roles=["admin","advertiser","driver"];
 for(const role of roles){
  const begin=nav.indexOf("  "+role+":[");
  const end=nav.indexOf("\n  ],",begin);
  assert.ok(begin!==-1&&end!==-1,"Missing nav for "+role);
  const urls=[...nav.slice(begin,end).matchAll(/href:"(\/[^"]+)"/g)].map(m=>m[1]);
  assert.ok(urls.length>=10,role+" has too few explicit nav routes");
  for(const url of urls){
   const file=path.join(process.cwd(),"src/app/(portals)",url,"page.tsx");
   assert.equal(fs.existsSync(file),true,role+" nav points to missing "+url);
  }
 }
});
test("public mobile navigation and long tables remain accessible",()=>{
 const css=read("src/app/globals.css");
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
 const wizard=read("src/features/advertiser/wizard-steps.tsx");
 assert.match(wizard,/overflow-x-auto/);
 assert.match(wizard,/role="region"/);
});
