"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowLeft,ArrowRight,Check,ChevronLeft,ChevronRight,FileCheck2,Save,ShieldAlert,Trash2} from "lucide-react";
import {Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {useWizardStore} from "@/services/wizard-store";
import {useAdvertiserData} from "./shared";
import {defaultWizardDraft,localToday,validateWizardStep,type WizardDraft} from "./wizard-model";
import {StepBasics,StepCreative,StepFormats,StepLocations,StepReview,StepSchedule} from "./wizard-steps";
const headings=[
 {title:"Campaign Details",description:"Tell us about your business, objective and campaign."},
 {title:"Choose Your Ad Format",description:"Select the vehicle and display placement."},
 {title:"Upload Ad Creative",description:"Choose a saved creative or preview a new one."},
 {title:"Target Locations",description:"Explore sample screen inventory and select targets."},
 {title:"Schedule Campaign",description:"Set dates, delivery days, hours and requested plays."},
 {title:"Review & Submit",description:"Review the estimated price and send for demo approval."},
] as const;
function stepFromParam(value:string|null){const n=Number(value??"1");return Number.isInteger(n)&&n>=1&&n<=6?n:1;}
export function CampaignWizard(){
 const router=useRouter(),params=useSearchParams();
 const {db,accountId,hydrated}=useAdvertiserData();
 const [wizardReady,setWizardReady]=React.useState(false);
 const [feedback,setFeedback]=React.useState(""),[error,setError]=React.useState("");
 const errorRef=React.useRef<HTMLParagraphElement>(null);
 React.useEffect(()=>{
  if(!error)return;
  const frame=window.requestAnimationFrame(()=>errorRef.current?.focus());
  return ()=>window.cancelAnimationFrame(frame);
 },[error]);
 const [upload,setUpload]=React.useState<File|null>(null);
 const [saving,setSaving]=React.useState(false);
 const draft=useWizardStore(s=>s.drafts[accountId]??defaultWizardDraft);
 const patch=React.useCallback((p:Partial<WizardDraft>)=>useWizardStore.getState().update(accountId,p),[accountId]);
 const requested=stepFromParam(params.get("step"));
 const campaignQuery=params.get("campaign");
 React.useEffect(()=>{
  let active=true;
  void Promise.resolve(useWizardStore.persist.rehydrate()).then(()=>{if(active)setWizardReady(true);});
  return ()=>{active=false;};
 },[]);
 React.useEffect(()=>{
  if(!hydrated||!wizardReady||!campaignQuery||accountId==="not-provisioned")return;
  if(useWizardStore.getState().drafts[accountId]?.campaignId===campaignQuery)return;
  const c=db.campaigns.find(c=>c.id===campaignQuery&&c.advertiserId===accountId&&["draft","changes_requested"].includes(c.status));
  if(!c)return;
  const creative=db.creatives.find(x=>x.id===c.creativeId&&x.advertiserId===accountId);
  const previous=useWizardStore.getState().drafts[accountId];
  useWizardStore.getState().replace(accountId,{
   ...defaultWizardDraft,
   campaignId:c.id,title:c.title,business:c.wizardDetails?.business??db.accounts.find(a=>a.id===accountId)?.business??"",
   industry:c.wizardDetails?.industry??"",description:c.wizardDetails?.description??"",objective:c.objective,
   placement:c.wizardDetails?.format??creative?.placement??null,
   creativeMode:creative?.approval==="pending"?"preview":"existing",
   creativeId:creative?.approval==="pending"?"":c.creativeId,
   creativeTitle:creative?.approval==="pending"?creative.title:"",
   creativeFormat:creative?.format??"image",selectedScreenIds:c.plannedScreenIds??[],
   startDate:c.startDate,endDate:c.endDate,weekdays:c.wizardDetails?.weekdays??[0,1,2,3,4,5,6],
   startTime:c.wizardDetails?.startTime??"08:00",endTime:c.wizardDetails?.endTime??"22:00",
   playsPerDay:c.wizardDetails?.playsPerDay??40,budgetCapRupees:previous?.campaignId===campaignQuery?previous.budgetCapRupees:"",agreed:false,
  });
 },[hydrated,wizardReady,campaignQuery,accountId,db]);
 let unlocked=1;
 if(hydrated&&wizardReady){
  for(let i=1;i<=5;i++){
   try{validateWizardStep(i,draft,db,accountId);unlocked=i+1;}
   catch{break;}
  }
 }
 const step=Math.min(requested,unlocked);
 const current=headings[step-1];
 const draftEditable=accountId!=="not-provisioned";
 function go(number:number){
  setError("");setFeedback("");
  router.replace("/advertiser/create-campaign?step="+number,{scroll:false});
  window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
 }
 function next(){
  try{validateWizardStep(step,draft,db,accountId,localToday(new Date()));go(Math.min(6,step+1));}
  catch(e){setError(e instanceof Error?e.message:"Please complete this step");}
 }
 function save(){
  if(!draftEditable){setError("Use the preset Advertiser demo login to save records. A new demo signup has no provisioned campaign account.");return;}
  setSaving(true);setError("");setFeedback("");
  try{
   const id=useDemoStore.getState().saveWizardDraft({role:"advertiser",accountId},draft);
   patch({campaignId:id});
   setFeedback("Saved as draft "+id+". You can resume after refreshing this browser.");
  }catch(e){setError(e instanceof Error?e.message:"Draft could not be saved");}
  finally{setSaving(false);}
 }
 function submit(){
  if(!draftEditable){setError("Use the preset Advertiser demo login to submit demo campaigns.");return;}
  setSaving(true);setError("");setFeedback("");
  try{
   // Also checked atomically by the shared store before writing.
   const id=useDemoStore.getState().submitWizardDraft({role:"advertiser",accountId},draft);
   useWizardStore.getState().clear(accountId);
   router.replace("/advertiser/campaigns?search="+encodeURIComponent(id));
  }catch(e){setError(e instanceof Error?e.message:"Review submission failed");}
  finally{setSaving(false);}
 }
 if(!hydrated||!wizardReady)return <div role="status" className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">Loading your campaign draft…</div>;
 const shared={draft,patch,db,owner:accountId};
 return <div className="mx-auto max-w-7xl space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-[.17em] text-brand-blue">Advertiser · Campaign creation · Demo</p>
    <h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Create New Campaign</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Complete six steps to prepare your campaign. No payment, ad delivery or real reservation is made.</p></div>
   <Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue hover:underline"><ArrowLeft className="size-4"/>My Campaigns</Link>
  </div>
  {accountId==="not-provisioned"&&<div className="rounded-xl border border-[#f3ddaf] bg-[#fff8e9] px-4 py-3 text-sm text-[#855627]" role="note">This newly registered frontend identity is not a provisioned database account. You can explore the wizard, but saving and submission require the preset Advertiser demo login.</div>}
  <div className="rounded-xl border border-[#d5e4f7] bg-[#eff6ff] px-4 py-3 text-xs leading-6 text-[#476488]"><ShieldAlert className="mr-1 inline size-4 align-text-bottom text-brand-blue"/>Fictional inventory and illustrative rupee rates. Creative files stay on your device. Cashfree orders, real bookings and approvals require backend integrations.</div>
  <div className="rounded-2xl border border-[#deebfa] bg-white p-3 sm:hidden">
   <div className="mb-3 flex items-center justify-between gap-2 text-xs font-bold text-brand-navy"><span>Step {step} of 6</span><span>{Math.round(step/6*100)}% of wizard</span></div>
   <div role="progressbar" aria-label="Wizard step progress" aria-valuenow={step} aria-valuemin={1} aria-valuemax={6} className="mb-3 h-2 overflow-hidden rounded-full bg-[#e3ebf9]"><div className="h-full rounded-full bg-brand-blue transition-[width]" style={{width:Math.round(step/6*100)+"%"}}/></div>
   <label className="block text-xs font-semibold text-[#466285]">Go to available step<select aria-label="Jump to available step" className="mt-1 min-h-11 w-full rounded-lg border border-[#cbdcf1] bg-white px-3 text-sm text-brand-navy" value={step} onChange={e=>go(Number(e.target.value))}>
    {headings.map((h,i)=><option key={h.title} value={i+1} disabled={i+1>unlocked}>{i+1}. {h.title}{i+1>unlocked?" · Locked":""}</option>)}
   </select></label>
  </div>
  <nav aria-label="Campaign creation steps" className="hidden overflow-x-auto rounded-2xl border border-[#deebfa] bg-white p-3 sm:block sm:p-4" tabIndex={0}>
   <ol className="flex min-w-[680px] items-start justify-between gap-1">{headings.map((item,i)=>{
    const number=i+1,active=number===step,done=number<step,available=number<=unlocked;
    return <li key={item.title} className="min-w-0 flex-1"><button type="button" disabled={!available} aria-current={active?"step":undefined}
     onClick={()=>go(number)} className={"flex min-h-16 w-full flex-col items-center justify-start gap-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition "+
      (active?"bg-[#eaf2ff] text-brand-blue":done?"text-[#11845d]":available?"text-[#536987] hover:bg-[#f6f9ff]":"text-[#a3b1c4]")}>
     <span className={"grid size-8 place-items-center rounded-full border font-bold "+(active?"border-brand-blue bg-brand-blue text-white":done?"border-[#1bad75] bg-[#def8ed] text-[#13895c]":"border-[#c8d7eb] bg-white")}>{done?<Check className="size-4" aria-hidden/>:number}</span>
     <span className="leading-4">{item.title}</span>
    </button></li>;
   })}</ol>
  </nav>
  <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.7fr)]">
   <Card className="min-w-0"><CardHeader><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-blue">Step {step} of 6</p><CardTitle className="mt-1 text-xl">{current.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{current.description}</p></div><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e9f3ff] text-lg font-black text-brand-blue">{step}/6</span></div></CardHeader>
    <CardContent className="space-y-5">
     {step===1&&<StepBasics {...shared}/>}
     {step===2&&<StepFormats {...shared}/>}
     {step===3&&<StepCreative {...shared} upload={upload} onUpload={setUpload}/>}
     {step===4&&<StepLocations {...shared}/>}
     {step===5&&<StepSchedule draft={draft} patch={patch}/>}
     {step===6&&<StepReview {...shared}/>}
     {error&&<p role="alert" ref={errorRef} tabIndex={-1} className="rounded-xl border border-[#ffc9c9] bg-[#fff0f2] p-3 text-sm text-[#b3263e] outline-none focus:ring-2 focus:ring-[#ec6b77]">{error}</p>}
     {feedback&&<p role="status" className="rounded-xl border border-[#bde0ce] bg-[#f0faf5] p-3 text-sm text-[#196940]">{feedback}</p>}
     <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ebf8] bg-white/95 px-4 py-3 shadow-[0_-8px_25px_#031a3910] backdrop-blur-sm sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 sm:shadow-none">
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={save} disabled={saving||!draftEditable}><Save className="size-4"/>Save draft</Button>
       <button type="button" onClick={()=>{if(!window.confirm("Clear unsaved wizard fields? Already saved campaign records will remain unchanged."))return;useWizardStore.getState().clear(accountId);setUpload(null);setError("");setFeedback("Form cleared. Existing saved campaign records are unchanged.");go(1);}} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[#6b7c98] hover:text-brand-navy"><Trash2 className="size-4"/>Reset form</button></div>
      <div className="flex flex-wrap gap-2">{step>1&&<Button variant="outline" type="button" onClick={()=>go(step-1)}><ChevronLeft className="size-4"/>Back</Button>}
       {step<6?<Button type="button" onClick={next}>Continue <ChevronRight className="size-4"/></Button>:<Button type="button" onClick={submit} disabled={saving||!draftEditable||!draft.agreed}><FileCheck2 className="size-4"/>Submit for Review <ArrowRight className="size-4"/></Button>}</div>
     </div>
    </CardContent>
   </Card>
   <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
    <Card><CardHeader><CardTitle className="text-base">Campaign Summary</CardTitle></CardHeader><CardContent><dl className="space-y-3 text-sm">
     {[
      ["Name",draft.title||"Not set"],["Objective",draft.objective.replaceAll("_"," ")],
      ["Format",draft.placement?.replaceAll("_"," ")??"Not selected"],
      ["Creative",draft.creativeMode==="preview"?draft.creativeTitle||"Not set":db.creatives.find(c=>c.id===draft.creativeId)?.title??"Not set"],
      ["Planned screens",String(draft.selectedScreenIds.length)],
      ["Dates",draft.startDate&&draft.endDate?draft.startDate+" → "+draft.endDate:"Not set"]
     ].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-[#edf1f8] pb-2 last:border-0"><dt className="shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 break-words text-right font-semibold text-brand-navy">{v}</dd></div>)}</dl>
     <p className="mt-4 rounded-lg bg-[#f0f6ff] px-3 py-2 text-xs leading-5 text-[#456389]">Estimated price appears in the final step after valid placement, inventory and dates are selected.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">What happens next?</CardTitle></CardHeader><CardContent><ol className="space-y-3 text-sm leading-6 text-[#566b88]">
     <li className="flex gap-2"><span className="font-bold text-brand-blue">1.</span> Submit the frontend campaign for demo Admin review</li>
     <li className="flex gap-2"><span className="font-bold text-brand-blue">2.</span> Receive a status update in My Campaigns</li>
     <li className="flex gap-2"><span className="font-bold text-brand-blue">3.</span> Real checkout, inventory allocation and driver delivery require backend verification</li>
    </ol></CardContent></Card>
   </aside>
  </div>
 </div>;
}
