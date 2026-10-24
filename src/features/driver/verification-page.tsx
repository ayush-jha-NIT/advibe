"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,BadgeCheck,ClipboardCheck,LockKeyhole,ShieldAlert} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {DEMO_USERS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import {screenLabels} from "./onboarding-model";

export function DriverVerification(){
 const session=useDemoAuth(s=>s.session);
 const db=useDemoStore(s=>s.db);
 const [ready,setReady]=React.useState(false);
 const provisioned=session?.role==="driver"&&session.email===DEMO_USERS.find(u=>u.role==="driver")?.email;
 React.useEffect(()=>{let mounted=true;void Promise.resolve(useDemoStore.persist.rehydrate()).then(()=>{if(mounted)setReady(true);});return ()=>{mounted=false;};},[]);
 if(!ready)return <p role="status" className="p-5 text-sm text-muted-foreground">Loading demonstration verification records…</p>;
 if(!provisioned)return <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6"><LockKeyhole className="size-8 text-brand-blue"/><h1 className="mt-3 text-2xl font-extrabold text-brand-navy">Demo driver record not provisioned</h1><p className="mt-2 text-sm text-muted-foreground">Use the preset Driver demonstration login to see sample applications.</p><Link className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-brand-blue" href="/login?role=driver">Open demo login <ArrowRight className="size-4"/></Link></div>;
 const preview=(db.driverPreviewApplications??[]).find(p=>p.driverId==="drv-1");
 const approved=db.driverApplications.filter(a=>a.driverId==="drv-1");
 return <main className="mx-auto max-w-5xl space-y-5 pb-10">
  <div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-blue">Driver Partner · Verification · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Verification Status</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">View your independent onboarding preview request alongside existing seeded driver approvals.</p></div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d4e5fa] bg-[#eff7ff] p-4 text-xs leading-6 text-[#486789]"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>All records on this page are fictional. A submitted preview is not a KYC verification, active screen installation, bank mandate, payout account or contract.</p>
  <div className="grid gap-4 md:grid-cols-2">
   <Card><CardHeader><CardTitle>Part 14 Onboarding Preview</CardTitle></CardHeader><CardContent className="space-y-3">
    {preview?<><Badge tone="warning">Submitted for demo review</Badge><p className="text-sm font-bold text-brand-navy">{preview.id}</p>
     <p className="text-xs text-muted-foreground">Requested: {new Date(preview.submittedAt).toLocaleDateString("en-IN")}</p>
     <p className="text-sm leading-6 text-[#506e91]">{preview.vehicleType} · {preview.vehicleModel} · {screenLabels[preview.screenChoice]} · {preview.payoutFrequency} example payout schedule</p>
     <p className="rounded-lg bg-[#f6f9ff] p-3 text-xs leading-6 text-muted-foreground">This is a stored review request, not an approved driver, verified device or payment destination. Admin review controls are planned for the Admin modules.</p>
    </>:<><Badge>Not submitted</Badge><p className="text-sm text-muted-foreground">Complete all five sample steps to create an isolated demo review request.</p></>}
    <Link href="/driver/onboarding" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">{preview?"View onboarding summary":"Continue onboarding"} <ArrowRight className="size-4"/></Link>
   </CardContent></Card>
   <Card><CardHeader><CardTitle>Existing Seeded Verification</CardTitle></CardHeader><CardContent className="space-y-3">
    {approved.length?approved.map(item=><div key={item.id} className="rounded-xl border border-[#dfebf9] p-4"><div className="flex flex-wrap items-center gap-2"><BadgeCheck className="size-5 text-[#0f9d63]"/><p className="text-sm font-bold text-brand-navy">{item.id}</p><Badge tone={item.status==="approved"?"success":"warning"}>{item.status.replaceAll("_"," ")}</Badge></div>
     <p className="mt-2 text-xs leading-6 text-muted-foreground">Driver application: {item.status}. Sample vehicle: {db.vehicles.find(v=>v.id===item.vehicleId)?.model??item.vehicleId}. Sample document review: {item.documentsStatus}.</p></div>)
    :<p className="text-sm text-muted-foreground">No original seeded application found for this demo identity.</p>}
    <div className="flex gap-2 rounded-lg bg-[#eff6ff] p-3 text-xs leading-6 text-[#527195]"><ClipboardCheck className="mt-0.5 size-4 shrink-0"/>The Part 14 preview never edits, downgrades or replaces these records.</div>
   </CardContent></Card>
  </div>
 </main>;
}
