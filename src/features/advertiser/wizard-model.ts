import {z} from "zod";
import type {DemoDatabase,Placement,Campaign} from "../../types/domain";
import {availableScreens,countScheduledDays,inclusiveDays,quoteCampaign,type Quote} from "../../lib/demo-rules";

export const placementLabels:Record<Placement,string>={
 bike_rear:"Bike rear",auto_rear:"Auto rear",auto_side:"Auto side",
 car_rear:"Car rear",car_interior:"Car interior",helmet:"Helmet wrap",
};
export const placements:Placement[]=["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"];
export const weekdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;
export type CampaignObjective=Campaign["objective"];
export type WizardDraft={
 campaignId:string|null;title:string;business:string;industry:string;description:string;objective:CampaignObjective;
 placement:Placement|null;creativeMode:"existing"|"preview";creativeId:string;creativeTitle:string;
 creativeFormat:"image"|"video"|"gif";selectedScreenIds:string[];
 startDate:string;endDate:string;weekdays:number[];startTime:string;endTime:string;playsPerDay:number;
 budgetCapRupees:string;agreed:boolean;
};
export const defaultWizardDraft:WizardDraft={
 campaignId:null,title:"",business:"",industry:"",description:"",objective:"awareness",
 placement:null,creativeMode:"existing",creativeId:"",creativeTitle:"",creativeFormat:"image",selectedScreenIds:[],
 startDate:"",endDate:"",weekdays:[0,1,2,3,4,5,6],startTime:"08:00",endTime:"22:00",playsPerDay:40,
 budgetCapRupees:"",agreed:false,
};
const basics=z.object({
 title:z.string().trim().min(3,"Campaign name must have at least 3 characters").max(120),
 business:z.string().trim().min(2,"Enter a business or brand name").max(100),
 industry:z.string().trim().min(2,"Select an industry").max(80),
 description:z.string().trim().max(500),
 objective:z.enum(["awareness","offer","visits","event"]),
});
const hhmm=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function wizardQuote(d:WizardDraft,db:DemoDatabase):Quote{
 if(!d.selectedScreenIds.length)throw Error("Choose at least one screen");
 if(!d.startDate||!d.endDate)throw Error("Choose campaign dates");
 const selected=d.selectedScreenIds.map(id=>{
  const screen=db.screens.find(s=>s.id===id);
  if(!screen)throw Error("Selected screen is missing");
  return screen;
 });
 return quoteCampaign({screens:selected,locations:db.locations,rules:db.pricingRules,
  startDate:d.startDate,endDate:d.endDate,weekdays:d.weekdays});
}
export function suggestedScreens(db:DemoDatabase,d:WizardDraft){
 if(!d.placement)return [];
 const hasDates=Boolean(d.startDate&&d.endDate);
 let candidates=db.screens;
 if(hasDates){
  try{candidates=availableScreens(db,d.startDate,d.endDate,d.campaignId??undefined);}
  catch{candidates=[];}
 }else{
  candidates=db.screens.filter(s=>{
   const vehicle=db.vehicles.find(v=>v.id===s.vehicleId&&v.driverId===s.driverId&&v.verification==="approved");
   const driver=db.driverApplications.find(a=>a.vehicleId===s.vehicleId&&a.driverId===s.driverId&&a.status==="approved");
   return s.status==="online"&&!!vehicle&&!!driver;
  });
 }
 return candidates.filter(s=>s.placement===d.placement);
}
export function validateWizardStep(step:number,d:WizardDraft,db:DemoDatabase,owner:string):void{
 if(step===1){
  const result=basics.safeParse(d);
  if(!result.success)throw Error(result.error.issues[0]?.message??"Check campaign details");
 }
 if(step===2&&!d.placement)throw Error("Select an advertising placement");
 if(step===3){
  if(!d.placement)throw Error("Select a placement first");
  if(d.creativeMode==="existing"){
   const creative=db.creatives.find(c=>c.id===d.creativeId&&c.advertiserId===owner&&c.placement===d.placement);
   if(!creative)throw Error("Choose your own compatible creative");
  }else if(!d.creativeTitle.trim()||d.creativeTitle.trim().length>100){
   throw Error("Enter a preview creative title up to 100 characters");
  }
 }
 if(step===4){
  if(!d.selectedScreenIds.length)throw Error("Choose at least one eligible demo screen");
  if(new Set(d.selectedScreenIds).size!==d.selectedScreenIds.length)throw Error("Duplicate screen selection");
  for(const id of d.selectedScreenIds){
   const screen=db.screens.find(s=>s.id===id);
   if(!screen||screen.placement!==d.placement)throw Error("Selected screen does not match the placement");
  }
 }
 if(step===5){
  if(!d.startDate||!d.endDate)throw Error("Select start and end dates");
  inclusiveDays(d.startDate,d.endDate);
  countScheduledDays(d.startDate,d.endDate,d.weekdays);
  if(!hhmm.test(d.startTime)||!hhmm.test(d.endTime)||d.startTime>=d.endTime)
   throw Error("Choose a valid daily time range with end after start");
  if(!Number.isInteger(d.playsPerDay)||d.playsPerDay<1||d.playsPerDay>500)throw Error("Daily plays must be between 1 and 500");
  // Availability must be rechecked after the dates are selected.
  const available=new Set(availableScreens(db,d.startDate,d.endDate,d.campaignId??undefined).map(s=>s.id));
  if(d.selectedScreenIds.some(id=>!available.has(id)))throw Error("A selected screen is unavailable for these dates. Return to Locations.");
  wizardQuote(d,db);
 }
 if(step===6){
  const quote=wizardQuote(d,db);
  const cap=d.budgetCapRupees.trim();
  if(cap){
   if(!/^\d+(?:\.\d{1,2})?$/.test(cap)||Number(cap)<=0||Number(cap)>100000000)throw Error("Budget cap must be a positive INR amount");
   if(Math.round(Number(cap)*100)<quote.totalPaise)throw Error("The estimate exceeds your budget cap");
  }
  if(!d.agreed)throw Error("Confirm that this is a demo estimate and submission");
 }
}
export function validateWizardAll(d:WizardDraft,db:DemoDatabase,owner:string){
 for(let step=1;step<=6;step++)validateWizardStep(step,d,db,owner);
 return wizardQuote(d,db);
}
