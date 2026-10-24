"use client";

import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {createDemoSeed,DEMO_ACTORS} from "../data/demo-seed";
import {assertCampaignTransition,assertDriverApproval,canGoLive,canPerform,validateBooking,inclusiveDays} from "../lib/demo-rules";
import type {Actor,Campaign,CampaignStatus,DemoDatabase,Screen,Creative} from "../types/domain";
import {validateWizardAll,wizardQuote,localToday,type WizardDraft} from "../features/advertiser/wizard-model";
import {assertAdvertiserManagement,type CampaignManagementAction} from "../features/advertiser/campaign-detail-model";
import {assertCreativeEdit,validateCreativeDraft,type CreativeDraft} from "../features/advertiser/library-model";

export type DemoStore={
 db:DemoDatabase;
 createDraft:(actor:Actor,params:Pick<Campaign,"title"|"creativeId"|"objective"|"startDate"|"endDate">)=>string;
 saveWizardDraft:(actor:Actor,draft:WizardDraft)=>string;
 submitWizardDraft:(actor:Actor,draft:WizardDraft)=>string;
 submitCampaign:(actor:Actor,id:string)=>void;
 manageCampaign:(actor:Actor,id:string,action:CampaignManagementAction)=>void;
 createCreativeMetadata:(actor:Actor,input:CreativeDraft)=>string;
 updateCreativeMetadata:(actor:Actor,id:string,input:CreativeDraft)=>void;
 deleteCreativeMetadata:(actor:Actor,id:string)=>void;
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

/** Save an incomplete wizard without claiming a reservation, payment or delivery. */
function upsertWizard(db:DemoDatabase,actor:Actor,draft:WizardDraft,submit:boolean){
 requireAction(actor,"createCampaign",actor.accountId);
 if(actor.accountId==="not-provisioned"||!db.accounts.some(a=>a.id===actor.accountId&&a.role==="advertiser"))
  throw Error("Use the preset advertiser demo identity; new demo signups have no account record");
 if(draft.title.trim().length<3||draft.title.length>120)throw Error("Enter a campaign name of 3–120 characters before saving");
 const prior=draft.campaignId?db.campaigns.find(c=>c.id===draft.campaignId):undefined;
 if(draft.campaignId&&!prior)throw Error("Saved campaign not found");
 if(prior&&(prior.advertiserId!==actor.accountId||!["draft","changes_requested"].includes(prior.status)))
  throw Error("Only your editable draft or changes-requested campaign can be updated");
 let quote:number|undefined;
 if(submit)quote=validateWizardAll(draft,db,actor.accountId,localToday(new Date())).totalPaise;
 else{
  try{quote=wizardQuote(draft,db).totalPaise;}
  catch{quote=undefined;}
 }
 let creatives=[...db.creatives];
 let creativeId=draft.creativeMode==="existing"?draft.creativeId:"";
 if(draft.creativeMode==="existing"&&creativeId){
  const own=creatives.find(c=>c.id===creativeId&&c.advertiserId===actor.accountId&&c.placement===draft.placement);
  if(!own&&submit)throw Error("Choose your own creative for this placement");
  if(!own)creativeId="";
 }else if(draft.creativeMode==="preview"&&draft.creativeTitle.trim()&&draft.placement){
  const old=prior&&creatives.find(c=>c.id===prior.creativeId&&c.advertiserId===actor.accountId&&c.approval==="pending");
  const id=old?.id??makeId("crt");
  const creative:Creative={id,advertiserId:actor.accountId,title:draft.creativeTitle.trim().slice(0,100),
   format:draft.creativeFormat,placement:draft.placement,approval:"pending"};
  creatives=old?creatives.map(c=>c.id===id?creative:c):[...creatives,creative];
  creativeId=id;
 }
 const id=prior?.id??makeId("cmp");
 const base:Campaign={
  id,advertiserId:actor.accountId,title:draft.title.trim(),creativeId,
  objective:draft.objective,startDate:draft.startDate,endDate:draft.endDate,
  screenIds:[], // Never assign or reserve screens from this browser wizard.
  plannedScreenIds:[...draft.selectedScreenIds],quoteEstimatePaise:quote,
  wizardDetails:draft.placement?{
   business:draft.business.trim(),industry:draft.industry.trim(),description:draft.description.trim(),
   format:draft.placement,weekdays:[...draft.weekdays],startTime:draft.startTime,
   endTime:draft.endTime,playsPerDay:draft.playsPerDay,
  }:undefined,
  status:submit?"submitted":"draft",paymentStatus:"unpaid",
  createdAt:prior?.createdAt??stamp().slice(0,10),impressions:prior?.impressions??0,
 };
 let next:DemoDatabase={...db,creatives,
  campaigns:prior?db.campaigns.map(c=>c.id===id?base:c):[...db.campaigns,base]};
 if(submit){
  if(prior)assertCampaignTransition(prior.status,"submitted");
  next=notice(next,DEMO_ACTORS.admin.accountId,"campaign",
   "Campaign awaiting review",base.title+" was submitted from the demo wizard.");
 }
 return {db:audit(next,actor,"campaign",id,submit?"wizard_submitted":"wizard_saved"),id};
}

export const useDemoStore=create<DemoStore>()(persist<DemoStore,[],[],Persisted>((set,get)=>({
 db:createDemoSeed(),
 saveWizardDraft:(actor,draft)=>{
  const {db,id}=upsertWizard(get().db,actor,draft,false);
  set({db});return id;
 },
 submitWizardDraft:(actor,draft)=>{
  const {db,id}=upsertWizard(get().db,actor,draft,true);
  set({db});return id;
 },
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
 createCreativeMetadata:(actor,input)=>{
  requireAction(actor,"createCampaign",actor.accountId);
  if(!get().db.accounts.some(a=>a.id===actor.accountId&&a.role==="advertiser"))
   throw Error("Use the preset Advertiser demo identity to save creative metadata.");
  const clean=validateCreativeDraft(input);
  const id=makeId("crt");
  set(s=>({db:audit({...s.db,creatives:[...s.db.creatives,{
   id,advertiserId:actor.accountId,title:clean.title,format:clean.format,
   placement:clean.placement,approval:"pending" as const
  }]},actor,"creative",id,"metadata_created")}));
  return id;
 },
 updateCreativeMetadata:(actor,id,input)=>set(s=>{
  assertCreativeEdit(s.db,actor,id);
  const clean=validateCreativeDraft(input);
  return {db:audit({...s.db,creatives:s.db.creatives.map(c=>c.id===id
   ?{...c,title:clean.title,format:clean.format,placement:clean.placement}:c)},actor,"creative",id,"metadata_updated")};
 }),
 deleteCreativeMetadata:(actor,id)=>set(s=>{
  assertCreativeEdit(s.db,actor,id);
  return {db:audit({...s.db,creatives:s.db.creatives.filter(c=>c.id!==id)},actor,"creative",id,"metadata_deleted")};
 }),
 submitCampaign:(actor,id)=>set(s=>{
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found");
  requireAction(actor,"submitCampaign",row.advertiserId);
  assertCampaignTransition(row.status,"submitted");
  const updated=audit({...s.db,campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:"submitted"}:c)},actor,"campaign",id,"submitted");
  return {db:notice(updated,DEMO_ACTORS.admin.accountId,"campaign","Campaign awaiting review",row.title+" has been submitted.")};
 }),
 manageCampaign:(actor,id,action)=>set(s=>{
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found");
  requireAction(actor,"manageCampaign",row.advertiserId);
  assertAdvertiserManagement(s.db,actor,row,action);
  const nextStatus=action==="pause"?"paused":action==="resume"?"live":"cancelled";
  const affected=s.db.bookings.filter(b=>b.campaignId===id&&b.status!=="cancelled");
  const changed:DemoDatabase={...s.db,
   campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:nextStatus}:c),
   bookings:action==="cancel"?s.db.bookings.map(b=>b.campaignId===id?{...b,status:"cancelled" as const}:b):s.db.bookings,
  };
  let updated=audit(changed,actor,"campaign",id,action==="resume"?"resumed":nextStatus);
  updated=notice(updated,actor.accountId,"campaign",
   "Demo campaign "+nextStatus,row.title+" status changed to "+nextStatus+". No real device commands or payment transactions were sent.");
  if(action==="cancel"&&affected.length){
   const affectedDrivers=new Set(affected.map(b=>s.db.screens.find(sc=>sc.id===b.screenId)?.driverId).filter((x):x is string=>Boolean(x)));
   for(const driverId of affectedDrivers){
    updated=notice(updated,driverId,"campaign","Demo booking cancelled",
     row.title+" demo booking was cancelled. This does not change physical devices.");
   }
  }
  return {db:updated};
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

