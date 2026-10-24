"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, CheckCircle2, IndianRupee, ShieldCheck} from "lucide-react";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import type {Placement} from "@/types/domain";
const options:{key:string;name:string;type:Placement;description:string;points:string[]}[]=[
 {key:"bike",name:"Bike",type:"bike_rear",description:"Rear-mounted display concept for everyday two-wheeler routes.",points:["Compact vehicle display","Designed for busy routes","Campaign-dependent earnings"]},
 {key:"auto",name:"Auto Rickshaw",type:"auto_rear",description:"Rear screen concepts for local passenger and city traffic.",points:["Rear or side placement options","Local campaign exposure","Verification before assignment"]},
 {key:"car",name:"Car",type:"car_interior",description:"Interior advertising concept for approved cars and ride-hailing.",points:["Passenger-facing placements","Longer journey engagement","Installation after approval"]}
];
export function DriverVehicleTabs(){
 const [current,setCurrent]=React.useState("bike");
 const selected=options.find(x=>x.key===current)??options[0];
 return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)]">
  <div><div className="grid gap-3 sm:grid-cols-3">{options.map(o=><button key={o.key} onClick={()=>setCurrent(o.key)} aria-pressed={current===o.key} className={"overflow-hidden rounded-xl border bg-white text-left shadow-sm "+(current===o.key?"border-brand-blue ring-1 ring-brand-blue":"border-[#dce8f8]")}><div className="aspect-[1.7]"><FormatPreviewArt type={o.type}/></div><div className="p-4"><h3 className="text-sm font-bold text-brand-navy">{o.name}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{o.description}</p></div></button>)}</div>
   <div className="mt-4 rounded-xl border border-[#dce8f8] bg-white p-5"><h3 className="text-lg font-extrabold text-brand-navy">{selected.name} Partner Requirements</h3><ul className="mt-3 grid gap-3 sm:grid-cols-3">{selected.points.map(point=><li key={point} className="flex items-start gap-2 text-sm leading-5 text-[#40587d]"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#06b26b]"/>{point}</li>)}</ul></div>
  </div>
  <aside className="rounded-2xl bg-[linear-gradient(145deg,#031631,#0754a5)] p-6 text-white"><IndianRupee className="size-10 text-[#f8a52e]"/><h3 className="mt-3 text-xl font-extrabold">Earning Opportunities</h3><p className="mt-3 text-sm leading-6 text-[#e2ebff]">Your earnings depend on your city, verified vehicle, campaign assignments, screen uptime and the driver agreement.</p><div className="mt-5 rounded-xl border border-white/25 bg-white/10 p-4"><p className="text-xs text-[#bfd5fa]">Selected vehicle</p><p className="mt-1 text-lg font-bold">{selected.name}</p><p className="mt-3 text-xs text-[#cfe0ff]">No guaranteed monthly earning or payout estimate is available without a signed commercial rate card.</p></div>
   <p className="mt-5 flex items-center gap-2 text-xs text-[#c7e1fc]"><ShieldCheck className="size-4"/>Approval is required before ad delivery.</p>
   <Link href="/signup?role=driver" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-orange px-5 text-sm font-bold text-white hover:bg-[#e95e00]">Join as a Driver Partner <ArrowRight className="size-4"/></Link></aside>
 </div>;
}
