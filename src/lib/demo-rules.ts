import type {Actor,Booking,Campaign,CampaignStatus,Creative,DemoDatabase,DriverApplication,Location,Placement,PricingRule,Screen} from "../types/domain";

const DAY_MS=86_400_000;
export function utcDay(value:string):number{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Expected YYYY-MM-DD");
 const n=Date.parse(value+"T00:00:00Z");
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw Error("Invalid date");
 return n/DAY_MS;
}
export function inclusiveDays(start:string,end:string):number{
 const days=utcDay(end)-utcDay(start)+1;
 if(days<1||days>366)throw Error("Date range must be 1–366 days");
 return days;
}
export function overlap(a:string,b:string,c:string,d:string):boolean{
 inclusiveDays(a,b);inclusiveDays(c,d);
 return utcDay(a)<=utcDay(d)&&utcDay(c)<=utcDay(b);
}
export type Quote={lines:{screenId:string;placement:Placement;rateRupeesPerDay:number;days:number;amountPaise:number}[];subtotalPaise:number;discountPaise:number;taxPaise:number;totalPaise:number;currency:"INR";gstPercent:18};
export function countScheduledDays(start:string,end:string,weekdays:number[]):number{
 inclusiveDays(start,end);
 if(!weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(weekdays).size!==weekdays.length)
  throw Error("Select valid unique delivery weekdays");
 const first=utcDay(start),last=utcDay(end),chosen=new Set(weekdays);
 let count=0;
 for(let d=first;d<=last;d++)if(chosen.has(new Date(d*DAY_MS).getUTCDay()))count++;
 if(count===0)throw Error("Your chosen weekdays do not occur in this date range");
 return count;
}
export function quoteCampaign(input:{screens:Screen[];locations:Location[];rules:PricingRule[];startDate:string;endDate:string;discountPercent?:number;weekdays?:number[]}):Quote{
 const days=input.weekdays?countScheduledDays(input.startDate,input.endDate,input.weekdays):inclusiveDays(input.startDate,input.endDate),discount=input.discountPercent??0;
 if(!Number.isInteger(discount)||discount<0||discount>100)throw Error("Discount must be between 0 and 100");
 const unique=new Set<string>();
 const lines=input.screens.map(screen=>{
  if(unique.has(screen.id))throw Error("Duplicate screen");
  unique.add(screen.id);
  const loc=input.locations.find(x=>x.id===screen.locationId);
  if(!loc)throw Error("Missing screen location");
  const valid=input.rules.filter(x=>x.active&&x.placement===screen.placement&&x.city===loc.city&&x.validFrom<=input.startDate&&x.validTo>=input.endDate);
  if(valid.length!==1)throw Error("Exactly one active rate required for "+screen.id);
  const rate=valid[0].rupeesPerScreenDay;
  if(!Number.isSafeInteger(rate)||rate<0)throw Error("Invalid rate");
  return {screenId:screen.id,placement:screen.placement,rateRupeesPerDay:rate,days,amountPaise:rate*days*100};
 });
 if(!lines.length)throw Error("Select at least one screen");
 const subtotalPaise=lines.reduce((sum,x)=>sum+x.amountPaise,0);
 const discountPaise=Math.round(subtotalPaise*discount/100);
 const taxPaise=Math.round((subtotalPaise-discountPaise)*18/100);
 return {lines,subtotalPaise,discountPaise,taxPaise,totalPaise:subtotalPaise-discountPaise+taxPaise,currency:"INR",gstPercent:18};
}
export function availableScreens(db:Pick<DemoDatabase,"screens"|"vehicles"|"driverApplications"|"bookings">,start:string,end:string,excludeCampaign?:string):Screen[]{
 inclusiveDays(start,end);
 return db.screens.filter(screen=>{
  if(screen.status!=="online")return false;
  const vehicle=db.vehicles.find(v=>v.id===screen.vehicleId&&v.driverId===screen.driverId&&v.verification==="approved");
  const driver=db.driverApplications.find(a=>a.driverId===screen.driverId&&a.vehicleId===screen.vehicleId&&a.status==="approved");
  if(!vehicle||!driver)return false;
  return !db.bookings.some(b=>b.screenId===screen.id&&b.campaignId!==excludeCampaign&&b.status!=="cancelled"&&overlap(start,end,b.startDate,b.endDate));
 });
}
export function validateBooking(db:DemoDatabase,campaign:Campaign,screenIds:string[]):void{
 if(screenIds.length===0||new Set(screenIds).size!==screenIds.length)throw Error("Select unique screens");
 const creative=db.creatives.find(c=>c.id===campaign.creativeId&&c.advertiserId===campaign.advertiserId&&c.approval==="approved");
 if(!creative)throw Error("Advertiser must own an approved creative");
 const eligible=new Set(availableScreens(db,campaign.startDate,campaign.endDate,campaign.id).map(x=>x.id));
 for(const id of screenIds){
  const screen=db.screens.find(x=>x.id===id);
  if(!eligible.has(id))throw Error("Screen unavailable: "+id);
  if(screen?.placement!==creative.placement)throw Error("Creative/placement mismatch: "+id);
 }
}
const allowed:Record<CampaignStatus,readonly CampaignStatus[]>={
 draft:["submitted","cancelled"],submitted:["under_review","cancelled"],
 under_review:["approved","changes_requested","rejected"],changes_requested:["submitted","cancelled"],
 approved:["scheduled","cancelled"],scheduled:["live","cancelled"],
 live:["paused","completed"],paused:["live","cancelled"],
 completed:[],rejected:[],cancelled:[],
};
export function assertCampaignTransition(from:CampaignStatus,to:CampaignStatus):void{
 if(!allowed[from].includes(to))throw Error("Invalid campaign transition: "+from+" → "+to);
}
export function canGoLive(campaign:Campaign,db:DemoDatabase):boolean{
 if(campaign.status!=="scheduled"||campaign.paymentStatus!=="paid"||!campaign.screenIds.length)return false;
 return campaign.screenIds.every(id=>db.bookings.some(b=>b.campaignId===campaign.id&&b.screenId===id&&b.status==="confirmed"));
}
export function assertDriverApproval(application:DriverApplication):void{
 if(application.completedSteps!==5||application.documentsStatus!=="approved"||application.screenSetupStatus!=="approved")
  throw Error("All onboarding steps, documents and device setup must be verified");
}
// Frontend demo visibility ONLY, not production authorization. Enforce actual RBAC on a backend.
export function canRead(actor:Actor,table:keyof DemoDatabase,record:unknown):boolean{
 if(actor.role==="admin")return true;
 const row=record as Record<string,unknown>;
 if(table==="locations"||table==="pricingRules")return true;
 if(table==="screens")return true; // Public demo inventory only, no real GPS or driver details.
 if(table==="accounts")return row.id===actor.accountId;
 if(table==="creatives"||table==="campaigns"||table==="payments")return actor.role==="advertiser"&&row.advertiserId===actor.accountId;
 if(table==="vehicles"||table==="driverApplications"||table==="settlements")return actor.role==="driver"&&row.driverId===actor.accountId;
 if(table==="notices")return row.recipientId===actor.accountId;
 if(table==="tickets")return row.accountId===actor.accountId;
 return false;
}
export type DemoAction="manageCampaign"|"createCampaign"|"submitCampaign"|"reviewCampaign"|"reserveScreens"|"toggleScreen"|"reviewDriver"|"markNotice"|"resetDemo";
export function canPerform(actor:Actor,action:DemoAction,owner?:string):boolean{
 if(action==="resetDemo"||action==="reviewCampaign"||action==="reviewDriver"||action==="toggleScreen")return actor.role==="admin";
 if(action==="markNotice")return owner===actor.accountId;
 if(action==="manageCampaign"||action==="createCampaign"||action==="submitCampaign"||action==="reserveScreens")return actor.role==="advertiser"&&owner===actor.accountId;
 return false;
}
export function moneyINR(paise:number):string{
 if(!Number.isSafeInteger(paise)||paise<0)throw Error("Invalid paise");
 return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2,minimumFractionDigits:2}).format(paise/100);
}
