import type {Booking,Campaign,Creative,DemoDatabase,Location,Screen,Vehicle} from "../../types/domain";

/** All derived values are fictional sample records, never device telemetry. */
export type DriverAssignment={
 booking:Booking;campaign:Campaign;screen:Screen;creative:Creative|null;
 location:Location|null;vehicle:Vehicle|null;
};
export type DriverCampaignRow={campaign:Campaign;assignments:DriverAssignment[]};
export function ownedDriverScreens(db:DemoDatabase,driverId:string):Screen[]{
 const ownedVehicles=new Set(db.vehicles.filter(v=>v.driverId===driverId).map(v=>v.id));
 return db.screens.filter(s=>s.driverId===driverId&&ownedVehicles.has(s.vehicleId))
  .sort((a,b)=>a.id.localeCompare(b.id));
}
export function ownedDriverVehicles(db:DemoDatabase,driverId:string):Vehicle[]{
 return db.vehicles.filter(v=>v.driverId===driverId).sort((a,b)=>a.id.localeCompare(b.id));
}
export function driverAssignments(db:DemoDatabase,driverId:string):DriverAssignment[]{
 const screens=new Map(ownedDriverScreens(db,driverId).map(s=>[s.id,s]));
 const campaigns=new Map(db.campaigns.filter(c=>!["draft","submitted","under_review","changes_requested","rejected","cancelled"].includes(c.status)).map(c=>[c.id,c]));
 const vehicles=new Map(ownedDriverVehicles(db,driverId).map(v=>[v.id,v]));
 return db.bookings.flatMap(booking=>{
  if(booking.status!=="confirmed")return [];
  const screen=screens.get(booking.screenId),campaign=campaigns.get(booking.campaignId);
  if(!screen||!campaign||!campaign.screenIds.includes(screen.id))return [];
  const creative=db.creatives.find(c=>c.id===campaign.creativeId&&c.advertiserId===campaign.advertiserId&&c.placement===screen.placement)??null;
  return [{booking,campaign,screen,creative,location:db.locations.find(l=>l.id===screen.locationId)??null,vehicle:vehicles.get(screen.vehicleId)??null}];
 }).sort((a,b)=>a.booking.startDate.localeCompare(b.booking.startDate)||a.campaign.id.localeCompare(b.campaign.id)||a.screen.id.localeCompare(b.screen.id));
}
export function driverCampaignRows(rows:readonly DriverAssignment[]):DriverCampaignRow[]{
 const byId=new Map<string,DriverCampaignRow>();
 for(const item of rows){
  let row=byId.get(item.campaign.id);
  if(!row){row={campaign:item.campaign,assignments:[]};byId.set(item.campaign.id,row);}
  row.assignments.push(item);
 }
 return [...byId.values()].sort((a,b)=>b.campaign.startDate.localeCompare(a.campaign.startDate)||a.campaign.id.localeCompare(b.campaign.id));
}
export function isISODate(day:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const date=new Date(day+"T00:00:00Z");
 return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===day;
}
export function dateInIndia(now:Date):string{
 const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const get=(type:string)=>p.find(x=>x.type===type)?.value??"";
 return get("year")+"-"+get("month")+"-"+get("day");
}
export function moveDay(day:string,delta:number):string{
 if(!isISODate(day)||!Number.isInteger(delta)||Math.abs(delta)>366)throw Error("Invalid schedule date");
 return new Date(Date.parse(day+"T00:00:00Z")+delta*86400000).toISOString().slice(0,10);
}
export function applicableDays(campaign:Campaign,date:string):boolean{
 if(!isISODate(date))return false;
 const weekdays=campaign.wizardDetails?.weekdays;
 return !weekdays||weekdays.includes(new Date(date+"T00:00:00Z").getUTCDay());
}
export function driverDailySchedule(rows:readonly DriverAssignment[],date:string):DriverAssignment[]{
 if(!isISODate(date))return [];
 return rows.filter(({booking,campaign})=>["live","scheduled"].includes(campaign.status)
  &&date>=booking.startDate&&date<=booking.endDate
  &&date>=campaign.startDate&&date<=campaign.endDate&&applicableDays(campaign,date))
  .sort((a,b)=>(a.campaign.wizardDetails?.startTime??"").localeCompare(b.campaign.wizardDetails?.startTime??"")
   ||a.screen.id.localeCompare(b.screen.id));
}
export function driverOperationsSummary(db:DemoDatabase,driverId:string,date:string){
 const screens=ownedDriverScreens(db,driverId);
 const assignments=driverAssignments(db,driverId);
 const schedule=driverDailySchedule(assignments,date);
 const campaigns=driverCampaignRows(assignments);
 const notices=db.notices.filter(n=>n.recipientId===driverId);
 const settlements=db.settlements.filter(s=>s.driverId===driverId);
 return {
  vehicles:ownedDriverVehicles(db,driverId).length,
  screens:screens.length,onlineScreens:screens.filter(s=>s.status==="online").length,
  activeCampaigns:campaigns.filter(c=>c.campaign.status==="live").length,
  todayAssignments:schedule.length,
  unreadNotices:notices.filter(n=>!n.read).length,
  pendingPaise:settlements.filter(s=>s.status==="pending").reduce((t,s)=>t+Math.max(0,s.grossPaise-s.deductionsPaise),0)
 };
}
export function filteredDriverCampaigns(rows:readonly DriverCampaignRow[],query:string,status:string):DriverCampaignRow[]{
 const q=query.trim().toLowerCase();
 return rows.filter(({campaign,assignments})=>
  (status==="all"||campaign.status===status)&&
  (!q||[campaign.title,campaign.id,...assignments.flatMap(a=>[a.screen.id,a.creative?.title??"",a.location?.name??""])]
   .some(v=>v.toLowerCase().includes(q))));
}
