"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,Bell,CalendarDays,CarFront,CheckCircle2,ClipboardCheck,Monitor,ShieldCheck,Wallet} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {AssignmentCard,DriverAccess,DriverDemoWarning,ScreenState,useDriverOperationsData} from "./operations-shared";
import {dateInIndia,driverAssignments,driverDailySchedule,driverOperationsSummary,ownedDriverScreens} from "./operations-model";

export function DriverDashboard(){
 const {db,accountId,hydrated,displayName}=useDriverOperationsData();
 const [today]=React.useState(()=>dateInIndia(new Date()));
 const metrics=driverOperationsSummary(db,accountId,today);
 const assignments=driverAssignments(db,accountId);
 const todayRows=driverDailySchedule(assignments,today);
 const screens=ownedDriverScreens(db,accountId);
 const notices=db.notices.filter(n=>n.recipientId===accountId&&!n.read).slice(0,3);
 const approved=db.driverApplications.find(a=>a.driverId===accountId&&a.status==="approved");
 const review=db.driverPreviewApplications.find(a=>a.driverId===accountId);
 const kpis=[
  {name:"My sample screens",value:String(metrics.screens),icon:Monitor,note:metrics.onlineScreens+" online in demo"},
  {name:"Live assigned campaigns",value:String(metrics.activeCampaigns),icon:CheckCircle2,note:"Confirmed sample bookings only"},
  {name:"Scheduled today",value:String(metrics.todayAssignments),icon:CalendarDays,note:today||"Checking calendar"},
  {name:"Pending demo settlements",value:moneyINR(metrics.pendingPaise),icon:Wallet,note:"Not actual earned money"},
 ];
 return <DriverAccess accountId={accountId} hydrated={hydrated}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Driver Partner · Operations Overview</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Welcome, {displayName}</h1><p className="mt-2 text-sm text-muted-foreground">Your assigned sample campaigns, screen records and today&apos;s schedule in one place.</p></div><Badge tone="purple">DEMO DRIVER PORTAL</Badge></div>
  <DriverDemoWarning detail="Numbers describe fictional driver-owned records. Screen online status is a stored sample flag, not real-time connection telemetry; scheduled ads are not verified playback."/>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map(({name,value,icon:Icon,note})=><div key={name} className="rounded-2xl border border-[#dbe8f8] bg-white p-4 shadow-sm sm:p-5"><Icon className="size-5 text-brand-blue"/><p className="mt-3 break-words text-xl font-extrabold text-brand-navy sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-[#526e90]">{name}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{note}</p></div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
   <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Today&apos;s Sample Schedule</CardTitle><p className="mt-1 text-xs text-muted-foreground">{today||"Today's date"} · Asia/Kolkata · confirmed assignments</p></div><Link href="/driver/assigned-ads" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Daily schedule <ArrowRight className="size-4"/></Link></div></CardHeader><CardContent className="space-y-3">
    {todayRows.length?todayRows.slice(0,4).map(a=><AssignmentCard item={a} key={a.booking.id} compact/>):<div className="rounded-xl border border-dashed border-[#c9dbee] bg-[#f8fbff] p-6"><CalendarDays className="size-8 text-[#8ba9d0]"/><p className="mt-3 text-sm font-bold text-brand-navy">No sample assignments for this date</p><p className="mt-1 text-xs leading-6 text-muted-foreground">Only confirmed bookings for live or scheduled demo campaigns appear here. Check another date in Assigned Ads & Schedule.</p></div>}
   </CardContent></Card>
   <div className="space-y-4"><Card><CardHeader><CardTitle>Driver & Vehicle Verification</CardTitle></CardHeader><CardContent><div className="flex items-start gap-3"><ShieldCheck className="size-8 text-[#13a76b]"/><div className="min-w-0"><Badge tone={approved?"success":"warning"}>{approved?"Approved seeded sample":"No approved seeded record"}</Badge><p className="mt-2 text-xs leading-6 text-muted-foreground">Part 14 review request: {review?"Submitted (fictional)":"Not submitted"}. These states are separate.</p></div></div><Link href="/driver/verification" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">View verification <ArrowRight className="size-4"/></Link></CardContent></Card>
    <Card><CardHeader><CardTitle>My Screens</CardTitle></CardHeader><CardContent className="space-y-3">{screens.map(screen=><div key={screen.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e3ebf9] p-3"><div><p className="text-sm font-bold text-brand-navy">{screen.id}</p><p className="text-xs text-muted-foreground">{screen.placement.replaceAll("_"," ")}</p></div><ScreenState status={screen.status}/></div>)}{!screens.length&&<p className="text-sm text-muted-foreground">No screens found.</p>}<Link href="/driver/vehicle" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue"><CarFront className="size-4"/>View vehicle & screen <ArrowRight className="size-4"/></Link></CardContent></Card>
   </div>
  </div>
  <div className="grid gap-4 lg:grid-cols-2">
   <Card><CardHeader><div className="flex justify-between gap-2"><CardTitle>Driver Notices</CardTitle><Badge tone="info">{metrics.unreadNotices} unread</Badge></div></CardHeader><CardContent className="space-y-3">{notices.length?notices.map(n=><div key={n.id} className="flex items-start gap-3 rounded-xl border border-[#e0eafb] p-3"><Bell className="mt-0.5 size-4 shrink-0 text-brand-blue"/><div><p className="text-sm font-bold text-brand-navy">{n.title}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{n.message}</p></div></div>):<p className="text-sm text-muted-foreground">No unread demo notices.</p>}<p className="text-xs text-muted-foreground">Notice management is planned for a later driver phase.</p></CardContent></Card>
   <Card><CardHeader><CardTitle>Quick Access</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
    {[{href:"/driver/onboarding",name:"Partner onboarding",icon:ClipboardCheck},{href:"/driver/vehicle",name:"Vehicle & screens",icon:CarFront},{href:"/driver/campaigns",name:"My campaigns",icon:CheckCircle2},{href:"/driver/assigned-ads",name:"Assigned ad schedule",icon:CalendarDays}].map(({href,name,icon:Icon})=><Link key={href} href={href} className="flex min-h-16 items-center justify-between gap-2 rounded-xl border border-[#d7e5f8] bg-[#f8fbff] p-4 text-sm font-semibold text-brand-navy hover:border-brand-blue"><span className="flex items-center gap-2"><Icon className="size-5 shrink-0 text-brand-blue"/>{name}</span><ArrowRight className="size-4 shrink-0 text-brand-blue"/></Link>)}
   </CardContent></Card>
  </div>
 </main></DriverAccess>;
}
