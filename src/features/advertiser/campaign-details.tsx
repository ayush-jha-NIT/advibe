"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock3,FileImage,FileText,MapPin,MonitorPlay,Pause,Play,Receipt,ShieldAlert,Target,XCircle} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle,Dialog} from "@/components/ui";
import {moneyINR,countScheduledDays} from "@/lib/demo-rules";
import {useDemoStore} from "@/services/demo-store";
import {CampaignStatusBadge,useAdvertiserData} from "./shared";
import {
 actionWarning,allowedAdvertiserActions,campaignCreative,campaignPayments,campaignScreens,
 displayAuditAction,ownCampaign,visibleCampaignEvents,lifecycleLabels,type CampaignManagementAction
} from "./campaign-detail-model";
import type {Campaign} from "@/types/domain";

type Tab="overview"|"creative"|"placements"|"activity"|"billing";
const tabs:{id:Tab;title:string}[]=[
 {id:"overview",title:"Overview"},{id:"creative",title:"Creative"},
 {id:"placements",title:"Locations & Screens"},{id:"activity",title:"Review History"},
 {id:"billing",title:"Billing"}
];
function InfoCell({name,value}:{name:string;value:React.ReactNode}){
 return <div className="min-w-0 rounded-xl border border-[#e3ebf7] bg-[#f7faff] p-3.5">
  <dt className="text-xs font-semibold text-[#6881a1]">{name}</dt>
  <dd className="mt-1 break-words text-sm font-bold text-brand-navy">{value}</dd>
 </div>;
}
function LocalTime({value}:{value:string}){
 const date=new Date(value);
 return <time dateTime={value}>{Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(date)}</time>;
}
function StatusExplanation({campaign}:{campaign:Campaign}){
 const text:Record<Campaign["status"],string>={
  draft:"Saved locally and editable. Use the six-step wizard to complete its information.",
  submitted:"Sent to the demo Admin review queue. No screen is booked or charged.",
  under_review:"The Admin demo has marked this campaign as under review.",
  changes_requested:"The Admin demo requested changes. Edit the campaign and submit it again.",
  approved:"Marked approved in the demo. Payment and inventory scheduling still require separate steps.",
  scheduled:"Contains a demo screen assignment. No physical screen is controlled by the browser.",
  live:"Marked live in fictional campaign records; displayed impressions are seeded or simulated, not telemetry.",
  paused:"Marked paused in this browser. No command has been sent to a physical device.",
  completed:"Marked completed in the demo history; this does not establish verified delivery.",
  rejected:"Marked rejected in the demo review; the record remains available for reference.",
  cancelled:"Marked cancelled in the demo. No external payment reversal or physical device action occurred."
 };
 return <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526c8a]">{text[campaign.status]}</p>;
}
export function CampaignDetailsPage({campaignId}:{campaignId:string}){
 const {db,accountId,hydrated}=useAdvertiserData();
 const [tab,setTab]=React.useState<Tab>("overview");
 const [pending,setPending]=React.useState<CampaignManagementAction|null>(null);
 const [error,setError]=React.useState(""),[notice,setNotice]=React.useState("");
 const campaign=ownCampaign(db,accountId,campaignId);
 const creative=campaign?campaignCreative(db,campaign):null;
 const screens=campaign?campaignScreens(db,campaign):[];
 const payments=campaign?campaignPayments(db,campaign):[];
 const events=campaign?visibleCampaignEvents(db,campaign):[];
 const permitted=campaign?allowedAdvertiserActions(db,campaign):[];
 function manage(){
  if(!pending||!campaign)return;
  setError("");setNotice("");
  try{
   useDemoStore.getState().manageCampaign({role:"advertiser",accountId},campaign.id,pending);
   setNotice("Demo status updated. The corresponding audit entry and notifications were saved locally.");
   setPending(null);
  }catch(e){setError(e instanceof Error?e.message:"Unable to update this demo campaign.");setPending(null);}
 }
 if(!hydrated)return <div role="status" className="p-8 text-sm text-muted-foreground">Loading campaign details…</div>;
 if(!campaign)return <main className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-[#d7e6f8] bg-white p-6 sm:p-10"><ShieldAlert className="size-9 text-brand-blue"/><h1 className="text-2xl font-black text-brand-navy">Campaign not available</h1><p className="text-sm leading-6 text-muted-foreground">No campaign is visible for this demo account and ID. It may not exist, or it belongs to a different demo advertiser.</p><Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center gap-2 font-bold text-brand-blue"><ArrowLeft className="size-4"/>Back to My Campaigns</Link></main>;
 const draftLike=campaign.status==="draft"||campaign.status==="changes_requested";
 let activeDays:number|null=null;
 if(campaign.wizardDetails){
  try{activeDays=countScheduledDays(campaign.startDate,campaign.endDate,campaign.wizardDetails.weekdays);}catch{/* incomplete older draft */}
 }
 const paid=payments.filter(p=>p.status==="paid").reduce((n,p)=>n+p.amountPaise,0);
 return <main className="mx-auto max-w-7xl space-y-5 pb-8">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue hover:underline"><ArrowLeft className="size-4"/>My Campaigns</Link>
   <span className="rounded-lg bg-[#ecf4ff] px-3 py-2 font-mono text-xs font-semibold text-[#45658e]">{campaign.id}</span>
  </div>
  <div className="rounded-2xl border border-[#deebf8] bg-white p-5 shadow-sm sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0">
    <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Advertiser / Campaign details / DEMO</p>
    <h1 className="break-words text-2xl font-extrabold leading-tight text-brand-navy sm:text-3xl">{campaign.title}</h1>
    <div className="mt-3 flex flex-wrap items-center gap-2"><CampaignStatusBadge status={campaign.status}/>
     <Badge shape="pill" tone={campaign.paymentStatus==="paid"?"success":"neutral"} className="capitalize">{campaign.paymentStatus} · Demo payment flag</Badge>
    </div>
    <StatusExplanation campaign={campaign}/>
   </div>
   <div className="flex flex-wrap gap-2">
    {draftLike&&<Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-bold text-white hover:bg-[#0052d7]" href={"/advertiser/create-campaign?campaign="+encodeURIComponent(campaign.id)}><FileText className="size-4"/>Edit in Wizard</Link>}
    {permitted.map(action=><Button type="button" key={action} variant={action==="cancel"?"outline":"primary"} onClick={()=>{setError("");setPending(action);}}>
     {action==="pause"?<Pause className="size-4"/>:action==="resume"?<Play className="size-4"/>:<XCircle className="size-4"/>}{lifecycleLabels[action]}
    </Button>)}
   </div></div>
  </div>
  {notice&&<p role="status" className="rounded-xl border border-[#bfe5d1] bg-[#eefaf5] p-3 text-sm text-[#176341]">{notice}</p>}
  {error&&<p role="alert" className="rounded-xl border border-[#fac6cb] bg-[#fff1f3] p-3 text-sm text-[#b52440]">{error}</p>}
  <div className="flex items-start gap-2 rounded-xl border border-[#d3e5fb] bg-[#f0f7ff] p-3 text-xs leading-5 text-[#476589]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/><p>This is a fictional campaign record saved in this browser. Review events, payment entries and impressions are demo data, not independently verified delivery. No real devices, Cashfree charges or refunds are controlled here.</p></div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <InfoCell name="Sample impressions" value={campaign.impressions.toLocaleString("en-IN")}/>
   <InfoCell name="Assigned screens" value={String(campaign.screenIds.length)}/>
   <InfoCell name="Planned screens" value={String(campaign.plannedScreenIds?.length??0)}/>
   <InfoCell name="Recorded demo payments" value={moneyINR(paid)}/>
  </div>
  <nav aria-label="Campaign detail sections" className="overflow-x-auto rounded-xl border border-[#dce8f6] bg-white p-1.5" tabIndex={0}>
   <div role="tablist" aria-label="Campaign information" className="flex min-w-max gap-1">
    {tabs.map(t=><button key={t.id} type="button" role="tab" id={"tab-"+t.id} aria-selected={tab===t.id} aria-controls={"panel-"+t.id}
     onClick={()=>setTab(t.id)} className={"min-h-11 rounded-lg px-3.5 text-sm font-semibold "+(tab===t.id?"bg-brand-blue text-white":"text-[#506d93] hover:bg-[#eff5ff]")}>{t.title}</button>)}
   </div>
  </nav>
  <section role="tabpanel" id={"panel-"+tab} aria-labelledby={"tab-"+tab} className="min-w-0">
   {tab==="overview"&&<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
    <Card><CardHeader><CardTitle>Campaign overview</CardTitle></CardHeader><CardContent>
     <dl className="grid gap-3 sm:grid-cols-2">
      <InfoCell name="Campaign objective" value={campaign.objective.replaceAll("_"," ")}/>
      <InfoCell name="Brand / business" value={campaign.wizardDetails?.business??db.accounts.find(x=>x.id===accountId)?.business??"Not specified"}/>
      <InfoCell name="Industry" value={campaign.wizardDetails?.industry||"Not specified"}/>
      <InfoCell name="Created" value={campaign.createdAt}/>
      <InfoCell name="Requested plays / day" value={campaign.wizardDetails?.playsPerDay?String(campaign.wizardDetails.playsPerDay):"Not specified"}/>
      <InfoCell name="Estimated cost" value={campaign.quoteEstimatePaise!==undefined?moneyINR(campaign.quoteEstimatePaise):"Not yet calculated"}/>
     </dl>
     {campaign.wizardDetails?.description&&<div className="mt-4 rounded-xl bg-[#f6f9ff] p-4"><p className="text-xs font-bold text-[#6080a4]">Campaign description</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-brand-navy">{campaign.wizardDetails.description}</p></div>}
    </CardContent></Card>
    <div className="space-y-4"><Card><CardHeader><CardTitle>Schedule</CardTitle></CardHeader><CardContent>
     <div className="flex items-center gap-3 text-brand-blue"><CalendarDays className="size-7"/><div><p className="text-sm font-bold text-brand-navy">{campaign.startDate}</p><p className="text-sm text-muted-foreground">to {campaign.endDate}</p></div></div>
     <dl className="mt-4 space-y-3 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Active delivery days</dt><dd className="font-semibold text-brand-navy">{activeDays??"Not configured"}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Time window</dt><dd className="font-semibold text-brand-navy">{campaign.wizardDetails?campaign.wizardDetails.startTime+"–"+campaign.wizardDetails.endTime:"Not specified"}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Days of week</dt><dd className="max-w-[55%] text-right font-semibold text-brand-navy">{campaign.wizardDetails?.weekdays.map(i=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]).join(", ")||"Not specified"}</dd></div>
     </dl>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Campaign operations</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Only actions allowed by the current stored status appear above. Admin approval, payment verification and inventory reservations are separate workflows.</p>
     <Link href="/advertiser/campaigns" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue">View campaign directory <ArrowRight className="size-4"/></Link>
    </CardContent></Card></div>
   </div>}
   {tab==="creative"&&<Card><CardHeader><CardTitle>Creative information</CardTitle><p className="text-xs text-muted-foreground">Metadata only. Actual creative files are not stored in the demo browser database.</p></CardHeader><CardContent>
    {creative?<div className="grid gap-5 sm:grid-cols-[180px_1fr]"><div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[#b7cee9] bg-[#eff5ff]"><FileImage className="size-16 text-[#7b9cca]" aria-hidden/></div>
     <dl className="grid gap-3 sm:grid-cols-2">
      <InfoCell name="Creative name" value={creative.title}/><InfoCell name="Media type" value={creative.format.toUpperCase()}/>
      <InfoCell name="Placement" value={creative.placement.replaceAll("_"," ")}/><InfoCell name="Review status" value={creative.approval.replaceAll("_"," ")}/>
      <InfoCell name="Creative ID" value={creative.id}/><InfoCell name="File transfer" value="Not uploaded"/>
     </dl></div>:<div className="rounded-xl bg-[#f5f8ff] p-5 text-sm text-muted-foreground">No associated creative metadata is stored for this campaign.</div>}
    <p className="mt-5 rounded-xl border border-[#d9e5f7] bg-[#f5f9ff] p-4 text-xs leading-6 text-[#4c6b93]">Live video/image playback is not available because Part 8 stores file metadata only. The actual production upload, moderation and media delivery pipeline is still pending.</p>
   </CardContent></Card>}
   {tab==="placements"&&<Card><CardHeader><CardTitle>Screen targets and assignments</CardTitle><p className="text-xs text-muted-foreground">Planned screens are not reserved. Assigned screens are based solely on demo booking records.</p></CardHeader><CardContent>
    {screens.length?<div className="grid gap-3 sm:grid-cols-2">{screens.map(({screen,location,planned,booking})=><article key={screen.id} className="rounded-xl border border-[#dce7f6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 font-semibold text-brand-navy"><MonitorPlay className="size-5 text-brand-blue"/>{screen.id}</span><Badge tone={planned?"warning":"info"}>{planned?"Proposed only":"Assigned in demo"}</Badge></div>
      <div className="mt-4 space-y-2 text-sm">
       <p className="flex items-center gap-2"><MapPin className="size-4 text-brand-blue"/>{location?location.name+", "+location.city:"Location unavailable"}</p>
       <p className="flex items-center gap-2 text-muted-foreground"><Target className="size-4"/>{screen.placement.replaceAll("_"," ")} · {screen.sizeInches}&quot;</p>
       <p className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4"/>Device demo state: {screen.status}</p>
       <p className="text-xs text-muted-foreground">Booking: {booking?booking.status:"None recorded"}</p>
      </div>
     </article>)}</div>:<div className="rounded-xl bg-[#f5f9ff] p-6 text-sm text-muted-foreground">No screens are assigned or proposed for this campaign.</div>}
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Screen IDs and city names refer to fictional demo inventory, not a real route, live GPS fix, physical playback or inventory reservation.</p>
   </CardContent></Card>}
   {tab==="activity"&&<Card><CardHeader><CardTitle>Recorded review & activity history</CardTitle><p className="text-xs text-muted-foreground">Only explicit stored audit events are shown. There is no invented approval or delivery history.</p></CardHeader><CardContent>
    {events.length?<ol className="space-y-3">{events.map(e=><li key={e.id} className="flex items-start gap-3 rounded-xl border border-[#e0eafa] p-4">
     <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf3ff]"><CheckCircle2 className="size-5 text-brand-blue"/></span>
     <div className="min-w-0 flex-1"><p className="font-semibold text-brand-navy">{displayAuditAction(e.action)}</p><p className="mt-1 text-xs text-muted-foreground">Actor: {e.actorId} · <LocalTime value={e.createdAt}/></p></div>
    </li>)}</ol>:<div className="rounded-xl border border-dashed border-[#cadcf3] bg-[#f8fbff] p-5 text-sm leading-6 text-muted-foreground">No detailed audit events are stored for this seeded record. Its current status is <strong>{campaign.status.replaceAll("_"," ")}</strong>. That snapshot is not evidence of a historical approval timeline.</div>}
    <p className="mt-4 rounded-lg bg-[#f0f6ff] p-3 text-xs leading-6 text-[#48678c]">Current stored status: {campaign.status.replaceAll("_"," ")}. Notices and audit events reflect frontend demo actions, not backend approvals or independently verified device telemetry.</p>
   </CardContent></Card>}
   {tab==="billing"&&<div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
    <Card><CardHeader><CardTitle>Campaign estimate</CardTitle></CardHeader><CardContent><div className="flex items-start gap-3"><Receipt className="size-7 text-brand-blue"/><div><p className="text-xs text-muted-foreground">Stored quote estimate</p><p className="text-2xl font-extrabold text-brand-navy">{campaign.quoteEstimatePaise!==undefined?moneyINR(campaign.quoteEstimatePaise):"Not available"}</p></div></div><p className="mt-4 text-sm leading-6 text-muted-foreground">If present, this is an illustrative frontend quote, not a payable invoice or a Cashfree order.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Demo payment ledger</CardTitle></CardHeader><CardContent>{payments.length?<div className="space-y-3">{payments.map(p=><div key={p.id} className="rounded-xl border border-[#dce8f8] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-brand-navy">{moneyINR(p.amountPaise)}</strong><Badge tone={p.status==="paid"?"success":"neutral"} className="capitalize">{p.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Provider: {p.provider} · {p.providerReference??p.id}</p></div>)}</div>:<div className="rounded-xl bg-[#f5f9ff] p-5 text-sm leading-6 text-muted-foreground">No demo payment record exists for this campaign. Submission and approval do not charge a card.</div>}
     <p className="mt-4 text-xs leading-6 text-muted-foreground">Refunds are not triggered by demo cancellation. Real payment sessions and reconciliations require secure Cashfree backend verification.</p>
    </CardContent></Card>
   </div>}
  </section>
  <Dialog open={pending!==null} onOpenChange={open=>{if(!open)setPending(null);}}
   title={pending?lifecycleLabels[pending]:"Manage campaign"} description="Confirm this browser-local demonstration action."
   footer={<><Button type="button" variant="outline" onClick={()=>setPending(null)}>Keep current status</Button><Button type="button" variant={pending==="cancel"?"destructive":"primary"} onClick={manage}>Confirm demo action</Button></>}>
    {pending&&<p className="text-sm leading-7 text-[#465f81]">{actionWarning(pending,campaign)}</p>}
  </Dialog>
 </main>;
}
