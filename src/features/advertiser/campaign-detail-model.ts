import type {Actor,AuditEvent,Booking,Campaign,Creative,DemoDatabase,Payment,Screen} from "../../types/domain";
import {assertCampaignTransition} from "../../lib/demo-rules.ts";

export type CampaignManagementAction="pause"|"resume"|"cancel";
export const lifecycleLabels:Record<CampaignManagementAction,string>={
 pause:"Pause campaign",resume:"Resume campaign",cancel:"Cancel campaign"
};

/** Owner-filtering is only a demo display filter, never authorization. */
export function ownCampaign(db:DemoDatabase,advertiserId:string,campaignId:string):Campaign|null{
 return db.campaigns.find(x=>x.id===campaignId&&x.advertiserId===advertiserId)??null;
}
export function campaignCreative(db:DemoDatabase,c:Campaign):Creative|null{
 return db.creatives.find(x=>x.id===c.creativeId&&x.advertiserId===c.advertiserId)??null;
}
export function campaignScreens(db:DemoDatabase,c:Campaign):{
 screen:Screen;planned:boolean;location:DemoDatabase["locations"][number]|null;booking:Booking|null
}[]{
 const ids=[...new Set([...c.screenIds,...(c.plannedScreenIds??[])])];
 return ids.flatMap(id=>{
  const screen=db.screens.find(x=>x.id===id);
  if(!screen)return [];
  return [{screen,planned:!c.screenIds.includes(id),location:db.locations.find(x=>x.id===screen.locationId)??null,
   booking:db.bookings.find(b=>b.campaignId===c.id&&b.screenId===id&&b.status!=="cancelled")??null}];
 });
}
export function campaignPayments(db:DemoDatabase,c:Campaign):Payment[]{
 return db.payments.filter(p=>p.campaignId===c.id&&p.advertiserId===c.advertiserId);
}
export function visibleCampaignEvents(db:DemoDatabase,c:Campaign):AuditEvent[]{
 return db.auditEvents.filter(e=>e.entity==="campaign"&&e.entityId===c.id)
  .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function displayAuditAction(action:string):string{
 const known:Record<string,string>={
  wizard_saved:"Wizard draft saved",wizard_submitted:"Submitted from campaign wizard",created_draft:"Initial draft created",
  submitted:"Submitted for Admin review",under_review:"Admin review started",
  approved:"Approved by demo Admin",changes_requested:"Admin requested changes",rejected:"Rejected in demo review",
  scheduled:"Screens scheduled by demo Admin",live:"Marked live in demo",
  paused:"Paused in browser demo",resumed:"Resumed in browser demo",
  cancelled:"Cancelled in browser demo"
 };
 return known[action]??action.replaceAll("_"," ");
}
/** Keep permissions narrower than the raw status transition map. */
export function assertAdvertiserManagement(
 db:DemoDatabase,actor:Actor,campaign:Campaign,action:CampaignManagementAction
):void{
 if(actor.role!=="advertiser"||actor.accountId!==campaign.advertiserId)
  throw Error("Only the owning advertiser can manage this campaign");
 if(action==="pause"){
  assertCampaignTransition(campaign.status,"paused");
 }else if(action==="resume"){
  assertCampaignTransition(campaign.status,"live");
  if(campaign.paymentStatus!=="paid"||!campaign.screenIds.length||
   !campaign.screenIds.every(screenId=>db.bookings.some(b=>b.campaignId===campaign.id&&b.screenId===screenId&&b.status==="confirmed")))
   throw Error("Cannot resume without confirmed demo payment and reserved screens");
 }else{
  if(!["draft","submitted","changes_requested","approved","scheduled","paused"].includes(campaign.status))
   throw Error("This campaign cannot be cancelled by its advertiser");
  assertCampaignTransition(campaign.status,"cancelled");
 }
}
export function allowedAdvertiserActions(db:DemoDatabase,c:Campaign):CampaignManagementAction[]{
 const actor:Actor={role:"advertiser",accountId:c.advertiserId};
 return (["pause","resume","cancel"] as const).filter(action=>{
  try{assertAdvertiserManagement(db,actor,c,action);return true;}catch{return false;}
 });
}
export function actionWarning(action:CampaignManagementAction,c:Campaign):string{
 if(action==="pause")return "This changes only a browser-local campaign status. No connected vehicle, device or ad playback is stopped.";
 if(action==="resume")return "This marks the demo record live again; it does not restart any physical display or initiate a payment.";
 return c.paymentStatus==="paid"
  ?"This cancels the demo campaign and any demo bookings. A payment marked paid stays paid; no Cashfree refund or real-world cancellation occurs."
  :"This cancels the demo campaign and any demo bookings. No real reservation, payment or physical device is affected.";
}
