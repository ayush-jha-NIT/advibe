import type {Actor,DemoDatabase,PricingRule,Settlement} from "../../types/domain";
import {assertDemoAdmin} from "./admin-rules.ts";
import {utcDay} from "../../lib/demo-rules.ts";
export function validatePricingUpdate(db:DemoDatabase,actor:Actor,id:string,next:Pick<PricingRule,"rupeesPerScreenDay"|"active"|"validFrom"|"validTo">):PricingRule{
 assertDemoAdmin(actor);
 const old=db.pricingRules.find(x=>x.id===id);
 if(!old)throw Error("Rate rule not found.");
 if(!Number.isSafeInteger(next.rupeesPerScreenDay)||next.rupeesPerScreenDay<0||next.rupeesPerScreenDay>100000)
  throw Error("Sample daily rate must be an integer between 0 and 100000 INR.");
 if(utcDay(next.validFrom)>utcDay(next.validTo))throw Error("Start date must not exceed end date.");
 if(next.active&&db.pricingRules.some(r=>r.id!==id&&r.active&&r.city===old.city&&r.placement===old.placement
  &&r.validFrom<=next.validTo&&next.validFrom<=r.validTo))throw Error("Conflicting active example rate for the same city, placement and dates.");
 return {...old,...next};
}
export function validateSettlementTransition(db:DemoDatabase,actor:Actor,id:string,target:"processed"|"failed"):Settlement{
 assertDemoAdmin(actor);
 const found=db.settlements.find(s=>s.id===id);
 if(!found)throw Error("Settlement not found.");
 if(found.status!=="pending")throw Error("Only pending sample settlement records can change.");
 if(!["processed","failed"].includes(target))throw Error("Invalid settlement status.");
 if(!Number.isSafeInteger(found.grossPaise)||!Number.isSafeInteger(found.deductionsPaise)||found.deductionsPaise<0||found.deductionsPaise>found.grossPaise)throw Error("Invalid settlement amounts.");
 return found;
}
export function pricingSearch(db:DemoDatabase,q:string,city:string){
 const needle=q.trim().toLowerCase();
 return db.pricingRules.filter(r=>(city==="all"||r.city===city)
 &&(!needle||[r.id,r.city,r.placement].some(s=>s.toLowerCase().includes(needle)))).sort((a,b)=>a.city.localeCompare(b.city)||a.placement.localeCompare(b.placement));
}
export function adminBookingCandidates(db:DemoDatabase){
 return db.campaigns.filter(c=>c.status==="approved"&&c.paymentStatus==="paid");
}
