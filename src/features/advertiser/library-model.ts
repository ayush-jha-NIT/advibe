import type {Actor,Creative,DemoDatabase,Placement,ReviewStatus,Screen} from "../../types/domain";

export type FormatGroup="all"|"bike"|"auto"|"car"|"helmet";
export const formatGroups:readonly FormatGroup[]=["all","bike","auto","car","helmet"];
export const creativeFormats=["image","video","gif"] as const;
export type CreativeFormat=(typeof creativeFormats)[number];
export const placements:readonly Placement[]=["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"];
export const formatDescriptions:Record<Placement,{name:string;group:Exclude<FormatGroup,"all">;description:string;best:string}>={
 bike_rear:{name:"Bike Rear Screen",group:"bike",description:"Compact rear-facing screen concept on a bike",best:"Local and commuter routes"},
 auto_rear:{name:"Auto Rear Screen",group:"auto",description:"Rear-facing auto-rickshaw display concept",best:"Street visibility"},
 auto_side:{name:"Auto Side Screen",group:"auto",description:"Side-facing auto-rickshaw screen concept",best:"Roadside awareness"},
 car_rear:{name:"Car Rear Screen",group:"car",description:"Rear-facing car display concept",best:"Following traffic"},
 car_interior:{name:"Car Interior Screen",group:"car",description:"Passenger-facing screen inside an eligible vehicle",best:"In-vehicle audiences"},
 helmet:{name:"Helmet Advertising",group:"helmet",description:"Helmet advertising placement concept",best:"Mobile brand awareness"},
};
export type CreativeDraft={title:string;format:CreativeFormat;placement:Placement};
export function validateCreativeDraft(input:CreativeDraft):CreativeDraft{
 const title=input.title.trim().replace(/\s+/g," ");
 if(title.length<3||title.length>100)throw Error("Creative title must contain 3–100 characters.");
 if(!creativeFormats.includes(input.format))throw Error("Choose PNG/JPG, GIF or MP4 creative metadata.");
 if(!placements.includes(input.placement))throw Error("Choose a supported ad placement.");
 return {...input,title};
}
export function assertCreativeEdit(db:DemoDatabase,actor:Actor,id:string):Creative{
 const creative=db.creatives.find(c=>c.id===id);
 if(!creative||actor.role!=="advertiser"||creative.advertiserId!==actor.accountId)
  throw Error("Creative unavailable for this advertiser.");
 if(creative.approval!=="pending")throw Error("Only pending, unreviewed creative metadata may be edited or deleted.");
 if(db.campaigns.some(c=>c.creativeId===id))
  throw Error("Creative is linked to a campaign. Edit that campaign instead.");
 return creative;
}
export function findOwnedCreative(db:DemoDatabase,accountId:string,id:string):Creative|null{
 return db.creatives.find(c=>c.id===id&&c.advertiserId===accountId)??null;
}
export function filterCreativeLibrary(
 list:readonly Creative[],ownerId:string,filters:{query?:string;placement?:Placement|"all";format?:CreativeFormat|"all";approval?:ReviewStatus|"all"}={}
):Creative[]{
 const q=(filters.query??"").trim().toLowerCase();
 return list.filter(c=>c.advertiserId===ownerId
  &&(!q||[c.title,c.id,c.placement,c.format].some(t=>t.toLowerCase().includes(q)))
  &&(!filters.placement||filters.placement==="all"||c.placement===filters.placement)
  &&(!filters.format||filters.format==="all"||c.format===filters.format)
  &&(!filters.approval||filters.approval==="all"||c.approval===filters.approval))
  .sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
}
export function sampleRate(db:Pick<DemoDatabase,"pricingRules">,placement:Placement,city:string,date:string):number|null{
 const rules=db.pricingRules.filter(r=>r.placement===placement&&r.city===city&&r.active&&r.validFrom<=date&&r.validTo>=date);
 return rules.length===1?rules[0].rupeesPerScreenDay:null;
}
export function displayEligibility(db:DemoDatabase,screen:Screen,start:string,end:string):"eligible"|"offline"|"unverified"|"booked"{
 if(screen.status!=="online")return "offline";
 const vehicle=db.vehicles.find(v=>v.id===screen.vehicleId&&v.driverId===screen.driverId&&v.verification==="approved");
 const application=db.driverApplications.find(a=>a.vehicleId===screen.vehicleId&&a.driverId===screen.driverId&&a.status==="approved");
 if(!vehicle||!application)return "unverified";
 if(db.bookings.some(b=>b.screenId===screen.id&&b.status!=="cancelled"&&start<=b.endDate&&b.startDate<=end))
  return "booked";
 return "eligible";
}
