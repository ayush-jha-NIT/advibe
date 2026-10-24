import type {Actor,Campaign,DemoDatabase,Screen,Settlement} from "../types/domain";
import {canRead} from "../lib/demo-rules";

export function visibleRecords<K extends keyof DemoDatabase>(db:DemoDatabase,actor:Actor,table:K):DemoDatabase[K]{
 // All rows of one table have the same type, even after filtering.
 return db[table].filter(row=>canRead(actor,table,row)) as DemoDatabase[K];
}
export function campaignScreens(db:DemoDatabase,campaign:Campaign):Screen[]{
 return campaign.screenIds.flatMap(id=>db.screens.find(s=>s.id===id)??[]);
}
export function screenCampaigns(db:DemoDatabase,screenId:string):Campaign[]{
 return db.campaigns.filter(c=>c.screenIds.includes(screenId)&&!["rejected","cancelled"].includes(c.status));
}
export function driverCampaigns(db:DemoDatabase,driverId:string):Campaign[]{
 const ids=new Set(db.screens.filter(s=>s.driverId===driverId).map(s=>s.id));
 return db.campaigns.filter(c=>c.screenIds.some(id=>ids.has(id))&&!["cancelled","rejected"].includes(c.status));
}
export function driverSettlements(db:DemoDatabase,driverId:string):Settlement[]{
 return db.settlements.filter(s=>s.driverId===driverId);
}
export function advertiserSummary(db:DemoDatabase,advertiserId:string){
 const campaigns=db.campaigns.filter(c=>c.advertiserId===advertiserId);
 return {campaigns:campaigns.length,live:campaigns.filter(c=>c.status==="live").length,
  impressions:campaigns.reduce((sum,c)=>sum+c.impressions,0),
  paymentsPaise:db.payments.filter(p=>p.advertiserId===advertiserId&&p.status==="paid").reduce((sum,p)=>sum+p.amountPaise,0)};
}
export function driverSummary(db:DemoDatabase,driverId:string){
 const screens=db.screens.filter(s=>s.driverId===driverId);
 const settlements=driverSettlements(db,driverId);
 return {screens:screens.length,online:screens.filter(s=>s.status==="online").length,
  campaigns:driverCampaigns(db,driverId).length,
  earnedPaise:settlements.reduce((sum,s)=>sum+s.grossPaise,0),
  pendingPaise:settlements.filter(s=>s.status==="pending").reduce((sum,s)=>sum+s.grossPaise-s.deductionsPaise,0)};
}
export function adminSummary(db:DemoDatabase){
 return {campaigns:db.campaigns.length,reviewQueue:db.campaigns.filter(c=>c.status==="submitted"||c.status==="under_review").length,
  screens:db.screens.length,online:db.screens.filter(s=>s.status==="online").length,
  pendingDrivers:db.driverApplications.filter(a=>a.status==="pending"||a.status==="under_review").length,
  confirmedPaymentsPaise:db.payments.filter(p=>p.status==="paid").reduce((sum,p)=>sum+p.amountPaise,0)};
}
