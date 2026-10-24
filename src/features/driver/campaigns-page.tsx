"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,CalendarDays,FileText,Filter,Monitor,Search,ShieldAlert} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {AssignmentCard,CampaignState,DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverAssignments,driverCampaignRows,filteredDriverCampaigns} from "./operations-model";
import type {CampaignStatus} from "@/types/domain";

const statuses:CampaignStatus[]=["approved","scheduled","live","paused","completed"];
export function DriverCampaigns(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [search,setSearch]=React.useState(""),[status,setStatus]=React.useState<"all"|CampaignStatus>("all");
 const [expanded,setExpanded]=React.useState<string|null>(null);
 const all=React.useMemo(()=>driverCampaignRows(driverAssignments(db,accountId)),[db,accountId]);
 const matches=React.useMemo(()=>filteredDriverCampaigns(all,search,status),[all,search,status]);
 return <DriverAccess accountId={accountId} hydrated={hydrated}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Driver Partner · Assigned Campaign Records</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">My Campaigns</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Only campaigns associated with confirmed bookings on your own demo screens are listed here.</p></div><Link href="/driver/assigned-ads" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd5f0] px-4 text-sm font-bold text-brand-blue">Daily schedule <ArrowRight className="size-4"/></Link></div>
  <DriverDemoWarning detail="Campaign statuses, creative metadata, booking dates and impressions come from fictional records. A live label does not confirm current playback, GPS, deliveries or driver income."/>
  <div className="grid grid-cols-3 gap-3">{[
   {name:"All booked campaigns",value:all.length,icon:FileText},
   {name:"Marked live",value:all.filter(r=>r.campaign.status==="live").length,icon:Monitor},
   {name:"Confirmed screen links",value:all.reduce((n,r)=>n+r.assignments.length,0),icon:CalendarDays}
  ].map(({name,value,icon:Icon})=><div key={name} className="min-w-0 rounded-xl border border-[#dce7f7] bg-white p-3 sm:p-5"><Icon className="size-5 text-brand-blue"/><p className="mt-2 text-xl font-extrabold text-brand-navy">{value}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">{name}</p></div>)}</div>
  <Card><CardHeader><CardTitle>Find an Assigned Campaign</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(200px,.6fr)]">
    <label><span className="mb-1 block text-xs font-semibold text-[#557292]">Search by campaign, screen or area</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#899fbf]"/><input value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Search booked campaigns" className="min-h-11 w-full rounded-xl border border-[#cadbf0] bg-white pl-10 pr-3 text-sm text-brand-navy outline-none focus:border-brand-blue"/></span></label>
    <label><span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#557292]"><Filter className="size-4"/>Campaign status</span><select value={status} onChange={e=>setStatus(e.target.value as "all"|CampaignStatus)} className="min-h-11 w-full rounded-xl border border-[#cadbf0] bg-white px-3 text-sm text-brand-navy"><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
   </div><p className="mt-3 text-xs text-muted-foreground">Showing {matches.length} of {all.length} confirmed-booking campaign(s)</p></CardContent></Card>
  <section aria-label="Assigned campaign records" className="space-y-4">
   {matches.length?matches.map(({campaign,assignments})=><Card key={campaign.id}><CardContent className="pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-extrabold text-brand-navy">{campaign.title}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{campaign.id}</p></div><CampaignState status={campaign.status}/></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{[
     ["Booked date range",campaign.startDate+" to "+campaign.endDate],
     ["My assigned screens",String(new Set(assignments.map(a=>a.screen.id)).size)],
     ["Creative",assignments[0]?.creative?.title??"Not recorded"]
    ].map(([name,value])=><div key={name} className="rounded-xl bg-[#f7faff] p-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-1 break-words text-sm font-bold text-brand-navy">{value}</p></div>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
     <Badge tone="info">{assignments.length} confirmed demo booking{assignments.length===1?"":"s"}</Badge>
     <button type="button" onClick={()=>setExpanded(expanded===campaign.id?null:campaign.id)} aria-expanded={expanded===campaign.id} aria-controls={"campaign-assignment-"+campaign.id} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">{expanded===campaign.id?"Hide placement details":"View my booked placements"} <ArrowRight className={"size-4 transition "+(expanded===campaign.id?"rotate-90":"")}/></button>
    </div>
    {expanded===campaign.id&&<div id={"campaign-assignment-"+campaign.id} className="mt-3 space-y-3 border-t border-[#e0eafa] pt-4">{assignments.map(a=><AssignmentCard key={a.booking.id} item={a}/>)}</div>}
   </CardContent></Card>):<div className="rounded-xl border border-dashed border-[#c9daef] bg-white p-8"><FileText className="size-8 text-[#8ca9c8]"/><h2 className="mt-3 font-bold text-brand-navy">No booked campaigns match</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">If a campaign was only targeted or awaiting a confirmed booking, it will not appear as your assignment. Adjust search and status filters to view available records.</p></div>}
  </section>
  <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>Drivers cannot change advertiser approvals, ad creatives, booking assignments or campaign lifecycles from this page. Such actions require verified Admin/operator workflows.</p>
 </main></DriverAccess>;
}
