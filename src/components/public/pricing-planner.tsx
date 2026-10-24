"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, Calculator, CheckCircle2, IndianRupee, Info, Monitor, ShieldCheck} from "lucide-react";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import {formatCards,InfoNote,primaryButton} from "./marketing-blocks";

const base:Record<"bike_rear"|"auto_rear"|"auto_side"|"car_rear"|"car_interior"|"helmet",number>={bike_rear:150,auto_rear:200,auto_side:220,car_rear:300,car_interior:300,helmet:100};
const pricingOptions=[...formatCards,{...formatCards[1],type:"auto_side" as const,title:"Auto Side Screen"},{...formatCards[2],type:"car_rear" as const,title:"Car Rear Screen"}];
type Choice=keyof typeof base;
const INR=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
export function PricingPlanner(){
 const [choice,setChoice]=React.useState<Choice>("bike_rear");
 const [city,setCity]=React.useState("Prayagraj");
 const [screens,setScreens]=React.useState(10);
 const [days,setDays]=React.useState(15);
 const [seconds,setSeconds]=React.useState(10);
 const [plays,setPlays]=React.useState(100);
 const [compare,setCompare]=React.useState(false);
 React.useEffect(()=>{
  const frame=window.requestAnimationFrame(()=>{
   const param=new URLSearchParams(window.location.search).get("format");
   if(param&&Object.hasOwn(base,param))setChoice(param as Choice);
  });
  return ()=>window.cancelAnimationFrame(frame);
 },[]);
 const format=pricingOptions.find(x=>x.type===choice)??formatCards[0];
 const daily=Math.round(base[choice]*(seconds/10)*(plays/100));
 const subtotal=daily*screens*days;
 const tax=Math.round(subtotal*.18);
 const hasRate=city==="Prayagraj";
 return <div className="space-y-8">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-brand-navy">Choose Your Advertising Format</h2><p className="mt-2 text-sm text-muted-foreground">Compare vehicle formats, specifications and illustrative prices.</p></div>
   <button type="button" onClick={()=>setCompare(v=>!v)} aria-pressed={compare} className="min-h-11 rounded-full border border-[#a9c9f5] bg-white px-4 text-sm font-semibold text-brand-blue hover:bg-[#eef6ff]">{compare?"Single Format":"Compare All Formats"}</button>
  </div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{formatCards.map(f=><article key={f.type} className={"overflow-hidden rounded-xl border bg-white shadow-sm "+(choice===f.type?"border-brand-blue ring-1 ring-brand-blue":"border-[#dce8f7]")}>
    <div className="aspect-[1.68]"><FormatPreviewArt type={f.type}/></div><div className="p-4"><h3 className="text-sm font-extrabold text-brand-navy">{f.title}</h3><p className="mt-1 min-h-12 text-xs leading-5 text-muted-foreground">{f.description}</p>
    <div className="mt-3 rounded-lg bg-[#eef5ff] px-3 py-2 text-center text-sm font-bold text-brand-navy">{INR(base[f.type as Choice]??base.bike_rear)}+ <span className="text-xs font-normal">per screen/day (example)</span></div>
    <p className="mt-3 text-xs text-muted-foreground">{f.spec}</p><p className="mt-1 text-xs text-muted-foreground">{f.best}</p>
    <button type="button" onClick={()=>setChoice(f.type as Choice)} aria-pressed={choice===f.type} className="mt-4 min-h-11 w-full rounded-lg border border-[#f87e33] text-sm font-bold text-brand-orange hover:bg-[#fff4e8]">{choice===f.type?"Selected":"Select for estimate"}</button></div>
  </article>)}</div>
  {compare&&<div className="overflow-x-auto rounded-xl border border-[#dbe8f8]" role="region" aria-label="Advertising format comparison" tabIndex={0}>
   <table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#eaf3ff]"><tr><th className="p-3">Feature</th>{formatCards.map(f=><th className="p-3" key={f.type}>{f.title}</th>)}</tr></thead><tbody>
    <tr className="border-t"><th className="p-3">Example daily base</th>{formatCards.map(f=><td key={f.type} className="p-3">{INR(base[f.type as Choice])}</td>)}</tr>
    <tr className="border-t"><th className="p-3">Placement</th>{formatCards.map(f=><td key={f.type} className="p-3">{f.spec}</td>)}</tr>
    <tr className="border-t"><th className="p-3">Best for</th>{formatCards.map(f=><td key={f.type} className="p-3">{f.best}</td>)}</tr>
   </tbody></table></div>}
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,.85fr)]">
   <div className="rounded-2xl border border-[#dce8f8] bg-white p-5 sm:p-6">
    <div className="flex items-center gap-2"><Calculator className="size-6 text-brand-blue" aria-hidden/><h2 className="text-xl font-extrabold text-brand-navy">Campaign Cost Calculator</h2></div>
    <p className="mt-2 text-sm text-muted-foreground">Change quantities and frequency to explore sample cost scenarios.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Advertising format<select value={choice} onChange={e=>setChoice(e.target.value as Choice)} className="min-h-11 rounded-lg border border-[#cbdaf2] bg-white px-3">{pricingOptions.map(f=><option key={f.type} value={f.type}>{f.title}</option>)}</select></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">City<select value={city} onChange={e=>setCity(e.target.value)} className="min-h-11 rounded-lg border border-[#cbdaf2] bg-white px-3"><option>Prayagraj</option><option>Lucknow</option><option>Delhi</option><option>Mumbai</option><option>Bengaluru</option></select></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Number of screens <output className="font-bold text-brand-blue">{screens}</output><input type="range" min="1" max="50" step="1" value={screens} onChange={e=>setScreens(Number(e.target.value))} className="w-full accent-[#0866ff]"/></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Campaign duration <output className="font-bold text-brand-blue">{days} days</output><input type="range" min="1" max="90" value={days} onChange={e=>setDays(Number(e.target.value))} className="w-full accent-[#0866ff]"/></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Creative duration <output className="font-bold text-brand-blue">{seconds} seconds</output><input type="range" min="5" max="30" step="5" value={seconds} onChange={e=>setSeconds(Number(e.target.value))} className="w-full accent-[#0866ff]"/></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Plays per day <output className="font-bold text-brand-blue">{plays}</output><input type="range" min="20" max="200" step="20" value={plays} onChange={e=>setPlays(Number(e.target.value))} className="w-full accent-[#0866ff]"/></label>
    </div>
    <InfoNote>Demonstration model: base daily rate × (creative seconds / 10) × (plays / 100) × screens × days, plus 18% illustrative GST. These assumptions are not published or binding AdVibe prices.</InfoNote>
   </div>
   <div className="rounded-2xl bg-[linear-gradient(135deg,#051a3c,#0750aa)] p-6 text-white">
    <p className="text-sm font-semibold text-[#c5dbff]">Estimated campaign cost</p>
    {hasRate?<><p aria-live="polite" className="mt-3 text-4xl font-extrabold text-brand-orange">{INR(subtotal+tax)}</p>
     <dl className="mt-5 space-y-3 border-t border-white/20 pt-4 text-sm"><div className="flex justify-between gap-3"><dt>Format</dt><dd className="text-right font-semibold">{format.title}</dd></div>
      <div className="flex justify-between"><dt>Base daily rate</dt><dd>{INR(base[choice])}</dd></div>
      <div className="flex justify-between"><dt>Adjusted daily rate</dt><dd>{INR(daily)}</dd></div>
      <div className="flex justify-between"><dt>Screens × days</dt><dd>{screens} × {days}</dd></div>
      <div className="flex justify-between"><dt>Illustrative subtotal</dt><dd>{INR(subtotal)}</dd></div><div className="flex justify-between"><dt>Illustrative GST (18%)</dt><dd>{INR(tax)}</dd></div></dl>
    </>:<div className="mt-5 rounded-xl border border-white/25 p-4 text-sm leading-6">Sample pricing is currently specified for Prayagraj only. A quote for {city} requires a validated rate card.</div>}
    <p className="mt-5 text-xs leading-5 text-[#d2e0f7]"><Info className="mr-1 inline size-4" aria-hidden/>Estimate only. No live inventory, booking, checkout or final quote is offered here.</p>
    <Link href="/signup?role=advertiser" className={primaryButton+" mt-6 w-full"}>Start Your Campaign <ArrowRight className="size-4" aria-hidden/></Link>
   </div>
  </div>
  <div className="grid gap-4 rounded-2xl border border-[#e0ebf7] bg-[#f5f9ff] p-5 sm:grid-cols-2 lg:grid-cols-3">
   {[["Transparent assumptions",ShieldCheck],["Multiple vehicle options",Monitor],["Estimate before signup",IndianRupee]].map(([label,Icon])=>{const I=Icon as typeof Monitor;return <p key={label as string} className="flex items-center gap-2 text-sm font-semibold text-brand-navy"><I className="size-5 text-brand-blue" aria-hidden/>{label as string}<CheckCircle2 className="ml-auto size-4 text-[#0cae6d]" aria-hidden/></p>;})}
  </div>
 </div>;
}
