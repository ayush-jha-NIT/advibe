"use client";
import * as React from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowRight,CalendarDays,Check,Info,Layers3,List,MapPin,MapPinned,Monitor,Search,ShieldAlert} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {inclusiveDays,moneyINR} from "@/lib/demo-rules";
import {filterTargetScreens} from "./targeting-helpers";
import {displayEligibility,formatDescriptions,placements,sampleRate} from "./library-model";
import {localToday} from "./wizard-model";
import {usePlanNavigation} from "./plan-navigation";
import {useAdvertiserData} from "./shared";
import type {Placement,Screen} from "@/types/domain";

type Availability="eligible"|"offline"|"unverified"|"booked";
const label:Record<Availability,string>={eligible:"Eligible sample",offline:"Offline",unverified:"Unverified",booked:"Booked in demo"};
const tone:Record<Availability,"success"|"warning"|"danger"|"neutral">={eligible:"success",offline:"neutral",unverified:"warning",booked:"danger"};
const field="min-h-11 w-full min-w-0 rounded-xl border border-[#ccdbf0] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d8e9ff]";
export function AdvertiserLocations(){
 const params=useSearchParams();
 const {db,accountId,hydrated}=useAdvertiserData();
 const {ready,applyToWizard}=usePlanNavigation(accountId);
 const initial=params.get("format");
 const [placement,setPlacement]=React.useState<Placement>(()=>placements.includes(initial as Placement)?initial as Placement:"auto_side");
 const [city,setCity]=React.useState("All cities");
 const [zone,setZone]=React.useState("All zones");
 const [query,setQuery]=React.useState("");
 const [statusFilter,setStatusFilter]=React.useState<"all"|"eligible">("all");
 const [view,setView]=React.useState<"map"|"list">("map");
 const [start,setStart]=React.useState(""),[end,setEnd]=React.useState("");
 const [selected,setSelected]=React.useState<string[]>([]);
 const [feedback,setFeedback]=React.useState("");
 const today=localToday(new Date());
 const periodStart=start||today,periodEnd=end||periodStart;
 let dateError="";
 try{inclusiveDays(periodStart,periodEnd);if(periodStart<today)dateError="Start date cannot be in the past.";}
 catch(e){dateError=e instanceof Error?e.message:"Invalid date range.";}
 const cities=["All cities",...new Set(db.locations.map(loc=>loc.city))];
 const zones=["All zones",...new Set(db.locations.filter(loc=>city==="All cities"||loc.city===city).map(loc=>loc.zone))];
 const matching=React.useMemo(()=>filterTargetScreens(db.screens.filter(s=>s.placement===placement),db.locations,{city,zone,query}),[db,placement,city,zone,query]);
 const states=React.useMemo(()=>matching.map(s=>({screen:s,status:dateError?"offline" as Availability:displayEligibility(db,s,periodStart,periodEnd)})),[db,matching,periodStart,periodEnd,dateError]);
 const visible=states.filter(item=>statusFilter==="all"||item.status==="eligible");
 const eligible=states.filter(item=>item.status==="eligible").map(x=>x.screen);
 const validIds=new Set(eligible.map(x=>x.id));
 const stale=selected.filter(id=>!validIds.has(id));
 const selection=selected.filter(id=>validIds.has(id));
 const rates=selection.map(id=>{
  const screen=db.screens.find(s=>s.id===id)!;
  const c=db.locations.find(l=>l.id===screen.locationId)?.city??"";
  return sampleRate(db,screen.placement,c,periodStart);
 });
 const indicative=rates.length&&!rates.some(rate=>rate===null)?rates.reduce<number>((sum,rate)=>sum+(rate??0),0):null;
 function choosePlacement(p:Placement){setPlacement(p);setSelected([]);setFeedback("");}
 function toggle(s:Screen){if(!validIds.has(s.id))return;setSelected(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id]);setFeedback("");}
 function selectVisible(){setSelected(prev=>[...new Set([...prev,...visible.filter(v=>v.status==="eligible").map(v=>v.screen.id)])]);}
 function addToWizard(){
  setFeedback("");
  if(dateError){setFeedback(dateError);return;}
  if(!selection.length){setFeedback("Select at least one eligible demonstration screen first.");return;}
  const result=applyToWizard({placement,screenIds:selection,startDate:periodStart,endDate:periodEnd});
  if(!result&&accountId==="not-provisioned")setFeedback("Use the preset Advertiser demo identity to save campaign planning choices.");
 }
 if(!hydrated)return <div role="status" className="p-8 text-sm text-muted-foreground">Loading demo screen locations…</div>;
 return <main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-4"><div>
   <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Screen explorer · DEMO</p>
   <h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Locations & Screens</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Search fictional city zones, inspect display eligibility and save a provisional screen plan to your campaign wizard.</p></div>
   <Link href="/advertiser/ad-formats" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b2ccf0] px-4 text-sm font-bold text-brand-blue">Compare Ad Formats <ArrowRight className="size-4"/></Link>
  </div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d6e7fa] bg-[#eff7ff] p-4 text-xs leading-6 text-[#46688d]"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>All screen counts, cities, device statuses and bookings are invented sample records. The schematic panel does not show actual GPS coordinates. Selecting a screen does not reserve hardware, guarantee delivery, or submit payment.</p>
  <Card><CardHeader><CardTitle>Discover screen placements</CardTitle></CardHeader><CardContent className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label className="block"><span className="mb-1 block text-xs font-bold text-[#516b8b]">Ad placement</span><select value={placement} onChange={e=>choosePlacement(e.target.value as Placement)} className={field}>{placements.map(p=><option key={p} value={p}>{formatDescriptions[p].name}</option>)}</select></label>
    <label className="block"><span className="mb-1 block text-xs font-bold text-[#516b8b]">City</span><select value={city} onChange={e=>{setCity(e.target.value);setZone("All zones");}} className={field}>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
    <label className="block"><span className="mb-1 block text-xs font-bold text-[#516b8b]">Zone</span><select value={zone} onChange={e=>setZone(e.target.value)} className={field}>{zones.map(z=><option key={z}>{z}</option>)}</select></label>
    <label className="block"><span className="mb-1 block text-xs font-bold text-[#516b8b]">Area / screen ID</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#89a1bd]"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} className={field+" pl-9"} placeholder="Civil Lines, scr-2…"/></div></label>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
    <label><span className="mb-1 flex items-center gap-2 text-xs font-bold text-[#516b8b]"><CalendarDays className="size-4"/>From date</span><input type="date" min={today} className={field} value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label><span className="mb-1 block text-xs font-bold text-[#516b8b]">Through date</span><input type="date" min={start||today} className={field} value={end} onChange={e=>setEnd(e.target.value)}/></label>
    <div className="flex items-end"><button type="button" aria-pressed={statusFilter==="eligible"} onClick={()=>setStatusFilter(s=>s==="eligible"?"all":"eligible")} className={"min-h-11 rounded-xl border px-4 text-sm font-semibold "+(statusFilter==="eligible"?"border-brand-blue bg-brand-blue text-white":"border-[#d0dff3] bg-white text-brand-navy")}>Eligible only</button></div>
   </div>
   {dateError&&<p role="alert" className="rounded-lg border border-[#f8d1ba] bg-[#fff5ef] p-3 text-xs text-[#986237]">{dateError}</p>}
  </CardContent></Card>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
   ["Matching screens",matching.length],["Eligible for dates",eligible.length],
   ["Selected eligible",selection.length],["Not currently eligible",stale.length]
  ].map(([title,value])=><div key={title} className="rounded-xl border border-[#dce8f7] bg-white p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-extrabold text-brand-navy">{value}</p></div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
   <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dce8f7] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1ebf9] p-4"><h2 className="font-bold text-brand-navy">Explore Sample Screens <span className="text-xs font-normal text-muted-foreground">({visible.length})</span></h2>
     <div className="flex gap-2"><button aria-pressed={view==="map"} type="button" onClick={()=>setView("map")} className={"inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm "+(view==="map"?"bg-brand-blue text-white":"text-brand-blue")}><MapPinned className="size-4"/>Map</button><button aria-pressed={view==="list"} type="button" onClick={()=>setView("list")} className={"inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm "+(view==="list"?"bg-brand-blue text-white":"text-brand-blue")}><List className="size-4"/>List</button></div>
    </div>
    {view==="map"&&<div className="relative isolate min-h-64 overflow-hidden bg-[#e9f1e6]" aria-label="Illustrative location diagram, not a geographic map"><svg className="absolute inset-0 size-full" viewBox="0 0 560 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
     <rect width="560" height="300" fill="#eaf4e9"/><path d="M-20 240 Q240 50 580 270" fill="none" stroke="#bcdcf0" strokeWidth="45"/>
     {Array.from({length:8},(_,i)=><path key={i} d={"M"+(i*93-40)+" 0 L"+(i*93+80)+" 300"} stroke="#fff" strokeWidth={i%2?5:9}/>)}
    </svg><div className="relative z-10 grid min-h-64 grid-cols-2 items-center justify-items-center gap-3 px-3 py-12 sm:grid-cols-3">
     {visible.map(({screen,status})=><button key={screen.id} disabled={status!=="eligible"} type="button" aria-pressed={selected.includes(screen.id)} onClick={()=>toggle(screen)}
      className={"inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border-2 border-white px-3 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-70 "+(selected.includes(screen.id)?"bg-brand-orange":status==="eligible"?"bg-brand-blue":"bg-[#586b85]")}>
      <MapPin className="size-4 shrink-0"/>{screen.id}</button>)}
    </div><span className="absolute bottom-2 left-2 z-20 rounded-lg bg-white/95 px-2 py-1 text-[10px] text-[#476082]">Schematic demo · not mapped positions</span></div>}
    <div className="space-y-3 p-4">
     {visible.map(({screen,status})=>{
      const location=db.locations.find(l=>l.id===screen.locationId);
      const rate=sampleRate(db,placement,location?.city??"",periodStart);
      return <article key={screen.id} className={"flex flex-wrap items-start gap-3 rounded-xl border p-4 "+(selected.includes(screen.id)?"border-brand-blue bg-[#f1f7ff]":"border-[#dce8f7] bg-white")}>
       <button type="button" disabled={status!=="eligible"} aria-label={"Select "+screen.id} aria-pressed={selected.includes(screen.id)} onClick={()=>toggle(screen)}
        className={"grid size-11 shrink-0 place-items-center rounded-lg border disabled:opacity-40 "+(selected.includes(screen.id)?"border-brand-blue bg-brand-blue text-white":"border-[#c4d4ed] bg-white text-brand-blue")}><Check className="size-5"/></button>
       <div className="min-w-0 flex-1"><h3 className="font-bold text-brand-navy">{location?.name??"Sample location"}, {location?.city??"Unknown city"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{screen.id} · Zone {location?.zone??"?"} · {screen.sizeInches}&quot; illustrative display</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone={tone[status]}>{label[status]}</Badge><span className="text-xs text-muted-foreground">{rate===null?"No sample rate":moneyINR(rate*100)+" / screen-day (example)"}</span></div>
       </div></article>;
     })}
     {!visible.length&&<div className="rounded-xl border border-dashed border-[#cadbf2] bg-[#f8fbff] p-6 text-center"><MapPin className="mx-auto size-7 text-[#85a3c9]"/><p className="mt-2 text-sm font-semibold text-brand-navy">No matching demo screens</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Try another placement, city, date or switch off “Eligible only”. This does not imply real-world service unavailability.</p></div>}
    </div>
   </section>
   <aside className="h-fit space-y-4 lg:sticky lg:top-24"><Card><CardHeader><CardTitle>Campaign Targeting Plan</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="rounded-xl bg-[#eff6ff] p-4"><p className="text-sm font-extrabold text-brand-navy">{formatDescriptions[placement].name}</p><p className="mt-2 text-xs text-muted-foreground">Planning period: {periodStart} → {periodEnd}</p><p className="mt-1 text-xs text-muted-foreground">{selection.length} eligible selected screen(s)</p></div>
    {selection.length?<div className="flex flex-wrap gap-2">{selection.map(id=><span key={id} className="inline-flex items-center gap-1 rounded-lg bg-[#e7f2ff] px-3 py-2 text-xs font-bold text-brand-blue">{id}<button className="ml-1 inline-flex size-8 items-center justify-center rounded-md hover:bg-[#c9e1ff]" aria-label={"Remove "+id} type="button" onClick={()=>setSelected(s=>s.filter(x=>x!==id))}>×</button></span>)}</div>:<p className="rounded-lg bg-[#f8fbff] p-3 text-xs text-muted-foreground">Choose an eligible screen to build your sample campaign plan.</p>}
    {stale.length>0&&<p role="alert" className="rounded-lg border border-[#f7ccae] bg-[#fff6ed] p-3 text-xs text-[#905a2d]">{stale.length} screen(s) in your selection are not eligible for these filters/dates. They will not be sent to the wizard.</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!visible.some(x=>x.status==="eligible")} onClick={selectVisible}>Select visible eligible</Button><Button variant="outline" disabled={!selected.length} onClick={()=>setSelected([])}>Clear all</Button></div>
    <div className="border-t border-[#e3ebf7] pt-3">
     <p className="text-xs text-muted-foreground">Combined example base daily rate</p><p className="mt-1 text-xl font-extrabold text-brand-navy">{indicative===null?"Unpriced":moneyINR(indicative*100)}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{indicative!==null?"Excludes duration, any discounts and illustrative GST; final quote calculated in wizard.":"Not all selected targets have an active sample price."}</p>
    </div>
    {feedback&&<p role="status" className="rounded-lg bg-[#fff5e9] p-3 text-xs text-[#865527]">{feedback}</p>}
    <Button className="w-full" disabled={!ready||accountId==="not-provisioned"||!selection.length||!!dateError} onClick={addToWizard}>
     <Layers3 className="size-4"/>Use selection in wizard <ArrowRight className="size-4"/></Button>
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0"/>Your choice is stored as a provisional wizard plan, not a reservation. Any existing unsaved wizard choices require confirmation before replacement.</p>
   </CardContent></Card></aside>
  </div>
  <p className="flex items-center gap-2 text-xs text-muted-foreground"><Monitor className="size-4"/>No live GPS coordinates, vehicle location services or booking backend are used by this explorer.</p>
 </main>;
}
