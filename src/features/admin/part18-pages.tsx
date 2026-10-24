"use client";
import * as React from "react";
import {CalendarDays,Monitor,Paintbrush} from "lucide-react";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import type {Campaign,ReviewStatus} from "@/types/domain";
import {AdminAccess,AdminAction,AdminHeading,AdminNavLink,AdminNotice,AdminWarning,control,demoAdmin,adminSummary,MiniStat,StatusPill,useAdminData} from "./admin-shared";

function useAction(){
 const [message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 const run=(action:()=>void,what:string)=>{
  setError("");setMessage("");
  try{action();setMessage(what+" updated in the fictional browser database.");}catch(e){setError(e instanceof Error?e.message:"Demo update failed.");}
 };
 return {message,error,run};
}
export function AdminDashboard(){
 const {db,ready,admin}=useAdminData(),k=adminSummary(db);
 const tasks=[{label:"Campaigns awaiting review",value:k.needsCampaignReview,url:"/admin/approvals"},{label:"Creative metadata awaiting review",value:k.creativeReview,url:"/admin/approvals"},{label:"Driver applications awaiting review",value:k.pendingDrivers,url:"/admin/drivers"},{label:"Unresolved support tickets",value:k.openTickets,url:"/admin/support"}];
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading eyebrow="Admin · Network Overview" title="Operations Command Center" description="A live view of this browser's fictional AdVibe campaigns, driver network and review queue."/>
  <AdminWarning>These KPIs summarize local demonstration records, not production analytics, verified device connectivity or financial movements.</AdminWarning>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <MiniStat label="Campaign records" value={k.campaigns} caption="All fictional states"/>
   <MiniStat label="Demo online screens" value={k.online} caption={k.screens+" total stored screen records"}/>
   <MiniStat label="Review queue" value={k.needsCampaignReview+k.creativeReview+k.pendingDrivers} caption="Campaigns, creatives and driver applications"/>
   <MiniStat label="Unresolved tickets" value={k.openTickets} caption="No live helpdesk connected"/>
  </div>
  <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
   <Card><CardHeader><CardTitle>Items Needing Attention</CardTitle></CardHeader><CardContent className="space-y-3">{tasks.map(t=><div key={t.label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0eafa] p-4"><div><p className="text-sm font-bold text-brand-navy">{t.label}</p><p className="mt-1 text-xl font-extrabold text-brand-blue">{t.value}</p></div><AdminNavLink href={t.url}>Open queue</AdminNavLink></div>)}</CardContent></Card>
   <Card><CardHeader><CardTitle>Network & Finance</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="rounded-xl bg-[#f5f9ff] p-4"><p className="text-xs text-muted-foreground">Pending sample driver settlements</p><p className="mt-2 text-xl font-extrabold text-brand-navy">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(k.pendingSettlements/100)}</p></div>
    <div className="rounded-xl bg-[#f5f9ff] p-4"><p className="text-xs text-muted-foreground">Unread Admin demo notices</p><p className="mt-2 text-xl font-extrabold text-brand-navy">{k.unread}</p></div>
    <div className="flex flex-wrap gap-2"><AdminNavLink href="/admin/screens">Inventory</AdminNavLink><AdminNavLink href="/admin/settlements">Settlements</AdminNavLink></div>
   </CardContent></Card>
  </div>
  <Card><CardHeader><CardTitle>Recent Campaign Records</CardTitle></CardHeader><CardContent className="space-y-3">
   {db.campaigns.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5).map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0eafa] p-4"><div className="min-w-0"><p className="font-bold text-brand-navy">{c.title}</p><p className="text-xs text-muted-foreground">{c.id} · {db.accounts.find(a=>a.id===c.advertiserId)?.name??"Unknown demo advertiser"}</p></div><StatusPill value={c.status}/></div>)}
   <AdminNavLink href="/admin/campaigns">View all campaigns</AdminNavLink>
  </CardContent></Card>
 </main></AdminAccess>;
}
const reviewStatuses=["submitted","under_review","approved","scheduled","live","paused","completed","changes_requested","rejected","cancelled","draft"] as const;
export function AdminCampaigns(){
 const {db,ready,admin}=useAdminData(),{message,error,run}=useAction();
 const [q,setQ]=React.useState(""),[status,setStatus]=React.useState("all"),[expanded,setExpanded]=React.useState<string|null>(null);
 const rows=db.campaigns.filter(c=>(status==="all"||c.status===status)&&(!q.trim()||[c.title,c.id,db.accounts.find(a=>a.id===c.advertiserId)?.name??""].some(s=>s.toLowerCase().includes(q.trim().toLowerCase())))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 function action(c:Campaign,target:"under_review"|"approved"|"changes_requested"|"rejected"){
  if(!window.confirm("Change sample campaign "+c.id+" to "+target+"? This changes only browser-local state."))return;
  run(()=>useDemoStore.getState().reviewCampaign(demoAdmin,c.id,target),"Campaign "+c.id);
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Campaign Management" eyebrow="Admin · Advertising Operations" description="Search every fictional campaign, inspect creative and booking links, and perform valid demo review transitions."/>
  <AdminWarning>Campaign approvals are sample workflow changes. They do not charge an advertiser, guarantee real placement or send commands to vehicle-mounted displays.</AdminWarning>
  <AdminNotice message={message} error={error}/>
  <Card><CardHeader><CardTitle>Campaign Directory</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
    <label className="text-xs font-semibold text-[#617a97]">Search campaigns<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Campaign, ID or advertiser" className={control+" mt-1"} type="search"/></label>
    <label className="text-xs font-semibold text-[#617a97]">Lifecycle<select className={control+" mt-1"} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{reviewStatuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
   </div><p className="mt-3 text-xs text-muted-foreground">{rows.length} of {db.campaigns.length} campaign(s) matched</p>
   <div className="mt-4 space-y-3">{rows.length?rows.map(c=>{
    const creative=db.creatives.find(x=>x.id===c.creativeId),bookings=db.bookings.filter(x=>x.campaignId===c.id);
    return <article key={c.id} className="rounded-xl border border-[#dce8f7] p-4">
     <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-brand-navy">{c.title}</h2><p className="mt-1 text-xs text-muted-foreground">{c.id} · {db.accounts.find(a=>a.id===c.advertiserId)?.name??c.advertiserId}</p></div><StatusPill value={c.status}/></div>
     <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><p><CalendarDays className="mr-1 inline size-4 text-brand-blue"/>{c.startDate} to {c.endDate}</p><p><Paintbrush className="mr-1 inline size-4 text-brand-blue"/>{creative?.title??"No creative linked"}</p><p><Monitor className="mr-1 inline size-4 text-brand-blue"/>{bookings.filter(b=>b.status==="confirmed").length} confirmed sample bookings</p></div>
     <div className="mt-3 flex flex-wrap gap-2">
      {c.status==="submitted"&&<AdminAction onClick={()=>action(c,"under_review")}>Start review</AdminAction>}
      {c.status==="under_review"&&<><AdminAction onClick={()=>action(c,"approved")}>Approve</AdminAction><AdminAction onClick={()=>action(c,"changes_requested")}>Request changes</AdminAction><AdminAction onClick={()=>action(c,"rejected")}>Reject</AdminAction></>}
      <AdminAction onClick={()=>setExpanded(expanded===c.id?null:c.id)}>{expanded===c.id?"Hide details":"Details"}</AdminAction>
     </div>
     {expanded===c.id&&<dl className="mt-3 grid gap-3 rounded-lg bg-[#f5f9ff] p-3 text-xs sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Creative approval</dt><dd className="mt-1 font-semibold">{creative?.approval??"Not linked"}</dd></div>
      <div><dt className="text-muted-foreground">Demo payment status</dt><dd className="mt-1 font-semibold">{c.paymentStatus}</dd></div>
      <div><dt className="text-muted-foreground">Planned screens (not reservations)</dt><dd className="mt-1 font-semibold">{c.plannedScreenIds?.join(", ")||"None"}</dd></div>
      <div><dt className="text-muted-foreground">Confirmed assigned screens</dt><dd className="mt-1 font-semibold">{c.screenIds.join(", ")||"None"}</dd></div>
     </dl>}
    </article>;
   }):<p className="rounded-lg bg-[#f5f9ff] p-6 text-sm text-muted-foreground">No campaigns match this filter.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminApprovals(){
 const {db,ready,admin}=useAdminData(),{message,error,run}=useAction();
 const campaigns=db.campaigns.filter(c=>["submitted","under_review"].includes(c.status));
 const creatives=db.creatives.filter(c=>c.approval==="pending"||c.approval==="under_review");
 function reviewCreative(id:string,to:ReviewStatus){
  if(!window.confirm("Set sample creative "+id+" to "+to+"?"))return;
  run(()=>useDemoStore.getState().reviewCreative(demoAdmin,id,to),"Creative "+id);
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading eyebrow="Admin · Review Workbench" title="Approvals Queue" description="Review advertiser campaigns and fictional creative metadata. Driver KYC review is handled separately in the Driver Partners module."/>
  <AdminWarning>Approval changes are demo audit events only. No media file moderation, legal KYC, signed contract or deployment device is verified by this UI.</AdminWarning><AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-2 gap-3"><MiniStat label="Campaign review queue" value={campaigns.length}/><MiniStat label="Creative review queue" value={creatives.length}/></div>
  <div className="grid gap-4 lg:grid-cols-2">
   <Card><CardHeader><CardTitle>Pending Campaign Reviews</CardTitle></CardHeader><CardContent className="space-y-3">{campaigns.map(c=><article key={c.id} className="rounded-xl border border-[#e0eafa] p-4"><p className="font-bold text-brand-navy">{c.title}</p><p className="mt-1 text-xs text-muted-foreground">{c.id} · {c.status}</p><p className="mt-2 text-xs text-muted-foreground">Creative: {db.creatives.find(x=>x.id===c.creativeId)?.title??"Missing"}</p><div className="mt-3 flex flex-wrap gap-2">{c.status==="submitted"?<AdminAction onClick={()=>run(()=>useDemoStore.getState().reviewCampaign(demoAdmin,c.id,"under_review"),"Campaign "+c.id)}>Start review</AdminAction>:<><AdminAction onClick={()=>run(()=>useDemoStore.getState().reviewCampaign(demoAdmin,c.id,"approved"),"Campaign "+c.id)}>Approve</AdminAction><AdminAction onClick={()=>run(()=>useDemoStore.getState().reviewCampaign(demoAdmin,c.id,"changes_requested"),"Campaign "+c.id)}>Request changes</AdminAction><AdminAction onClick={()=>run(()=>useDemoStore.getState().reviewCampaign(demoAdmin,c.id,"rejected"),"Campaign "+c.id)}>Reject</AdminAction></>}</div></article>)}{!campaigns.length&&<p className="text-sm text-muted-foreground">No submitted campaigns are awaiting review.</p>}<AdminNavLink href="/admin/campaigns">Full campaign directory</AdminNavLink></CardContent></Card>
   <Card><CardHeader><CardTitle>Creative Metadata Review</CardTitle></CardHeader><CardContent className="space-y-3">{creatives.map(c=><article key={c.id} className="rounded-xl border border-[#e0eafa] p-4"><p className="font-bold text-brand-navy">{c.title}</p><p className="mt-1 text-xs text-muted-foreground">{c.id} · {c.format} · {c.placement.replaceAll("_"," ")} · {c.approval}</p><p className="mt-2 text-xs text-muted-foreground">No actual media file has been submitted for inspection.</p><div className="mt-3 flex flex-wrap gap-2"><AdminAction onClick={()=>reviewCreative(c.id,"approved")}>Mark approved (demo)</AdminAction><AdminAction onClick={()=>reviewCreative(c.id,"rejected")}>Reject</AdminAction></div></article>)}{!creatives.length&&<p className="text-sm text-muted-foreground">No creative records require review.</p>}<AdminNavLink href="/admin/drivers">Driver verifications</AdminNavLink></CardContent></Card>
  </div>
 </main></AdminAccess>;
}
