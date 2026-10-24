"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CalendarDays,Clock3,Info,MapPin,Monitor,Search} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {AssignmentCard,DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {dateInIndia,driverAssignments,driverDailySchedule,isISODate,moveDay} from "./operations-model";

function describeDate(date:string):string{
 if(!isISODate(date))return "Choose a date";
 return new Intl.DateTimeFormat("en-IN",{timeZone:"UTC",dateStyle:"full"}).format(new Date(date+"T00:00:00Z"));
}
export function DriverAssignedAds(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [date,setDate]=React.useState(()=>dateInIndia(new Date()));
 const [search,setSearch]=React.useState("");
 const [screen,setScreen]=React.useState("all");
 const [showOnlyOnline,setShowOnlyOnline]=React.useState(false);
 const assigned=React.useMemo(()=>driverAssignments(db,accountId),[db,accountId]);
 const todayRows=React.useMemo(()=>driverDailySchedule(assigned,date),[assigned,date]);
 const display=todayRows.filter(row=>(screen==="all"||screen===row.screen.id)
  &&(!showOnlyOnline||row.screen.status==="online")
  &&(!search.trim()||[row.campaign.title,row.screen.id,row.location?.name??"",row.creative?.title??""].some(s=>s.toLowerCase().includes(search.trim().toLowerCase()))));
 const uniqueScreens=[...new Set(assigned.map(a=>a.screen.id))].sort();
 const days=isISODate(date)?Array.from({length:7},(_,i)=>{const day=moveDay(date,i);return {date:day,count:driverDailySchedule(assigned,day).length};}):[];
 return <DriverAccess accountId={accountId} hydrated={hydrated}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Driver Partner · Booked Ad Calendar</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Assigned Ads & Daily Schedule</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Browse sample booked ad placements by date and the screen assigned to you.</p></div><Link href="/driver/campaigns" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bfd5f0] px-4 text-sm font-bold text-brand-blue">Campaign directory <ArrowRight className="size-4"/></Link></div>
  <DriverDemoWarning detail="Only confirmed bookings on your own screens count as assignments. Targeted screens and provisional bookings are excluded. Daily schedules are derived from fictional campaign dates, not live route telemetry or proof of plays."/>
  <Card><CardHeader><CardTitle>Choose a Day</CardTitle><p className="text-xs text-muted-foreground">Times, if recorded, are user-requested sample windows, not hardware-confirmed delivery.</p></CardHeader><CardContent>
   <div className="flex flex-wrap items-end gap-2">
    <button type="button" aria-label="Previous day" disabled={!isISODate(date)} onClick={()=>setDate(d=>moveDay(d,-1))} className="inline-flex size-11 items-center justify-center rounded-xl border border-[#c9daef] bg-white text-brand-blue disabled:opacity-50"><ArrowLeft className="size-5"/></button>
    <label className="min-w-0 flex-1 sm:flex-none"><span className="mb-1 block text-xs font-semibold text-[#5b7695]">Schedule date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="min-h-11 w-full min-w-0 rounded-xl border border-[#c8d9f1] bg-white px-3 text-sm text-brand-navy"/></label>
    <button type="button" aria-label="Next day" disabled={!isISODate(date)} onClick={()=>setDate(d=>moveDay(d,1))} className="inline-flex size-11 items-center justify-center rounded-xl border border-[#c9daef] bg-white text-brand-blue disabled:opacity-50"><ArrowRight className="size-5"/></button>
    <button type="button" onClick={()=>setDate(dateInIndia(new Date()))} className="min-h-11 rounded-xl bg-[#eaf3ff] px-4 text-sm font-semibold text-brand-blue hover:bg-[#ddecff]">Today (IST)</button>
   </div>
   <h2 className="mt-4 text-sm font-bold text-brand-navy">{describeDate(date)}</h2>
   <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map(d=><button type="button" key={d.date} aria-pressed={d.date===date} onClick={()=>setDate(d.date)} className={"min-h-19 rounded-xl border p-2 text-center "+(d.date===date?"border-brand-blue bg-[#eaf3ff]":"border-[#e0eafa] bg-white hover:border-brand-blue")}>
    <span className="block text-[10px] text-[#617d9e]">{new Intl.DateTimeFormat("en-IN",{timeZone:"UTC",weekday:"short"}).format(new Date(d.date+"T00:00:00Z"))}</span>
    <span className="mt-1 block text-base font-extrabold text-brand-navy">{d.date.slice(-2)}</span>
    <span className="mt-1 block text-[10px] text-[#506b8e]">{d.count} ads</span>
   </button>)}</div>
  </CardContent></Card>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,.65fr)]">
   <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>Scheduled Sample Placements</CardTitle><p className="mt-1 text-xs text-muted-foreground">{todayRows.length} confirmed booking{todayRows.length===1?"":"s"} for {date||"selected date"}</p></div><Badge tone="info">{display.length} shown</Badge></div></CardHeader><CardContent>
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(160px,.8fr)]">
     <label><span className="mb-1 block text-xs font-semibold text-[#53708f]">Search assigned ad or area</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#8aa0bc]"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Campaign, creative, screen" className="min-h-11 w-full rounded-xl border border-[#cdddf0] bg-white pl-10 pr-3 text-sm text-brand-navy"/></span></label>
     <label><span className="mb-1 block text-xs font-semibold text-[#53708f]">Assigned screen</span><select value={screen} onChange={e=>setScreen(e.target.value)} className="min-h-11 w-full rounded-xl border border-[#cdddf0] bg-white px-3 text-sm text-brand-navy"><option value="all">All my screens</option>{uniqueScreens.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
    </div>
    <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-[#547091]"><input type="checkbox" className="size-4 accent-[#0866ff]" checked={showOnlyOnline} onChange={e=>setShowOnlyOnline(e.target.checked)}/>Sample online screens only</label>
    <div className="space-y-3">{display.length?display.map(item=><AssignmentCard key={item.booking.id} item={item}/>):<div className="rounded-xl border border-dashed border-[#cbdcf1] bg-[#f8fbff] p-7"><CalendarDays className="size-8 text-[#89a6c9]"/><p className="mt-3 text-sm font-bold text-brand-navy">No confirmed assigned ads match</p><p className="mt-1 text-xs leading-6 text-muted-foreground">The selected date may be outside booked campaign dates, or a filter may exclude all rows. No delivery or playback is inferred.</p></div>}</div>
   </CardContent></Card>
   <div className="space-y-4"><Card><CardHeader><CardTitle>Day Snapshot</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="flex items-center gap-3 rounded-xl bg-[#f5f9ff] p-3"><Monitor className="size-6 text-brand-blue"/><div><p className="text-xs text-muted-foreground">Assigned sample screens</p><p className="text-xl font-extrabold text-brand-navy">{new Set(todayRows.map(x=>x.screen.id)).size}</p></div></div>
    <div className="flex items-center gap-3 rounded-xl bg-[#f5f9ff] p-3"><MapPin className="size-6 text-brand-blue"/><div><p className="text-xs text-muted-foreground">Distinct example areas</p><p className="text-xl font-extrabold text-brand-navy">{new Set(todayRows.map(x=>x.location?.id).filter(Boolean)).size}</p></div></div>
    <div className="flex items-center gap-3 rounded-xl bg-[#f5f9ff] p-3"><Clock3 className="size-6 text-brand-blue"/><div><p className="text-xs text-muted-foreground">Ad booking records today</p><p className="text-xl font-extrabold text-brand-navy">{todayRows.length}</p></div></div>
   </CardContent></Card>
   <Card><CardHeader><CardTitle>How Scheduling Works</CardTitle></CardHeader><CardContent><div className="flex items-start gap-2"><Info className="mt-0.5 size-5 shrink-0 text-brand-blue"/><p className="text-xs leading-6 text-muted-foreground">The calendar uses stored campaign start/end dates and any saved weekday/time preferences. A date may be scheduled even if a sample device flag is offline. No driver trip times, vehicle routes, verified ad plays or exposure logs exist yet.</p></div><Link href="/driver/vehicle" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Review my screen status <ArrowRight className="size-4"/></Link></CardContent></Card></div>
  </div>
 </main></DriverAccess>;
}
