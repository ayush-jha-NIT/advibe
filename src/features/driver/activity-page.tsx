"use client";
import Link from "next/link";
import {ArrowRight,Map,Monitor,ShieldAlert} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverAssignments,driverCampaignRows,ownedDriverScreens} from "./operations-model";
export function DriverActivity({mode}:{mode:"delivery"|"trips"}){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const assignments=driverAssignments(db,accountId),screens=ownedDriverScreens(db,accountId);
 const isDelivery=mode==="delivery";
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · {isDelivery?"Screen Activity":"Trips & Exposure"} · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">{isDelivery?"Screen Activity & History":"Trips & Exposure"}</h1><p className="mt-2 text-sm text-muted-foreground">{isDelivery?"Booked campaigns and current sample screen statuses.":"Readiness and limitations of future route-based advertising measurement."}</p></div>
  <DriverDemoWarning detail={isDelivery?"No actual playback sessions, heartbeat logs, device connectivity events or creative verification records are collected.":"No GPS positions, route traces, trip distances, audience exposure measurements or location permission requests exist."}/>
  <div className="grid gap-4 lg:grid-cols-2">
   <Card><CardHeader><CardTitle className="flex items-center gap-2">{isDelivery?<Monitor className="size-5 text-brand-blue"/>:<Map className="size-5 text-brand-blue"/>}{isDelivery?"Sample Device Snapshot":"GPS / Route Availability"}</CardTitle></CardHeader><CardContent>
    {isDelivery?<div className="space-y-3">{screens.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f9ff] p-4"><span className="font-semibold text-brand-navy">{s.id}</span><Badge tone={s.status==="online"?"success":"neutral"}>{s.status} (stored flag)</Badge></div>)}{!screens.length&&<p className="text-sm text-muted-foreground">No seeded driver-owned screens.</p>}</div>
    :<div className="rounded-xl border border-dashed border-[#cbdced] bg-[#f8fbff] p-6"><Map className="size-9 text-[#7ea0c9]"/><h2 className="mt-3 font-bold text-brand-navy">No trip measurements available</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Routes will require driver consent, secure telemetry ingestion and verified trip timestamps. No map of imaginary vehicle movements is displayed.</p></div>}
   </CardContent></Card>
   <Card><CardHeader><CardTitle>{isDelivery?"Booked Campaign Records":"Future Exposure Metrics"}</CardTitle></CardHeader><CardContent>
    {isDelivery?<><p className="mb-3 text-xs text-muted-foreground">{driverCampaignRows(assignments).length} campaigns with confirmed demo bookings</p><div className="space-y-3">{driverCampaignRows(assignments).map(r=><div key={r.campaign.id} className="rounded-xl border border-[#e0eafb] p-4"><p className="font-semibold text-brand-navy">{r.campaign.title}</p><p className="mt-1 text-xs text-muted-foreground">{r.assignments.length} booked screen record(s). Playback unverified.</p></div>)}</div></>
    :<div className="space-y-3">{["Distance and trip duration","Verified device playback","Exposure by zone","Trusted impressions"].map(x=><div key={x} className="flex justify-between gap-3 rounded-lg border border-[#e1eafa] p-3 text-sm"><span className="text-brand-navy">{x}</span><Badge>Not recorded</Badge></div>)}</div>}
    <Link href="/driver/assigned-ads" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">View booked ad schedule <ArrowRight className="size-4"/></Link>
   </CardContent></Card>
  </div><p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldAlert className="size-4 shrink-0"/>These pages intentionally do not fabricate ad play logs or trip routes. Actual activity requires validated event ingestion from approved installed devices.</p>
 </main></DriverAccess>;
}
