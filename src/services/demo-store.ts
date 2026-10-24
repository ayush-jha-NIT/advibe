"use client";

import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {createDemoSeed,DEMO_ACTORS} from "../data/demo-seed";
import {assertCampaignTransition,assertDriverApproval,canGoLive,canPerform,validateBooking,inclusiveDays} from "../lib/demo-rules";
import type {Actor,Campaign,CampaignStatus,DemoDatabase,Screen,Creative} from "../types/domain";
import {validateWizardAll,wizardQuote,localToday,type WizardDraft} from "../features/advertiser/wizard-model";
import {assertAdvertiserManagement,type CampaignManagementAction} from "../features/advertiser/campaign-detail-model";
import {assertCreativeEdit,validateCreativeDraft,type CreativeDraft} from "../features/advertiser/library-model";
import {validateAccountProfile,validateTicketDraft,type AccountProfileDraft,type TicketDraft} from "../features/advertiser/account-model";
import {validateDriverSubmission,type DriverDraft} from "../features/driver/onboarding-model";
import {assertDemoAdmin,assertCreativeMetadataReview} from "../features/admin/admin-rules";
import {validatePricingUpdate,validateSettlementTransition} from "../features/admin/admin-finance-rules";
import {assertProvisionedDriver,validateDriverIssue,validateDriverSupport,type DriverIssueDraft,type DriverSupportDraft} from "../features/driver/service-model";

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
 reviewCreative:(actor:Actor,id:string,status:"approved"|"rejected")=>void;
 reserveScreens:(actor:Actor,id:string,screenIds:string[])=>void;
 setLive:(actor:Actor,id:string)=>void;
 submitDriverPreview:(actor:Actor,draft:DriverDraft)=>string;
 reviewDriver:(actor:Actor,applicationId:string)=>void;
 updateDriverReview:(actor:Actor,id:string,patch:Partial<Pick<DemoDatabase["driverApplications"][number],"completedSteps"|"documentsStatus"|"screenSetupStatus">>)=>void;
 adminUpdateRate:(actor:Actor,id:string,patch:Pick<DemoDatabase["pricingRules"][number],"rupeesPerScreenDay"|"active"|"validFrom"|"validTo">)=>void;
 adminMarkSettlement:(actor:Actor,id:string,status:"processed"|"failed")=>void;
 adminScheduleCampaign:(actor:Actor,id:string,screenIds:string[])=>void;
 setScreenStatus:(actor:Actor,id:string,status:Screen["status"])=>void;
 markNoticeRead:(actor:Actor,id:string)=>void;
 markAllNoticesRead:(actor:Actor)=>void;
 updateAdvertiserProfile:(actor:Actor,input:AccountProfileDraft)=>void;
 createAdvertiserTicket:(actor:Actor,input:TicketDraft)=>string;
 createDriverMaintenance:(actor:Actor,input:DriverIssueDraft)=>string;
 createDriverSupport:(actor:Actor,input:DriverSupportDraft)=>string;
 markDriverNoticesRead:(actor:Actor)=>void;
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
 reviewCreative:(actor,id,status)=>set(s=>{
  requireAction(actor,"reviewCampaign");
  const creative=s.db.creatives.find(c=>c.id===id);
  assertCreativeMetadataReview(actor,creative,status);
  let updated=audit({...s.db,creatives:s.db.creatives.map(c=>c.id===id?{...c,approval:status}:c)},actor,"creative",id,"review_"+status);
  updated=notice(updated,creative.advertiserId,"campaign","Creative demo review "+status,creative.title+" metadata marked "+status+". No uploaded media was reviewed.");
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
 submitDriverPreview:(actor,draft)=>{
  if(actor.role!=="driver"||actor.accountId==="not-provisioned"||
     !get().db.accounts.some(a=>a.id===actor.accountId&&a.role==="driver"))
   throw Error("Only a provisioned demo driver can submit an onboarding preview.");
  const db=get().db;
  validateDriverSubmission(draft,(db.driverPreviewApplications??[]).some(a=>a.driverId===actor.accountId),new Date().getFullYear());
  const id=makeId("preview"),now=stamp();
  set(s=>{
   if((s.db.driverPreviewApplications??[]).some(a=>a.driverId===actor.accountId))
    throw Error("Your demo onboarding request has already been submitted.");
   const next:DemoDatabase={...s.db,driverPreviewApplications:[...(s.db.driverPreviewApplications??[]),{
    id,driverId:actor.accountId,submittedAt:now,status:"submitted" as const,
    alias:draft.displayAlias.trim(),city:draft.city.trim(),vehicleType:draft.vehicleType,
    vehicleModel:draft.vehicleModel.trim(),screenChoice:draft.screenChoice,payoutFrequency:draft.payoutFrequency
   }]};
   let updated=audit(next,actor,"driverPreviewApplication",id,"demo_submitted");
   updated=notice(updated,DEMO_ACTORS.admin.accountId,"verification","New driver onboarding preview",
    "A fictional driver onboarding review request was submitted. No KYC files, bank credentials, or physical pairing were provided.");
   return {db:notice(updated,actor.accountId,"verification","Demo onboarding request submitted",
    "Your sample request was saved for future Admin preview review. Your existing driver and vehicle approvals are unchanged.")};
  });
  return id;
 },
 adminScheduleCampaign:(actor,id,screenIds)=>set(s=>{
  assertDemoAdmin(actor);
  const row=s.db.campaigns.find(c=>c.id===id);
  if(!row)throw Error("Campaign not found.");
  if(row.status!=="approved"||row.paymentStatus!=="paid")throw Error("A demo campaign must be approved and paid before scheduling.");
  validateBooking(s.db,row,screenIds);
  const db:DemoDatabase={...s.db,
   campaigns:s.db.campaigns.map(c=>c.id===id?{...c,status:"scheduled",screenIds:[...screenIds]}:c),
   bookings:[...s.db.bookings,...screenIds.map(screenId=>({id:makeId("bkg"),campaignId:id,screenId,startDate:row.startDate,endDate:row.endDate,status:"confirmed" as const}))]
  };
  let next=audit(db,actor,"campaign",id,"demo_admin_scheduled");
  next=notice(next,row.advertiserId,"campaign","Demo campaign scheduled",row.title+" was scheduled on confirmed fictional screens.");
  for(const driverId of new Set(screenIds.map(screenId=>s.db.screens.find(sc=>sc.id===screenId)?.driverId).filter((id):id is string=>Boolean(id))))
   next=notice(next,driverId,"campaign","Demo campaign assigned",row.title+" added to your fictional confirmed bookings.");
  return {db:next};
 }),
 adminUpdateRate:(actor,id,patch)=>set(s=>{
  const next=validatePricingUpdate(s.db,actor,id,patch);
  return {db:audit({...s.db,pricingRules:s.db.pricingRules.map(r=>r.id===id?next:r)},actor,"pricingRule",id,"demo_rate_updated")};
 }),
 adminMarkSettlement:(actor,id,status)=>set(s=>{
  const row=validateSettlementTransition(s.db,actor,id,status);
  let next=audit({...s.db,settlements:s.db.settlements.map(r=>r.id===id?{...r,status}:r)},actor,"settlement",id,"demo_"+status);
  next=notice(next,row.driverId,"settlement","Demo settlement marked "+status,
   "Fictional settlement "+id+" was marked "+status+". No bank payout or provider API request occurred.");
  return {db:next};
 }),
 updateDriverReview:(actor,id,patch)=>set(s=>{
  requireAction(actor,"reviewDriver");
  const app=s.db.driverApplications.find(a=>a.id===id);
  if(!app)throw Error("Driver application not found");
  if(app.status==="approved"||app.status==="rejected")throw Error("Finalized applications cannot be altered.");
  if(patch.completedSteps!==undefined&&(!Number.isInteger(patch.completedSteps)||patch.completedSteps<0||patch.completedSteps>5))
   throw Error("Sample step completion must be an integer from 0 to 5.");
  const allowed=["pending","under_review","approved","rejected"];
  if(patch.documentsStatus!==undefined&&!allowed.includes(patch.documentsStatus))throw Error("Invalid document review flag.");
  if(patch.screenSetupStatus!==undefined&&!allowed.includes(patch.screenSetupStatus))throw Error("Invalid device setup review flag.");
  if(!Object.keys(patch).length)throw Error("Choose a demo review change.");
  const next=audit({...s.db,driverApplications:s.db.driverApplications.map(a=>a.id===id?{...a,...patch}:a)},actor,"driverApplication",id,"demo_checklist_updated");
  return {db:notice(next,app.driverId,"verification","Demo driver checklist updated","Example onboarding review markers were updated. No identity files or devices were verified.")};
 }),
 reviewDriver:(actor,applicationId)=>set(s=>{
  requireAction(actor,"reviewDriver");
  const application=s.db.driverApplications.find(a=>a.id===applicationId);
  if(!application)throw Error("Application not found");
  assertDriverApproval(application);
  const updated:DemoDatabase={...s.db,driverApplications:s.db.driverApplications.map(a=>a.id===applicationId?{...a,status:"approved"}:a),vehicles:s.db.vehicles.map(v=>v.id===application.vehicleId&&v.driverId===application.driverId?{...v,verification:"approved" as const}:v)};
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
 markAllNoticesRead:(actor)=>set(s=>{
  if(actor.role!=="advertiser"||!s.db.accounts.some(a=>a.id===actor.accountId&&a.role==="advertiser"))
   throw Error("Advertiser account not available");
  return {db:{...s.db,notices:s.db.notices.map(n=>n.recipientId===actor.accountId?{...n,read:true}:n)}};
 }),
 updateAdvertiserProfile:(actor,input)=>set(s=>{
  if(actor.role!=="advertiser"||!s.db.accounts.some(a=>a.id===actor.accountId&&a.role==="advertiser"))
   throw Error("Advertiser account not available");
  const valid=validateAccountProfile(input);
  const updated={...s.db,accounts:s.db.accounts.map(a=>a.id===actor.accountId
   ?{...a,name:valid.name,business:valid.business,city:valid.city}:a)};
  return {db:audit(updated,actor,"account",actor.accountId,"demo_profile_updated")};
 }),
 createAdvertiserTicket:(actor,input)=>{
  const valid=validateTicketDraft(get().db,actor,input);
  const id=makeId("tkt"),date=stamp().slice(0,10);
  set(s=>{
   const updated={...s.db,tickets:[...s.db.tickets,{
    id,accountId:actor.accountId,subject:valid.subject,description:valid.description,
    category:valid.category,campaignId:valid.campaignId||undefined,status:"open" as const,createdAt:date
   }]};
   let next=audit(updated,actor,"ticket",id,"demo_support_created");
   next=notice(next,DEMO_ACTORS.admin.accountId,"support","Demo support ticket submitted",valid.subject+" (demo, no helpdesk connected).");
   return {db:next};
  });
  return id;
 },
 createDriverMaintenance:(actor,input)=>{
  const valid=validateDriverIssue(get().db,actor,input);
  const id=makeId("maint"),today=stamp().slice(0,10);
  set(s=>{
   // Validate again against the current database before mutation.
   validateDriverIssue(s.db,actor,valid);
   let next:DemoDatabase={...s.db,tickets:[...s.db.tickets,{
    id,accountId:actor.accountId,subject:valid.subject,
    description:valid.description,category:"technical" as const,
    screenId:valid.screenId,maintenanceCategory:valid.category,
    status:"open" as const,createdAt:today
   }]};
   next=audit(next,actor,"ticket",id,"demo_maintenance_reported");
   next=notice(next,DEMO_ACTORS.admin.accountId,"device","Driver demo maintenance report",valid.screenId+": "+valid.subject+" (fictional report).");
   return {db:notice(next,actor.accountId,"support","Demo issue report saved","Your fictional issue report "+id+" was saved locally. No technician was dispatched.")};
  });
  return id;
 },
 createDriverSupport:(actor,input)=>{
  const valid=validateDriverSupport(get().db,actor,input);
  const id=makeId("tkt"),today=stamp().slice(0,10);
  set(s=>{
   validateDriverSupport(s.db,actor,valid);
   let next:DemoDatabase={...s.db,tickets:[...s.db.tickets,{
    id,accountId:actor.accountId,subject:valid.subject,description:valid.description,
    category:valid.category,status:"open" as const,createdAt:today
   }]};
   next=audit(next,actor,"ticket",id,"demo_driver_support");
   next=notice(next,DEMO_ACTORS.admin.accountId,"support","Driver demo support request",valid.subject+" (fictional helpdesk entry).");
   return {db:notice(next,actor.accountId,"support","Demo support request saved","Your fictional support request "+id+" was saved locally. No external helpdesk was contacted.")};
  });
  return id;
 },
 markDriverNoticesRead:(actor)=>set(s=>{
  assertProvisionedDriver(s.db,actor);
  return {db:{...s.db,notices:s.db.notices.map(n=>n.recipientId===actor.accountId?{...n,read:true}:n)}};
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

