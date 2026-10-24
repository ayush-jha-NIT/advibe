"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, Info, List, MapPin, MapPinned, Monitor, Navigation, Search} from "lucide-react";
import {createDemoSeed} from "@/data/demo-seed";
import {InfoNote} from "./marketing-blocks";
const seed=createDemoSeed();
const cities=["Prayagraj","Lucknow","Delhi","Mumbai","Bengaluru","Hyderabad","Pune","Chennai","Kolkata"];
const coordinates:Record<string,{x:number;y:number}>={"Civil Lines":{x:47,y:40},Katra:{x:69,y:34},Naini:{x:55,y:77},Hazratganj:{x:52,y:53}};
export function LocationSearch(){
 const [city,setCity]=React.useState("Prayagraj");
 const [query,setQuery]=React.useState("");
 const [mode,setMode]=React.useState<"City"|"Area"|"Route"|"Landmark">("City");
 const [view,setView]=React.useState<"map"|"list">("map");
 const [selected,setSelected]=React.useState<string|null>("loc-1");
 React.useEffect(()=>{
  const frame=window.requestAnimationFrame(()=>{
   const raw=new URLSearchParams(window.location.search).get("city");
   if(raw&&cities.some(c=>c.toLowerCase()===raw.toLowerCase())){
    const found=cities.find(c=>c.toLowerCase()===raw.toLowerCase())!;
    setCity(found);
    setSelected(null);
   }
  });
  return ()=>window.cancelAnimationFrame(frame);
 },[]);
 const records=seed.locations.filter(l=>l.city===city&&(!query||[l.name,l.zone,l.city].some(v=>v.toLowerCase().includes(query.trim().toLowerCase()))));
 const selection=records.find(l=>l.id===selected)??records[0];
 const count=(locId:string)=>seed.screens.filter(s=>s.locationId===locId).length;
 const modeDescription={City:"Search by city and explore its sample areas.",Area:"Enter an area such as Civil Lines or Katra.",Route:"Route search requires live route inventory; sample zones are shown below.",Landmark:"Try a landmark or locality name in the demo dataset."}[mode];
 return <div className="space-y-5">
  <div className="flex flex-wrap gap-2" role="group" aria-label="Location search mode">{(["City","Area","Route","Landmark"] as const).map(m=><button key={m} onClick={()=>setMode(m)} aria-pressed={mode===m} className={"min-h-11 rounded-full border px-4 text-sm font-semibold "+(mode===m?"border-brand-blue bg-brand-blue text-white":"border-[#cfdff5] bg-white text-[#3b5684] hover:border-brand-blue")}>{m}</button>)}</div>
  <div className="grid gap-3 rounded-xl border border-[#d8e8fa] bg-white p-4 sm:grid-cols-[minmax(170px,.65fr)_minmax(0,1fr)_auto]">
   <label className="grid gap-1.5 text-xs font-bold text-brand-navy">Select city<select value={city} onChange={e=>{setCity(e.target.value);setSelected(null);}} className="min-h-11 rounded-lg border border-[#cadaf4] bg-white px-3 text-sm">{cities.map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="grid gap-1.5 text-xs font-bold text-brand-navy">Area or landmark<div className="flex min-h-11 items-center gap-2 rounded-lg border border-[#cadaf4] px-3"><Search className="size-4 text-brand-blue"/><input className="w-full min-w-0 text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==="Route"?"Search sample zone":mode==="Landmark"?"Search locality": "Search areas and zones"}/></div></label>
   <div className="flex items-end"><Link href="/signup?role=advertiser" className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-5 text-sm font-bold text-white hover:bg-[#0052db]">Plan Campaign <ArrowRight className="size-4" aria-hidden/></Link></div>
  </div>
  <p className="text-xs text-muted-foreground">{modeDescription}</p>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Choose city">{cities.map(c=><button key={c} aria-pressed={city===c} onClick={()=>{setCity(c);setSelected(null);setQuery("");}} className={"min-h-10 rounded-xl border px-3 text-xs font-semibold "+(city===c?"border-brand-blue bg-[#e8f1ff] text-brand-blue":"border-[#d9e7fa] bg-white text-brand-navy hover:border-brand-blue")}>{c}</button>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
   <div className="overflow-hidden rounded-xl border border-[#d8e8fa] bg-white">
    <div className="flex items-center justify-between gap-2 border-b border-[#d8e8fa] p-3"><h3 className="font-bold text-brand-navy">Example locations in {city}</h3><div className="flex rounded-lg border border-[#ccdef5] p-0.5"><button type="button" aria-label="Map view" aria-pressed={view==="map"} onClick={()=>setView("map")} className={"grid size-10 place-items-center rounded-md "+(view==="map"?"bg-brand-blue text-white":"text-brand-blue")}><MapPinned className="size-5"/></button><button type="button" aria-label="List view" aria-pressed={view==="list"} onClick={()=>setView("list")} className={"grid size-10 place-items-center rounded-md "+(view==="list"?"bg-brand-blue text-white":"text-brand-blue")}><List className="size-5"/></button></div></div>
    {view==="map"?<div className="relative isolate h-[350px] overflow-hidden bg-[#eaf3ec] sm:h-[410px]" aria-label={"Illustrative map for "+city}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 600 410" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="600" height="410" fill="#edf4ec"/><path d="M-100 310 Q160 150 320 350 T720 230" fill="none" stroke="#b4dff2" strokeWidth="55"/><path d="M-100 310 Q160 150 320 350 T720 230" fill="none" stroke="#d9f2ff" strokeWidth="45"/>
       {Array.from({length:9},(_,i)=><path key={"h"+i} d={"M0 "+(i*54)+" Q290 "+(i*54-60)+" 600 "+(i*54+22)} stroke="#fff" strokeWidth={i%3===0?8:4} fill="none"/>)}
       {Array.from({length:12},(_,i)=><path key={"v"+i} d={"M"+(i*57)+" 0 Q"+(i*57+80)+" 205 "+(i*57-30)+" 410"} stroke="#fff" strokeWidth="5" fill="none"/>)}
       <g fill="#d3eaca"><ellipse cx="125" cy="85" rx="74" ry="39"/><ellipse cx="490" cy="290" rx="81" ry="51"/></g>
      </svg>
      <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-[#d5e3f5] bg-white/95 px-4 py-2 text-base font-extrabold text-brand-navy shadow">{city} · Concept map</div>
      {records.map((area,i)=>{const p=coordinates[area.name]??{x:30+i*20,y:47};return <button type="button" key={area.id} aria-pressed={selection?.id===area.id} aria-label={"Select "+area.name} onClick={()=>setSelected(area.id)} className={"absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border-2 border-white px-3 py-2 text-xs font-bold text-white shadow-lg "+(selection?.id===area.id?"bg-brand-orange":"bg-brand-blue")} style={{left:p.x+"%",top:p.y+"%"}}><MapPin className="size-4" aria-hidden/>{area.name}</button>})}
      <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 p-2 text-[11px] text-muted-foreground"><Info className="mr-1 inline size-3.5" aria-hidden/>Schematic only · Not a live map</span>
     </div>:<div className="divide-y divide-[#e0eafb]">{records.map(area=><button key={area.id} onClick={()=>setSelected(area.id)} className={"flex min-h-16 w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-[#f0f6ff] "+(selection?.id===area.id?"bg-[#eaf3ff]":"")}><span className="font-bold">{area.name}<span className="block text-xs font-normal text-muted-foreground">Zone {area.zone} · {city}</span></span><span className="text-xs text-brand-blue">{count(area.id)} demo screen(s)</span></button>)}</div>}
    {!records.length&&<p className="p-5 text-sm text-muted-foreground">No example records match these filters. This does not establish real-world unavailability.</p>}
   </div>
   <div className="space-y-4">{selection?<div className="rounded-xl border border-[#d8e8fa] bg-white p-5"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase text-brand-blue">Selected demo area</p><h3 className="mt-2 text-xl font-extrabold text-brand-navy">{selection.name}, {selection.city}</h3></div><span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-bold text-brand-blue">Zone {selection.zone}</span></div>
     <div className="mt-5 grid grid-cols-2 gap-3">{[["Sample screens",String(count(selection.id))],["Inventory status","Not verified"],["Location type","Planning example"],["Live booking","Not connected"]].map(([label,value])=><div className="rounded-lg bg-[#f2f7ff] p-3" key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold text-brand-navy">{value}</p></div>)}</div>
     <Link href="/signup?role=advertiser" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-bold text-white hover:bg-[#0054df]">Plan for this area <ArrowRight className="size-4"/></Link>
    </div>:<div className="rounded-xl border border-[#d8e8fa] bg-white p-6"><MapPin className="size-7 text-brand-blue"/><h3 className="mt-3 text-lg font-extrabold text-brand-navy">No sample inventory selected</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Only Prayagraj and Lucknow have fictional records in the frontend dataset. Contact the team for verified locations.</p></div>}
    <div className="rounded-xl border border-[#d8e8fa] bg-[#f5f9ff] p-5"><h3 className="flex items-center gap-2 font-extrabold text-brand-navy"><Navigation className="size-5 text-brand-blue"/> Planning across India</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">City options mirror the approved design references. Their presence does not mean AdVibe is operating there.</p><div className="mt-4 flex items-center gap-3 text-xs text-[#41638c]"><Monitor className="size-5 text-brand-blue"/> Confirm actual screen count, supported placement and price before paying.</div></div>
   </div>
  </div>
  <InfoNote>All screen counts here come from fictional demo data. The map is schematic, and no current availability, actual GPS coordinates or service-area coverage is being claimed.</InfoNote>
 </div>;
}
