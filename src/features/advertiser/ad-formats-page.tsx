"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,Check,CheckCircle2,Info,MonitorPlay,Search,ShieldAlert} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import {availableScreens,moneyINR} from "@/lib/demo-rules";
import {localToday} from "./wizard-model";
import {formatDescriptions,formatGroups,placements,sampleRate,type FormatGroup} from "./library-model";
import {useAdvertiserData} from "./shared";
import {usePlanNavigation} from "./plan-navigation";
import type {Placement} from "@/types/domain";

export function AdvertiserAdFormats(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const {ready,useInWizard}=usePlanNavigation(accountId);
 const [group,setGroup]=React.useState<FormatGroup>("all");
 const [search,setSearch]=React.useState("");
 const [city,setCity]=React.useState("Prayagraj");
 const [selected,setSelected]=React.useState<Placement>("auto_rear");
 const [compare,setCompare]=React.useState(false);
 const today=localToday(new Date());
 const cities=[...new Set(db.locations.map(l=>l.city))].sort();
 const available=React.useMemo(()=>{
  try{return availableScreens(db,today,today);}catch{return [];}
 },[db,today]);
 const rows=placements.filter(p=>(group==="all"||formatDescriptions[p].group===group)
  &&(!search||[formatDescriptions[p].name,formatDescriptions[p].description,formatDescriptions[p].best].some(s=>s.toLowerCase().includes(search.toLowerCase()))));
 const chosen=formatDescriptions[selected];
 const selectedRate=sampleRate(db,selected,city,today);
 const selectedCount=available.filter(s=>s.placement===selected&&db.locations.some(loc=>loc.id===s.locationId&&loc.city===city)).length;
 if(!hydrated)return <div role="status" className="p-8 text-sm text-muted-foreground">Loading advertising formats…</div>;
 return <main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div>
   <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Format selection · DEMO</p>
   <h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Ad Formats</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Compare vehicle placements, creative compatibility and fictional price cards before planning a campaign.</p></div>
   <Link href="/advertiser/creatives" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b4ccef] px-4 text-sm font-bold text-brand-blue hover:bg-[#edf5ff]">My Creative Library <ArrowRight className="size-4"/></Link>
  </div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d4e5fb] bg-[#eff7ff] px-4 py-3 text-xs leading-6 text-[#496789]"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>Pricing, screens and compatibility illustrations use fictional data. Actual device dimensions, deployment, approved formats and availability require operator confirmation. The format selector does not reserve inventory.</p>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter ad placements">{formatGroups.map(g=><button key={g} aria-pressed={group===g} type="button" onClick={()=>setGroup(g)} className={"min-h-11 rounded-xl border px-4 text-sm font-semibold capitalize "+(group===g?"border-brand-blue bg-brand-blue text-white":"border-[#d2e1f4] bg-white text-brand-navy hover:border-brand-blue")}>{g==="all"?"All Formats":g}</button>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.85fr)]">
   <section className="space-y-4">
    <label className="block"><span className="sr-only">Search advertising formats</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#8aa0be]"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} className="min-h-11 w-full rounded-xl border border-[#d0dff2] bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-blue" placeholder="Search placements or use cases"/></div></label>
    <div className="grid gap-4 sm:grid-cols-2">{rows.map(type=>{
     const info=formatDescriptions[type];
     const n=available.filter(s=>s.placement===type&&db.locations.some(loc=>loc.id===s.locationId&&loc.city===city)).length;
     const rate=sampleRate(db,type,city,today);
     return <article key={type} className={"overflow-hidden rounded-2xl border bg-white shadow-sm "+(type===selected?"border-brand-blue ring-1 ring-brand-blue":"border-[#dce8f7]")}>
      <div className="aspect-[1.7]"><FormatPreviewArt type={type}/></div>
      <div className="p-4"><h2 className="font-extrabold text-brand-navy">{info.name}</h2><p className="mt-1 min-h-12 text-xs leading-5 text-muted-foreground">{info.description}</p>
       <div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge tone="info">{info.group}</Badge><Badge tone={n?"success":"neutral"}>{n} eligible demo screen{n===1?"":"s"}</Badge></div>
       <p className="mt-3 text-xs text-[#516c8d]">{rate===null?"No sample rate for selected city":moneyINR(rate*100)+" per screen / day (example)"}</p>
       <button type="button" onClick={()=>setSelected(type)} aria-pressed={type===selected} className={"mt-4 min-h-11 w-full rounded-xl border px-3 text-sm font-bold "+(type===selected?"border-brand-blue bg-brand-blue text-white":"border-[#93bafa] text-brand-blue hover:bg-[#f0f6ff]")}>{type===selected?"Selected for comparison":"Explore format"}</button>
      </div>
     </article>;
    })}</div>
    {!rows.length&&<p className="rounded-xl border border-dashed border-[#c7d9ed] bg-white p-6 text-sm text-muted-foreground">No ad formats match your search.</p>}
   </section>
   <aside className="h-fit space-y-4 lg:sticky lg:top-24">
    <Card><CardHeader><CardTitle>Placement Details</CardTitle></CardHeader><CardContent className="space-y-4">
     <div className="aspect-[1.7] overflow-hidden rounded-xl"><FormatPreviewArt type={selected}/></div>
     <h2 className="text-xl font-extrabold text-brand-navy">{chosen.name}</h2><p className="text-sm leading-6 text-muted-foreground">{chosen.description}</p>
     <div className="rounded-xl bg-[#f1f7ff] p-4">
      <label className="block text-xs font-bold text-brand-navy">Sample city<select value={city} onChange={e=>setCity(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-[#c7daf3] bg-white px-3 text-sm">{cities.map(c=><option key={c}>{c}</option>)}</select></label>
      <dl className="mt-4 space-y-3 text-sm">{[
       ["Best for",chosen.best],["Media supported","PNG, JPEG, GIF, MP4 previews"],
       ["Eligible demo screens",String(selectedCount)],["Sample daily rate",selectedRate===null?"Not supplied":moneyINR(selectedRate*100)],
       ["Creative approval","Admin workflow pending"]
      ].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-[#dfeafa] pb-2 last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="max-w-[60%] text-right font-semibold text-brand-navy">{v}</dd></div>)}</dl>
     </div>
     <Button type="button" className="w-full" disabled={!ready||accountId==="not-provisioned"} onClick={()=>useInWizard({placement:selected})}><CheckCircle2 className="size-4"/>Use this format in wizard</Button>
     <Link href={"/advertiser/locations?format="+encodeURIComponent(selected)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#9fc4f9] text-sm font-bold text-brand-blue hover:bg-[#f0f6ff]">Explore eligible screens <ArrowRight className="size-4"/></Link>
     <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0"/>Applying the format requires confirmation before overwriting another unsaved wizard selection. It does not submit or book a campaign.</p>
    </CardContent></Card>
   </aside>
  </div>
  <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Placement Comparison</CardTitle><Button variant="outline" onClick={()=>setCompare(v=>!v)}>{compare?"Hide comparison":"Show all formats"}</Button></div></CardHeader>
   {compare&&<CardContent><div role="region" aria-label="Format comparison table" tabIndex={0} className="overflow-x-auto rounded-xl border border-[#dce8f7]"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#eff6ff]"><tr>{["Format","Vehicle group","Best for","Daily demo rate in "+city].map(h=><th scope="col" key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{placements.map(p=><tr className="border-t border-[#e6edf8]" key={p}><th className="p-3">{formatDescriptions[p].name}</th><td className="p-3 capitalize">{formatDescriptions[p].group}</td><td className="p-3">{formatDescriptions[p].best}</td><td className="p-3">{sampleRate(db,p,city,today)===null?"No demo rate":moneyINR(sampleRate(db,p,city,today)!*100)}</td></tr>)}</tbody></table></div></CardContent>}
  </Card>
  <p className="flex items-center gap-2 text-xs text-muted-foreground"><MonitorPlay className="size-4"/><Check className="size-4"/>Creative compatibility is determined by the selected placement. Dimensions shown in the concept art are not device specifications.</p>
 </main>;
}
