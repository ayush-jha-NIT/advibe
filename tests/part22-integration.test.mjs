import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read=p=>fs.readFileSync(path.join(process.cwd(),p),"utf8");
const light=hex=>{
 const [r,g,b]=hex.match(/[a-f\d]{2}/gi).map(v=>{const c=parseInt(v,16)/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
 return .2126*r+.7152*g+.0722*b;
};
const contrast=(a,b)=>{const l=light(a),r=light(b);return (Math.max(l,r)+.05)/(Math.min(l,r)+.05)};
test("approved orange is preserved while CTA text meets 4.5:1 normal-text contrast",()=>{
 assert.ok(contrast("#041b3d","#ff6a00")>=4.5);
 assert.ok(contrast("#ffffff","#ff6a00")<4.5);
 assert.match(read("src/components/ui/button.tsx"),/bg-brand-orange text-brand-navy/);
 assert.match(read("src/components/layout/public-shell.tsx"),/bg-brand-orange px-5 text-sm font-semibold text-brand-navy/);
 assert.match(read("src/app/(site)/page.tsx"),/bg-brand-orange text-brand-navy/);
 assert.match(read("src/components/public/marketing-blocks.tsx"),/bg-\[#ff6a00\].*text-\[#041b3d\]/);
});
test("public nav links resolve to implemented site pages",()=>{
 const config=read("src/config/navigation.ts");
 const nav=config.slice(config.indexOf("export const publicNavigation"),config.indexOf("export function activePortalItem"));
 const urls=[...nav.matchAll(/href:"(\/[^"]+)"/g)].map(x=>x[1].split("?")[0]);
 for(const route of urls){
  const p=route==="/"? "src/app/(site)/page.tsx":"src/app/(site)"+route+"/page.tsx";
  assert.equal(fs.existsSync(path.join(process.cwd(),p)),true,"Missing public route "+route);
 }
});
test("all sidebar destinations are dedicated pages, not placeholders",()=>{
 const config=read("src/config/navigation.ts");
 for(const role of ["admin","advertiser","driver"]){
  const beginning=config.indexOf("  "+role+":[");
  const ending=config.indexOf("\n  ],",beginning);
  const links=[...config.slice(beginning,ending).matchAll(/href:"(\/[^"]+)"/g)].map(x=>x[1]);
  for(const route of links){
   const source=read("src/app/(portals)"+route+"/page.tsx");
   assert.doesNotMatch(source,/SectionPlaceholder/,"Placeholder remains at "+route);
  }
 }
});
test("all three page families have accessible skip links and target landmarks",()=>{
 const pages=[["src/components/auth/auth-frame.tsx","auth-main"],["src/components/layout/public-shell.tsx","public-main"],["src/components/layout/portal-shell.tsx","portal-main"]];
 for(const [file,id] of pages){const v=read(file);assert.ok(v.includes('href="#'+id+'"'));assert.ok(v.includes('id="'+id+'"'));}
});
test("choice controls use pressed-button group, not orphaned tab roles",()=>{
 const v=read("src/components/ui/tabs.tsx");
 assert.match(v,/role="group"/);
 assert.match(v,/aria-pressed=\{value === tab\.value\}/);
 assert.doesNotMatch(v,/role="tab"/);
});
test("mobile nav focuses trigger after restoring inert backgrounds",()=>{
 const site=read("src/components/layout/public-shell.tsx"),portal=read("src/components/layout/portal-shell.tsx");
 assert.match(site,/requestAnimationFrame\(\(\)=>openButton\.current\?\.focus\(\)\)/);
 assert.match(portal,/requestAnimationFrame\(\(\)=>menuButtonRef\.current\?\.focus\(\)\)/);
 assert.match(site,/inert=\{mobileOpen\}/);
 assert.match(portal,/inert=\{mobileOpen\}/);
});
test("reduced-motion and increased-contrast preferences survive",()=>{
 const css=read("src/app/globals.css");
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.match(css,/prefers-contrast:\s*more/);
 assert.match(css,/forced-colors:\s*active/);
});
