"use client";

import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {createDemoSeed,DEMO_ACTORS} from "../data/demo-seed";
import {assertCampaignTransition,assertDriverApproval,canGoLive,canPerform,validateBooking,inclusiveDays} from "../lib/demo-rules";
import type {Actor,Campaign,CampaignStatus,DemoDatabase,Screen} from "../types/domain";

export type DemoStore={
 db:DemoDatabase;
 createDraft:(actor:Actor,params:Pick<Campaign,"title"|"creativeId"|"objective"|"startDate"|"endDate">)=>string;
 submitCampaign:(actor:Actor,id:string)=>void;
 reviewCampaign:(actor:Actor,id:string,status:"under_review"|"approved"|"changes_requested"|"rejected")=>void;
 reserveScreens:(actor:Actor,id:string,screenIds:string[])=>void;
 setLive:(actor:Actor,id:string)=>void;
 reviewDriver:(actor:Actor,applicationId:string)=>void;
 setScreenStatus:(actor:Actor,id:string,status:Screen["status"])=>void;
 markNoticeRead:(actor:Actor,id:string)=>void;
 reset:(actor:Actor)=>void;
};
type Persisted={db:DemoDatabase};
const stamp=()=>new Date().toISOString();
const makeId=(prefix:string)=>prefix+"-"+crypto.randomUUID();
function requireAction(actor:Actor,action:Parameters<typeof canPerform>[1],owner?:string){
 if(!canPerform(actor,action,owner))throw Error("Not allowed in this demo role");
}
function audit(db:DemoDatabase,actor:Actor,entity:string,entityId:string,action:string):DemoDatabase{
 return {...db,auditEvents:[...db.auditEvents,{id:makeId("evt"),actorId:actor.accountId,entity,entityId,action,createdAt:stamp()}]};
}
function notice(db:DemoDatabase,recipientId:string,type:DemoDatabase["notices"][number]["type"],title:string,message:string):DemoDatabase{
 return {...db,notices:[{id:makeId("not"),recipientId,type,title,message,createdAt:stamp(),read:false},...db.notices]};
}

export const useDemoStore=create<DemoStore>()(persist<DemoStore,[],[],Persisted>((set,get)=>({
 db:createDemoSeed(),
 createDraft:(actor,params)=>{
  requireAction(actor,"createCampaign",actor.accountId);
  if(!params.title.trim()||params.title.length>120)throw Error("Campaign title must be 1–120 characters");
  // Validates date format, range and order even for drafts.
  inclusiveDays(params.startDate,params.endDate);
  const creative=get().db.creatives.find(c=>c.id===params.creativeId&&c.advertiserId===actor.accountId);
  if(!creative)throw Error("Select a creative owned by this advertiser");
  const id=makeId("cmp");
  set(s=>({db:audit({...s.db,campaigns:[...s.db.campaigns,{
   id,advertiserId:actor.accountId,title:params.title.trim(),creativeId:creative.id,objective:params.objective,
   startDate:params.startDate,endDate:params.endDate,screenIds:[],status:"draft",paymentStatus:"unpaid",
   createdAt:stamp().slice(0,10),impressions:0,
  }]},actor,"campaign",id,"created_draft")}));
  return id;
 },
 submitCampaign:(actor,id)=>set(s=>{
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found");
  requireAction(actor,"submitCampaign",row.advertiserId);
  assertCampaignTransition(row.status,"submitted");
  const updated=audit({...s.db,campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:"submitted"}:c)},actor,"campaign",id,"submitted");
  return {db:notice(updated,DEMO_ACTORS.admin.accountId,"campaign","Campaign awaiting review",row.title+" has been submitted.")};
 }),
 reviewCampaign:(actor,id,status)=>set(s=>{
  requireAction(actor,"reviewCampaign");
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found");
  assertCampaignTransition(row.status,status);
  if(status==="approved"&&!s.db.creatives.some(c=>c.id===row.creativeId&&c.approval==="approved"))
   throw Error("Cannot approve a campaign with unapproved creative");
  const updated=audit({...s.db,campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status}:c)},actor,"campaign",id,status);
  return {db:notice(updated,row.advertiserId,"campaign","Campaign review: "+status.replaceAll("_"," "),row.title+" status changed.")};
 }),
 reserveScreens:(actor,id,screenIds)=>set(s=>{
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found");
  requireAction(actor,"reserveScreens",row.advertiserId);
  if(row.status!=="approved"||row.paymentStatus!=="paid")throw Error("Admin approval and confirmed demo payment required before scheduling");
  validateBooking(s.db,row,screenIds);
  const updated:DemoDatabase={...s.db,
   campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:"scheduled",screenIds:[...screenIds]}:c),
   bookings:[...s.db.bookings,...screenIds.map(screenId=>({id:makeId("bkg"),campaignId:id,screenId,startDate:row.startDate,endDate:row.endDate,status:"confirmed" as const}))]};
  let next=audit(updated,actor,"campaign",id,"scheduled");
  for(const driverId of new Set(screenIds.map(sid=>s.db.screens.find(sc=>sc.id===sid)?.driverId).filter((x):x is string=>Boolean(x)))){
   next=notice(next,driverId,"campaign","New assigned campaign",row.title+" was scheduled for your screen.");
  }
  return {db:next};
 }),
 setLive:(actor,id)=>set(s=>{
  requireAction(actor,"reviewCampaign");
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row||!canGoLive(row,s.db))throw Error("Scheduled campaign must have confirmed screen reservations and payment");
  return {db:audit({...s.db,campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:"live"}:c)},actor,"campaign",id,"live")};
 }),
 reviewDriver:(actor,applicationId)=>set(s=>{
  requireAction(actor,"reviewDriver");
  const application=s.db.driverApplications.find(a=>a.id===applicationId);
  if(!application)throw Error("Application not found");
  assertDriverApproval(application);
  const updated:DemoDatabase={...s.db,driverApplications:s.db.driverApplications.map(a=>a.id===applicationId?{...a,status:"approved"}:a)};
  const logged=audit(updated,actor,"driverApplication",applicationId,"approved");
  return {db:notice(logged,application.driverId,"verification","Driver verification approved","Your demo onboarding was approved.")};
 }),
 setScreenStatus:(actor,id,status)=>set(s=>{
  requireAction(actor,"toggleScreen");
  if(!s.db.screens.some(screen=>screen.id===id))throw Error("Screen not found");
  const updated=audit({...s.db,screens:s.db.screens.map(screen=>screen.id===id?{...screen,status}:screen)},actor,"screen",id,"status_"+status);
  const driverId=s.db.screens.find(x=>x.id===id)!.driverId;
  return {db:notice(updated,driverId,"device","Screen status updated",id+" is now "+status+" in the demo.")};
 }),
 markNoticeRead:(actor,id)=>set(s=>{
  const record=s.db.notices.find(n=>n.id===id);
  if(!record)throw Error("Notification not found");
  requireAction(actor,"markNotice",record.recipientId);
  return {db:{...s.db,notices:s.db.notices.map(n=>n.id===id?{...n,read:true}:n)}};
 }),
 reset:(actor)=>{
  requireAction(actor,"resetDemo");
  set({db:createDemoSeed()});
 },
}),{
 name:"advibe:demo:v1",
 version:1,
 storage:createJSONStorage(()=>localStorage),
 partialize:({db})=>({db}),
 skipHydration:true,
 migrate:()=>({db:createDemoSeed()}),
}));

