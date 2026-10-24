"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,CarFront,ClipboardCheck,MapPin,Monitor,ShieldCheck,WifiOff,Wrench} from "lucide-react";
import {Badge,Card,CardContent} from "@/components/ui";
import {DriverAccess,DriverDemoWarning,ScreenState,useDriverOperationsData} from "./operations-shared";
import {driverAssignments,ownedDriverScreens,ownedDriverVehicles} from "./operations-model";
import type {Screen} from "@/types/domain";

export function DriverVehiclePage(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [status,setStatus]=React.useState<"all"|Screen["status"]>("all");
 const [expanded,setExpanded]=React.useState<string|null>(null);
 const vehicles=ownedDriverVehicles(db,accountId),screens=ownedDriverScreens(db,accountId);
 const listed=screens.filter(s=>status==="all"||s.status===status);
 const assignments=driverAssignments(db,accountId);
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Driver Partner · Vehicle Inventory</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">My Vehicle & Screens</h1><p className="mt-2 text-sm text-muted-foreground">Review vehicle verification, linked displays, sample status and areas.</p></div><Link href="/driver/verification" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b9d3f5] bg-white px-4 text-sm font-bold text-brand-blue">Verification <ArrowRight className="size-4"/></Link></div>
  <DriverDemoWarning detail="Vehicle registration is masked. Device online/offline/maintenance statuses are stored fictional flags, not telemetry. Drivers cannot send hardware commands from this browser."/>
  <div className="grid grid-cols-3 gap-3">{[{title:"My vehicles",value:vehicles.length,icon:CarFront},{title:"Linked displays",value:screens.length,icon:Monitor},{title:"Demo online",value:screens.filter(s=>s.status==="online").length,icon:ShieldCheck}].map(({title,value,icon:Icon})=><div key={title} className="min-w-0 rounded-xl border border-[#dce7f7] bg-white p-3 sm:p-5"><Icon className="size-5 text-brand-blue"/><p className="mt-2 text-xl font-extrabold text-brand-navy">{value}</p><p className="mt-1 text-[11px] font-semibold leading-5 text-[#557294] sm:text-xs">{title}</p></div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
   <section className="space-y-4"><h2 className="text-lg font-extrabold text-brand-navy">Registered Demo Vehicles</h2>
    {vehicles.length?vehicles.map(v=>{
     const list=screens.filter(s=>s.vehicleId===v.id);
     const application=db.driverApplications.find(a=>a.vehicleId===v.id&&a.driverId===accountId);
     return <Card key={v.id}><CardContent className="pt-5"><div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e8f3ff] text-brand-blue"><CarFront className="size-6"/></span><div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold text-brand-navy">{v.model}</h3><p className="mt-1 text-xs text-muted-foreground">{v.registrationMasked} · {v.id}</p></div><Badge tone={v.verification==="approved"?"success":"warning"} className="capitalize">{v.verification.replaceAll("_"," ")}</Badge></div>
      <dl className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f6f9ff] p-3"><dt className="text-xs text-muted-foreground">Type</dt><dd className="mt-1 text-sm font-bold capitalize text-brand-navy">{v.type}</dd></div><div className="rounded-xl bg-[#f6f9ff] p-3"><dt className="text-xs text-muted-foreground">Linked sample displays</dt><dd className="mt-1 text-sm font-bold text-brand-navy">{list.length}</dd></div><div className="col-span-2 rounded-xl bg-[#f6f9ff] p-3"><dt className="text-xs text-muted-foreground">Application verification record</dt><dd className="mt-1 text-sm font-semibold capitalize text-brand-navy">{application?.status.replaceAll("_"," ")??"No recorded verification"}</dd></div></dl>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">Registration and verification are fictional. Editing real registration documents is not supported in this frontend demo.</p>
     </CardContent></Card>;
    }):<div className="rounded-xl border border-dashed border-[#caddf3] bg-white p-6 text-sm text-muted-foreground">No vehicle is registered to this seeded driver.</div>}
   </section>
   <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-brand-navy">Linked Displays</h2><label className="text-xs font-semibold text-[#506b8f]">Filter sample status <select value={status} onChange={e=>setStatus(e.target.value as typeof status)} className="ml-2 min-h-11 rounded-lg border border-[#cddcf1] bg-white px-3 text-sm text-brand-navy"><option value="all">All</option><option value="online">Online</option><option value="offline">Offline</option><option value="maintenance">Maintenance</option></select></label></div>
    {listed.length?listed.map(screen=>{
     const location=db.locations.find(l=>l.id===screen.locationId);
     const related=assignments.filter(a=>a.screen.id===screen.id);
     return <Card key={screen.id}><CardContent className="pt-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-brand-blue">{screen.status==="offline"?<WifiOff className="size-5"/>:screen.status==="maintenance"?<Wrench className="size-5"/>:<Monitor className="size-5"/>}</span><div><h3 className="font-bold text-brand-navy">{screen.id}</h3><p className="mt-1 text-xs text-muted-foreground">{screen.placement.replaceAll("_"," ")} · {screen.sizeInches} inch</p></div></div><ScreenState status={screen.status}/></div>
      <p className="mt-3 flex items-center gap-2 text-sm text-[#516e91]"><MapPin className="size-4 text-brand-blue"/>{location?location.name+", "+location.city+", Zone "+location.zone:"No linked sample area"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone="info">{related.length} confirmed demo booking{related.length===1?"":"s"}</Badge><Badge>Read-only device details</Badge></div>
      <button type="button" aria-expanded={expanded===screen.id} aria-controls={"screen-detail-"+screen.id} onClick={()=>setExpanded(expanded===screen.id?null:screen.id)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">{expanded===screen.id?"Hide linked bookings":"View linked bookings"} <ArrowRight className={"size-4 transition "+(expanded===screen.id?"rotate-90":"")}/></button>
      {expanded===screen.id&&<div id={"screen-detail-"+screen.id} className="mt-2 space-y-2 rounded-xl border border-[#e0eafa] bg-[#f8fbff] p-3">{related.length?related.map(a=><p key={a.booking.id} className="text-xs leading-6 text-[#516c8c]"><strong>{a.campaign.title}</strong> · {a.booking.startDate} to {a.booking.endDate} · {a.campaign.status}</p>):<p className="text-xs text-muted-foreground">No confirmed demo bookings are recorded for this screen.</p>}</div>}
     </CardContent></Card>;
    }):<p className="rounded-xl border border-dashed border-[#cbdcf2] bg-white p-5 text-sm text-muted-foreground">No screens match this status filter.</p>}
   </section>
  </div>
  <div className="flex items-start gap-3 rounded-xl border border-[#f2d9b8] bg-[#fff9ed] p-4 text-xs leading-6 text-[#775a36]"><ClipboardCheck className="mt-0.5 size-4 shrink-0"/><p>Screen pairing, power control, maintenance requests and device health telemetry require dedicated backend services. The present screen states can only be changed by the fictional Admin controls elsewhere in the demo.</p></div>
 </main></DriverAccess>;
}
