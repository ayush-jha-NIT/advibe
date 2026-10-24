"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,BadgeCheck,CarFront,Check,CheckCircle2,ChevronLeft,ClipboardCheck,FileCheck2,FileText,Info,LockKeyhole,RotateCcw,Save,ShieldAlert,UserRound} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {DEMO_USERS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import {useDriverOnboarding} from "@/services/driver-onboarding-store";
import {documentKinds,driverCompletedSteps,driverSeed,unlockDriverStep,validateDriverThrough,type DriverDraft,type DocumentKind} from "./onboarding-model";

const steps=[
 {title:"Driver Profile",hint:"Sample personal profile",icon:UserRound},
 {title:"Vehicle Details",hint:"Vehicle category and model",icon:CarFront},
 {title:"Document Checklist",hint:"KYC interface preview",icon:FileCheck2},
 {title:"Screen Setup",hint:"Available in Part 14",icon:ClipboardCheck},
 {title:"Agreement & Bank",hint:"Available in Part 14",icon:BadgeCheck}
] as const;
const documents:Record<DocumentKind,{name:string;detail:string}>={
 licence:{name:"Driving Licence",detail:"Example driving permit. No licence number or scan is accepted."},
 registration:{name:"Vehicle Registration Certificate",detail:"Example RC. No real registration plate or document is accepted."},
 insurance:{name:"Vehicle Insurance",detail:"Example policy. No policy number or image is accepted."}
};
const field="min-h-11 w-full rounded-xl border border-[#cbdcf1] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d9eafd] disabled:opacity-60";
const label="mb-1.5 block text-sm font-semibold text-brand-navy";
function Detail({title,value}:{title:string;value:string}){
 return <div className="rounded-xl border border-[#e1eafb] bg-[#f8fbff] p-3"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 break-words text-sm font-bold text-brand-navy">{value}</p></div>;
}
export function DriverOnboarding(){
 const session=useDemoAuth(s=>s.session);
 const db=useDemoStore(s=>s.db);
 const preset=DEMO_USERS.find(x=>x.role==="driver");
 const provisioned=session?.role==="driver"&&session.email===preset?.email;
 const accountId=provisioned?"drv-1":"not-provisioned";
 const saved=useDriverOnboarding(s=>s.drafts[accountId]);
 const patchDraft=useDriverOnboarding(s=>s.patch);
 const replaceDraft=useDriverOnboarding(s=>s.replace);
 const clearDraft=useDriverOnboarding(s=>s.clear);
 const draft=saved??driverSeed;
 const [ready,setReady]=React.useState(false);
 const [step,setStep]=React.useState<1|2|3|4>(1);
 const [error,setError]=React.useState(""),[feedback,setFeedback]=React.useState("");
 const errRef=React.useRef<HTMLParagraphElement>(null);
 React.useEffect(()=>{
  let mounted=true;
  void Promise.all([Promise.resolve(useDriverOnboarding.persist.rehydrate()),Promise.resolve(useDemoStore.persist.rehydrate())])
   .then(()=>{if(mounted)setReady(true);});
  return ()=>{mounted=false;};
 },[]);
 React.useEffect(()=>{
  if(error){const frame=window.requestAnimationFrame(()=>errRef.current?.focus());return ()=>window.cancelAnimationFrame(frame);}
 },[error]);
 function patch(values:Partial<DriverDraft>){patchDraft(accountId,values);setError("");setFeedback("");}
 function toStep(n:1|2|3|4){
  if(n>draft.highestUnlocked)return;
  setStep(n);setError("");setFeedback("");
 }
 function next(){
  setError("");setFeedback("");
  if(step===4)return;
  try{
   const updated=unlockDriverStep(draft,step,new Date().getFullYear());
   replaceDraft(accountId,updated);
   setStep((step+1) as 2|3|4);
   setFeedback(step===3?"Steps 1–3 complete in this browser. Screen setup and payout agreement continue in Part 14.":"Step "+step+" validated and saved in this browser session.");
  }catch(e){setError(e instanceof Error?e.message:"Please check these sample fields.");}
 }
 function reset(){
  if(!window.confirm("Reset your sample onboarding progress? This will not change the existing approved demo vehicle or driver account."))return;
  clearDraft(accountId);setStep(1);setError("");setFeedback("Sample onboarding form reset. Approved demo records were not changed.");
 }
 const approved=db.driverApplications.find(a=>a.driverId===accountId&&a.status==="approved");
 const existingVehicle=db.vehicles.find(v=>v.driverId===accountId&&v.verification==="approved");
 const completed=driverCompletedSteps(draft,new Date().getFullYear());
 if(!ready)return <p role="status" className="rounded-xl border border-[#dfebf8] bg-white p-6 text-sm text-muted-foreground">Loading driver onboarding preview…</p>;
 if(!provisioned)return <main className="mx-auto max-w-2xl rounded-3xl border border-[#dce7f8] bg-white p-6 sm:p-9"><LockKeyhole className="size-10 text-brand-blue"/><h1 className="mt-3 text-2xl font-extrabold text-brand-navy">Driver preview account required</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">New frontend-only signup identities have no backend driver record. Use the preset Driver demo login to try onboarding without storing real identity information.</p><Link href="/login?role=driver" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-5 font-bold text-white">Open demo login <ArrowRight className="size-4"/></Link></main>;
 return <main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Driver Partner · Demo onboarding</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Become an AdVibe Partner</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Preview the first three steps of a five-step driver onboarding journey, optimized for your phone.</p></div>
   <Badge tone="info">Part 13 · Steps 1–3 of 5</Badge>
  </div>
  <div className="flex items-start gap-3 rounded-xl border border-[#f0d6ab] bg-[#fff9eb] p-4 text-xs leading-6 text-[#83592b]"><ShieldAlert className="mt-0.5 size-5 shrink-0"/><p><strong>Demo only: do not enter genuine KYC details.</strong> This preview never asks for Aadhaar, PAN, licence numbers, phone numbers, real registration plates, bank information or scans. Document controls are simulated checklist markers, not uploaded/verified documents. Data stays in this tab&apos;s browser session.</p></div>
  {approved&&<div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#b9e4cf] bg-[#effaf3] p-4 text-xs leading-6 text-[#226748]"><CheckCircle2 className="size-5 shrink-0"/><div className="flex-1"><strong>Existing demo account approved.</strong> Your seeded {existingVehicle?.model??"vehicle"} remains approved. Exploring this separate onboarding preview will not reset approval, screen status or vehicle records.</div></div>}
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_285px]">
   <div className="min-w-0 space-y-4">
    <Card><CardContent className="pt-5">
     <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-brand-navy">Step {Math.min(step,3)} of 5 {step===4?"· Waiting for Part 14":""}</p><span className="text-xs font-semibold text-[#6280a3]">{completed} of first 3 validated</span></div>
     <div role="progressbar" aria-label="Driver onboarding step progress" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completed} className="h-2 overflow-hidden rounded-full bg-[#e1ebf8]"><div className="h-full rounded-full bg-brand-blue transition-[width]" style={{width:completed/5*100+"%"}}/></div>
     <nav aria-label="Driver onboarding steps" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">{steps.map(({title,icon:Icon},i)=>{
      const n=i+1,active=step===n,unlocked=n<=draft.highestUnlocked&&n<=4;
      return <button type="button" key={title} disabled={!unlocked} onClick={()=>toStep(n as 1|2|3|4)} aria-current={active?"step":undefined}
       className={"flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-3 text-center text-[11px] font-semibold leading-tight transition sm:text-xs "+(active?"border-brand-blue bg-[#ebf4ff] text-brand-blue":unlocked?"border-[#d9e7f8] bg-white text-brand-navy hover:border-brand-blue":"border-[#e4eaf3] bg-[#f7f9fc] text-[#94a5ba]")}>
       <span className={"grid size-8 place-items-center rounded-full "+(active?"bg-brand-blue text-white":unlocked?"bg-[#eaf3ff] text-brand-blue":"bg-[#e7edf5] text-[#9baac0]")}>{n<=3&&n<draft.highestUnlocked?<Check className="size-4"/>:n>3?<LockKeyhole className="size-4"/>:<Icon className="size-4"/>}</span><span>{title}</span>
      </button>;
     })}</nav>
    </CardContent></Card>
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-brand-blue">Step {Math.min(step,3)} {step===4?"complete":"of 5"}</p><CardTitle className="mt-1">{step<=3?steps[step-1].title:"Ready for Screen Setup"}</CardTitle><p className="mt-1 text-sm leading-6 text-muted-foreground">{step<=3?steps[step-1].hint:"Steps 4 and 5 will be implemented in Part 14."}</p></div><span className="grid size-12 place-items-center rounded-xl bg-[#eaf3ff] text-brand-blue">{step===1?<UserRound className="size-6"/>:step===2?<CarFront className="size-6"/>:step===3?<FileText className="size-6"/>:<CheckCircle2 className="size-6"/>}</span></div></CardHeader>
     <CardContent className="space-y-5">
      {step===1&&<div className="space-y-4">
       <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Sample display name *</span><input className={field} value={draft.displayAlias} maxLength={60} onChange={e=>patch({displayAlias:e.target.value})} placeholder="Example driver alias" autoComplete="off"/><span className="mt-1 block text-xs text-muted-foreground">Use a made-up alias, not your legal name.</span></label>
        <label><span className={label}>Preferred operating city *</span><input className={field} maxLength={60} value={draft.city} onChange={e=>patch({city:e.target.value})} placeholder="Example city" autoComplete="off"/></label>
        <label><span className={label}>Driving experience</span><select className={field} value={draft.experience} onChange={e=>patch({experience:e.target.value as DriverDraft["experience"]})}><option value="new">Just starting</option><option value="under_one">Under 1 year</option><option value="one_to_three">1–3 years</option><option value="over_three">More than 3 years</option></select></label>
        <label><span className={label}>Sample availability</span><select className={field} value={draft.availability} onChange={e=>patch({availability:e.target.value as DriverDraft["availability"]})}><option value="flexible">Flexible days</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option></select></label>
       </div>
       <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-[#dce8f8] bg-[#f8fbff] p-4"><input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#0866ff]" checked={draft.adultConfirmed} onChange={e=>patch({adultConfirmed:e.target.checked})}/><span className="text-sm leading-6 text-brand-navy">I confirm this fictional driver profile represents someone aged 18 or older. This is not age verification.</span></label>
      </div>}
      {step===2&&<div className="space-y-4">
       <fieldset><legend className={label}>Vehicle category *</legend><div className="grid grid-cols-3 gap-2">{(["bike","auto","car"] as const).map(type=><button type="button" key={type} aria-pressed={draft.vehicleType===type} onClick={()=>patch({vehicleType:type})}
        className={"flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold capitalize "+(draft.vehicleType===type?"border-brand-blue bg-[#ebf4ff] text-brand-blue":"border-[#dce8f8] bg-white text-[#516a8b]")}><CarFront className="size-5"/>{type}</button>)}</div></fieldset>
       <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Sample make & model *</span><input className={field} value={draft.vehicleModel} maxLength={70} onChange={e=>patch({vehicleModel:e.target.value})} placeholder="Demo vehicle model" autoComplete="off"/><span className="mt-1 block text-xs text-muted-foreground">Avoid actual vehicle identifiers.</span></label>
        <label><span className={label}>Model year *</span><input type="number" inputMode="numeric" min={1990} max={new Date().getFullYear()+1} className={field} value={draft.modelYear} onChange={e=>patch({modelYear:Number(e.target.value)})}/></label>
        <label className="sm:col-span-2"><span className={label}>Ownership arrangement</span><select className={field} value={draft.ownership} onChange={e=>patch({ownership:e.target.value as DriverDraft["ownership"]})}><option value="self">Owner-driver</option><option value="family">Family vehicle</option><option value="leased">Leased vehicle</option></select></label>
       </div>
       <div className="flex gap-2 rounded-xl border border-[#d7e7fa] bg-[#f0f7ff] p-4 text-xs leading-6 text-[#537197]"><Info className="mt-0.5 size-4 shrink-0"/>This preview deliberately does not collect real registration numbers or vehicle photographs. Backend registration and ownership verification will be required later.</div>
      </div>}
      {step===3&&<div className="space-y-4">
       <p className="text-sm leading-6 text-muted-foreground">Explore the three KYC document categories. Click to mark a <strong>fictional placeholder</strong> ready. No real document can be uploaded, read, saved, sent or approved here.</p>
       {documentKinds.map((key,i)=><label key={key} className={"flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border p-4 "+(draft.checklist[key]?"border-[#7dc6a4] bg-[#f1fbf5]":"border-[#dce7f7] bg-white")}>
        <input type="checkbox" className="size-5 shrink-0 accent-[#0866ff]" checked={draft.checklist[key]} onChange={e=>patch({checklist:{...draft.checklist,[key]:e.target.checked}})}/>
        <span className={"grid size-10 shrink-0 place-items-center rounded-xl "+(draft.checklist[key]?"bg-[#d9f4e5] text-[#138b5c]":"bg-[#ebf3ff] text-brand-blue")}><FileCheck2 className="size-5"/></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-brand-navy">{i+1}. {documents[key].name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{documents[key].detail}</span><span className={"mt-2 inline-block text-xs font-semibold "+(draft.checklist[key]?"text-[#158756]":"text-[#677e9c]")}>{draft.checklist[key]?"Sample placeholder marked ready":"Not marked yet"}</span></span>
       </label>)}
       <div className="rounded-xl border border-[#f4ddb5] bg-[#fff8ed] p-4 text-xs leading-6 text-[#8a612d]"><strong>Not a KYC submission.</strong> These checkbox states cannot establish identity, validity, eligibility or driver approval. The production backend must securely receive and verify documents after consent.</div>
      </div>}
      {step===4&&<div className="space-y-4">
       <div className="flex items-center gap-3 rounded-2xl border border-[#aee0c3] bg-[#effaf4] p-5"><CheckCircle2 className="size-10 shrink-0 text-[#159364]"/><div><h3 className="text-lg font-extrabold text-brand-navy">First 3 steps completed</h3><p className="mt-1 text-sm leading-6 text-[#507b62]">Your sample profile, vehicle and document checklist are ready to resume within this browser session.</p></div></div>
       <div className="grid gap-3 sm:grid-cols-2"><Detail title="Sample driver" value={draft.displayAlias}/><Detail title="Operating city" value={draft.city}/><Detail title="Vehicle" value={draft.vehicleType+" · "+draft.vehicleModel}/><Detail title="Document placeholders" value={documentKinds.filter(key=>draft.checklist[key]).length+" of 3 marked"}/></div>
       <div className="rounded-xl border border-[#d6e7fb] bg-[#f5f9ff] p-4"><p className="text-sm font-bold text-brand-navy">Next in Part 14</p><p className="mt-2 text-xs leading-6 text-muted-foreground">Step 4: Screen setup and device pairing. Step 5: Bank/agreement setup and final review. Neither step is currently implemented, and no live admin verification or payouts are triggered.</p></div>
      </div>}
      {error&&<p role="alert" ref={errRef} tabIndex={-1} className="rounded-xl border border-[#f9baca] bg-[#fff1f4] p-3 text-sm font-semibold text-[#b52642] outline-none focus:ring-2 focus:ring-[#e87893]">{error}</p>}
      {feedback&&<p role="status" className="rounded-xl border border-[#b9e6ce] bg-[#f0fbf6] p-3 text-sm text-[#266c49]">{feedback}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ebf7] pt-5">
       <Button variant="outline" disabled={step===1} onClick={()=>toStep(Math.max(1,step-1) as 1|2|3|4)}><ChevronLeft className="size-4"/>Previous</Button>
       <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setFeedback("Demo progress is saved automatically in this tab session. No identity documents or vehicle registration details are stored.")}><Save className="size-4"/>Save preview</Button>
        {step<4?<Button onClick={next}>{step===3?"Complete Step 3":"Continue"} <ArrowRight className="size-4"/></Button>:<Link href="/driver" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-bold text-white hover:bg-[#0051db]">Driver Dashboard <ArrowRight className="size-4"/></Link>}
       </div>
      </div>
     </CardContent>
    </Card>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/driver" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue"><ArrowLeft className="size-4"/>Back to Driver Dashboard</Link><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#7389a6] hover:text-brand-blue"><RotateCcw className="size-4"/>Reset sample form</button></div>
   </div>
   <aside className="space-y-4"><Card><CardHeader><CardTitle>Onboarding Guide</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm leading-6 text-muted-foreground">Five simple steps toward a future verified Driver Partner profile.</p>
    {steps.map(({title,hint},i)=><div key={title} className="flex items-start gap-3"><span className={"grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold "+(i<3&&i<completed?"bg-[#dff7e9] text-[#14794e]":i>=3?"bg-[#edf2f9] text-[#8da3be]":"bg-[#e8f3ff] text-brand-blue")}>{i<3&&i<completed?<Check className="size-4"/>:i+1}</span><div><p className="text-sm font-semibold text-brand-navy">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p></div></div>)}
    <div className="rounded-lg bg-[#eef5ff] p-3 text-xs leading-6 text-[#47678e]"><strong>Progress:</strong> {completed} of 5 demo steps are validated. Later steps cannot be completed until Part 14.</div>
   </CardContent></Card>
   <Card><CardHeader><CardTitle>Data & Security</CardTitle></CardHeader><CardContent><p className="text-xs leading-6 text-muted-foreground">All fields are fictional and saved in sessionStorage for this tab. No contact information, bank account, government IDs, registration plate or uploaded files are collected. Production verification requires secure server-side access and consent.</p></CardContent></Card>
   </aside>
  </div>
 </main>;
}
