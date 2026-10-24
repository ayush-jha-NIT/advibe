"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, Check, Monitor, Target} from "lucide-react";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import {formatCards,InfoNote} from "./marketing-blocks";
const extras=[
 {title:"Auto Side Screen",type:"auto_side" as const,description:"Side-facing vehicle screen for street visibility.",spec:"Placement-specific device",best:"Street-level campaigns"},
 {title:"Car Rear Screen",type:"car_rear" as const,description:"Rear-facing display for vehicle-following traffic.",spec:"Placement-specific device",best:"Brand awareness"},
];
const all=[...formatCards,...extras];
type CatalogItem=(typeof all)[number];
export function FormatCatalogue(){
 const [filter,setFilter]=React.useState<"All"|"Bike"|"Auto"|"Car"|"Other">("All");
 const [selected,setSelected]=React.useState<CatalogItem>(all[1]);
 const [compare,setCompare]=React.useState(false);
 const visible=all.filter(item=>filter==="All"||(filter==="Bike"&&item.type==="bike_rear")||(filter==="Auto"&&item.type.startsWith("auto"))||(filter==="Car"&&item.type.startsWith("car"))||(filter==="Other"&&item.type==="helmet"));
 return <div className="space-y-7">
  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter format types">{(["All","Bike","Auto","Car","Other"] as const).map(f=><button key={f} onClick={()=>setFilter(f)} aria-pressed={filter===f} className={"min-h-11 rounded-full border px-5 text-sm font-semibold "+(filter===f?"border-brand-blue bg-brand-blue text-white":"border-[#cee0f7] bg-white text-brand-navy hover:border-brand-blue")}>{f==="All"?"All Formats":f+" Formats"}</button>)}</div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
   <div className="grid gap-4 sm:grid-cols-2">{visible.map(item=><article key={item.type} className={"rounded-xl border bg-white p-3 shadow-sm "+(selected.type===item.type?"border-brand-blue ring-1 ring-brand-blue":"border-[#dce8f7]")}>
    <div className="aspect-[1.7] overflow-hidden rounded-lg"><FormatPreviewArt type={item.type}/></div>
    <h3 className="mt-3 font-extrabold text-brand-navy">{item.title}</h3><p className="mt-1 min-h-11 text-xs leading-5 text-muted-foreground">{item.description}</p>
    <div className="mt-3 space-y-2 text-xs text-[#42577a]"><p className="flex items-center gap-2"><Monitor className="size-4 text-brand-blue"/>{item.spec}</p><p className="flex items-center gap-2"><Target className="size-4 text-brand-blue"/>{item.best}</p></div>
    <button type="button" onClick={()=>setSelected(item)} aria-pressed={selected.type===item.type} className={"mt-4 min-h-11 w-full rounded-lg border text-sm font-bold "+(selected.type===item.type?"border-brand-blue bg-brand-blue text-white":"border-[#8dbaf4] text-brand-blue hover:bg-[#f0f7ff]")}>{selected.type===item.type?"Selected":"View Details"}</button>
   </article>)}</div>
   <aside className="h-fit rounded-xl border border-[#dce8f7] bg-white p-4 lg:sticky lg:top-24 sm:p-5">
    <h2 className="text-lg font-extrabold text-brand-navy">Format Preview</h2><div className="mt-4 overflow-hidden rounded-lg"><FormatPreviewArt type={selected.type}/></div>
    <h3 className="mt-4 text-lg font-extrabold text-brand-navy">{selected.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p>
    <div className="mt-4 rounded-xl bg-[#f1f7ff] p-4"><h4 className="text-sm font-bold text-brand-navy">Key Specifications</h4><dl className="mt-3 space-y-2 text-xs">{[["Placement",selected.title],["Example format",selected.spec],["Use cases",selected.best],["Actual hardware","Pending verification"],["Creative requirements","See campaign guidelines"]].map(([k,v])=><div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="max-w-[55%] text-right font-semibold text-brand-navy">{v}</dd></div>)}</dl></div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs">{["Branding","Mobile reach","Location planning"].map(x=><span key={x} className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-3 py-1.5 text-[#11834f]"><Check className="size-3.5"/>{x}</span>)}</div>
    <Link href={"/pricing?format="+encodeURIComponent(selected.type)} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 text-sm font-bold text-white hover:bg-[#e95e00]">Estimate This Format <ArrowRight className="size-4"/></Link>
    <button onClick={()=>setCompare(v=>!v)} type="button" aria-pressed={compare} className="mt-2 min-h-11 w-full rounded-lg border border-[#9fc7ff] text-sm font-bold text-brand-blue hover:bg-[#eaf2ff]">{compare?"Hide Comparison":"Compare All Formats"}</button>
   </aside>
  </div>
  {compare&&<div role="region" aria-label="Format comparison" tabIndex={0} className="overflow-x-auto rounded-xl border border-[#dce8f7]"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#eaf4ff]"><tr><th className="p-3">Format</th><th className="p-3">Placement example</th><th className="p-3">Recommended for</th><th className="p-3">View estimate</th></tr></thead><tbody>{all.map(f=><tr key={f.type} className="border-t border-[#e0e9f7]"><th className="p-3">{f.title}</th><td className="p-3">{f.spec}</td><td className="p-3">{f.best}</td><td className="p-3"><Link href={"/pricing?format="+f.type} className="text-brand-blue hover:underline">Estimate</Link></td></tr>)}</tbody></table></div>}
  <InfoNote>Artwork represents the approved design concepts. Supported placements, dimensions, hardware availability and technical specifications must be confirmed against production screen inventory.</InfoNote>
 </div>;
}
