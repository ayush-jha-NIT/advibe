"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,LockKeyhole,ShieldAlert} from "lucide-react";
import {Badge} from "@/components/ui";
import {DEMO_USERS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import type {CampaignStatus,DemoDatabase,Screen} from "@/types/domain";
import type {DriverAssignment} from "./operations-model";

export function useDriverOperationsData(){
 const session=useDemoAuth(s=>s.session);
 const db=useDemoStore(s=>s.db);
 const [hydrated,setHydrated]=React.useState(false);
 React.useEffect(()=>{
  let live=true;
  void Promise.all([Promise.resolve(useDemoAuth.persist.rehydrate()),Promise.resolve(useDemoStore.persist.rehydrate())])
   .then(()=>{if(live)setHydrated(true);});
  return ()=>{live=false;};
 },[]);
 const preset=DEMO_USERS.find(x=>x.role==="driver");
 const accountId=session?.role==="driver"&&session.email===preset?.email?"drv-1":"not-provisioned";
 return {db,accountId,hydrated,displayName:db.accounts.find(a=>a.id===accountId)?.name??"Driver Partner"};
}
export function DriverAccess({accountId,hydrated,children}:{accountId:string;hydrated:boolean;children:React.ReactNode}){
 if(!hydrated)return <p role="status" className="rounded-xl border border-[#d9e6f7] bg-white p-6 text-sm text-muted-foreground">Loading driver demo records…</p>;
 if(accountId==="not-provisioned")return <section className="mx-auto max-w-2xl rounded-2xl border border-[#dce8f9] bg-white p-6 sm:p-9"><LockKeyhole className="size-9 text-brand-blue"/><h1 className="mt-3 text-xl font-bold text-brand-navy">Preset Driver demo identity required</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A new frontend-only signup does not automatically own the seeded driver, vehicles or booked screens. Open the preset Driver login to explore these fictional records.</p><Link href="/login?role=driver" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Go to demo login <ArrowRight className="size-4"/></Link></section>;
 return <>{children}</>;
}
export function DriverDemoWarning({detail}:{detail?:string}){
 return <div className="flex items-start gap-2 rounded-xl border border-[#d1e5fc] bg-[#eff7ff] p-4 text-xs leading-6 text-[#48688f]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/><p><strong>Fictional browser-only operations.</strong> {detail??"Assignments, status, impressions and locations are sample database records, not verified device telemetry, GPS tracking, active playback or earnings."}</p></div>;
}
export function ScreenState({status}:{status:Screen["status"]}){
 return <Badge tone={status==="online"?"success":status==="maintenance"?"warning":"neutral"} className="capitalize">{status} · sample record</Badge>;
}
export function CampaignState({status}:{status:CampaignStatus}){
 return <Badge tone={status==="live"?"success":status==="scheduled"?"info":status==="paused"?"warning":"neutral"} className="capitalize">{status.replaceAll("_"," ")}</Badge>;
}
export function AssignmentCard({item,compact=false}:{item:DriverAssignment;compact?:boolean}){
 const {campaign,screen,booking,creative,location}=item;
 return <article className="min-w-0 rounded-xl border border-[#dce8f7] bg-white p-4">
  <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-bold text-brand-navy">{campaign.title}</h3><p className="mt-1 text-xs text-muted-foreground">{campaign.id} · {screen.id}</p></div><CampaignState status={campaign.status}/></div>
  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
   <div><dt className="text-muted-foreground">Screen & area</dt><dd className="mt-0.5 font-semibold text-brand-navy">{screen.placement.replaceAll("_"," ")} · {location?.name??"Unknown demo area"}</dd></div>
   <div><dt className="text-muted-foreground">Booking dates</dt><dd className="mt-0.5 font-semibold text-brand-navy">{booking.startDate} to {booking.endDate}</dd></div>
   {!compact&&<div><dt className="text-muted-foreground">Creative metadata</dt><dd className="mt-0.5 font-semibold text-brand-navy">{creative?.title??"Creative unavailable"} · {creative?.format.toUpperCase()??"Unknown"}</dd></div>}
   {!compact&&<div><dt className="text-muted-foreground">Requested playback window</dt><dd className="mt-0.5 font-semibold text-brand-navy">{campaign.wizardDetails?campaign.wizardDetails.startTime+"–"+campaign.wizardDetails.endTime:"Not recorded"}</dd></div>}
  </dl>
  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Confirmed demo booking. This is not proof an ad is playing or a hardware reservation outside the browser.</p>
 </article>;
}
export function VehicleDetails({db,driverId}:{db:DemoDatabase;driverId:string}){
 const vehicles=db.vehicles.filter(v=>v.driverId===driverId);
 return <div className="space-y-3">{vehicles.map(v=><div key={v.id} className="rounded-xl border border-[#dfe9f7] p-4"><p className="font-bold text-brand-navy">{v.model}</p><p className="mt-1 text-xs text-muted-foreground">{v.registrationMasked} · {v.id} · {v.type}</p><Badge tone={v.verification==="approved"?"success":"warning"} className="mt-2 capitalize">{v.verification.replaceAll("_"," ")} · demo review</Badge></div>)}{!vehicles.length&&<p className="p-4 text-sm text-muted-foreground">No seeded vehicle is associated with this demo identity.</p>}</div>;
}
