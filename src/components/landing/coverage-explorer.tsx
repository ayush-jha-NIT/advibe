"use client";

import * as React from "react";
import Link from "next/link";
import {ArrowRight, MapPin, MapPinned, Navigation, LocateFixed} from "lucide-react";

const cities=[
 {name:"Delhi",x:49,y:21,tag:"Northern India"},
 {name:"Mumbai",x:31,y:62,tag:"Western India"},
 {name:"Bengaluru",x:45,y:82,tag:"Southern India"},
 {name:"Hyderabad",x:50,y:64,tag:"South-central India"},
 {name:"Pune",x:38,y:65,tag:"Western India"},
 {name:"Chennai",x:59,y:82,tag:"Eastern coast"},
 {name:"Kolkata",x:78,y:48,tag:"Eastern India"},
] as const;

export function CoverageExplorer(){
 const [chosen,setChosen]=React.useState<string>(cities[0].name);
 const selected=cities.find(c=>c.name===chosen)??cities[0];
 return <section aria-labelledby="coverage-heading" id="coverage" className="scroll-mt-24 bg-[#f7fbff] py-13 sm:py-17">
  <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
   <div>
    <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Explore our coverage</p>
    <h2 id="coverage-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Reach people in the places that matter</h2>
    <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Choose a city to preview location-first campaign planning. Actual screen inventory and booking availability must be confirmed before launch.</p>
    <div role="group" aria-label="Example campaign cities" className="mt-6 flex flex-wrap gap-2">
     {cities.map(city=><button type="button" key={city.name} onClick={()=>setChosen(city.name)}
      aria-pressed={city.name===chosen} className={"min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-offset-2 "+
       (city.name===chosen?"border-brand-blue bg-brand-blue text-white shadow-sm":"border-[#d6e5f6] bg-white text-brand-navy hover:border-brand-blue hover:text-brand-blue")}>{city.name}</button>)}
    </div>
    <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
     {[{label:"Campaign formats",value:"Multiple"},{label:"Area selection",value:"City & zone"},{label:"Campaign insights",value:"Trackable"}].map(row=>
      <div key={row.label} className="rounded-xl border border-line bg-white p-3 sm:p-4">
       <p className="text-sm font-extrabold text-brand-navy sm:text-base">{row.value}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{row.label}</p>
      </div>)}
    </div>
    <Link href={"/locations?city="+encodeURIComponent(chosen)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-blue px-5 text-sm font-bold text-brand-blue transition-colors hover:bg-[#eaf2ff]">
      Explore locations <ArrowRight className="size-4" aria-hidden/>
    </Link>
   </div>
   <div className="relative overflow-hidden rounded-2xl border border-[#d9e9f9] bg-[linear-gradient(135deg,#eaf5ff,#fcfdff)] p-3 shadow-[0_12px_35px_#0b3e7311] sm:p-6">
    <div className="absolute inset-0 opacity-60" aria-hidden style={{backgroundImage:"linear-gradient(#d8e8fb55 1px, transparent 1px), linear-gradient(90deg,#d8e8fb55 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>
    <div className="relative flex items-center justify-between gap-3">
     <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e7f7] bg-white px-3 py-2 text-xs font-semibold text-brand-navy"><MapPinned className="size-4 text-brand-blue" aria-hidden/> City network concept</span>
     <LocateFixed className="size-5 text-brand-blue" aria-hidden/>
    </div>
    <div className="relative mx-auto mt-1 aspect-[1.42/1] w-full max-w-[530px]" role="img" aria-label={"Illustrative India map highlighting "+chosen}>
     <svg viewBox="0 0 540 400" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden="true">
      <defs><linearGradient id="coverageLand" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c9e8fa"/><stop offset="1" stopColor="#e4dfff"/></linearGradient></defs>
      <path d="M192 38 228 26 251 52 289 38 314 72 355 66 372 92 419 81 445 120 479 128 492 143 462 172 442 158 418 187 391 195 378 235 344 246 318 291 295 301 280 338 267 370 248 341 239 302 212 280 206 253 183 232 190 206 158 184 145 156 169 135 157 104 181 83Z" fill="url(#coverageLand)" stroke="#9abfe4" strokeWidth="3"/>
      <path d="M207 75 249 93 258 163 281 205 272 309m57-210-29 66 57 61m-201-52 113 22m40 57 49-4 39-71" stroke="#fff" opacity=".72" strokeWidth="3" strokeDasharray="4 7"/>
      <path d="M101 240 161 189m271-62 32 9" stroke="#c8def3" strokeWidth="4"/>
      <g fill="#b2e0d1" opacity=".7"><ellipse cx="126" cy="218" rx="36" ry="22"/><ellipse cx="412" cy="290" rx="63" ry="37"/></g>
     </svg>
     {cities.map(city=><button key={city.name} type="button" aria-label={"Select "+city.name} aria-pressed={city.name===chosen} title={city.name}
      onClick={()=>setChosen(city.name)}
      className={"absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow-md transition-[background-color,transform] focus-visible:outline-offset-4 sm:size-9 "+
        (city.name===chosen?"z-10 scale-125 bg-brand-orange text-white":"bg-brand-blue text-white hover:scale-110")}
      style={{left:city.x+"%",top:city.y+"%"}}><MapPin className="size-4" aria-hidden/></button>)}
    </div>
    <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d7e7f8] bg-white px-4 py-3">
     <div><p className="text-xs text-muted-foreground">Selected city · Illustrative map</p><p className="mt-1 flex items-center gap-2 text-base font-extrabold text-brand-navy"><Navigation className="size-4 text-brand-blue" aria-hidden/>{selected.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{selected.tag}</p></div>
     <Link href={"/locations?city="+encodeURIComponent(selected.name)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-brand-blue px-4 text-xs font-bold text-white hover:bg-[#0051dc]">See locations <ArrowRight className="size-3.5" aria-hidden/></Link>
    </div>
   </div>
  </div>
 </section>;
}
