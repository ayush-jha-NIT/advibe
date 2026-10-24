"use client";
import Link from "next/link";
import {ArrowRight,FileCheck2,LockKeyhole,ShieldAlert,UserRound} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
export function DriverProfile(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const driver=db.accounts.find(a=>a.id===accountId&&a.role==="driver");
 const application=db.driverApplications.find(a=>a.driverId===accountId);
 const preview=db.driverPreviewApplications.find(a=>a.driverId===accountId);
 const vehicles=db.vehicles.filter(v=>v.driverId===accountId);
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-5xl space-y-5 pb-10">
  <div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Demo Identity</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Profile & Documents</h1><p className="mt-2 text-sm text-muted-foreground">See seeded driver profile and sample readiness states. Actual identity data is not collected here.</p></div>
  <DriverDemoWarning detail="No Aadhaar, PAN, licence scan, RC scan, bank account or signature is stored. Verification labels refer to fictional seed records only."/>
  <div className="grid gap-4 md:grid-cols-2">
   <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-brand-blue"/>Driver Profile</CardTitle></CardHeader><CardContent className="space-y-4">{[
    ["Fictional name",driver?.name??"Not found"],["Demo city",driver?.city??"Not available"],["Sample account ID",accountId],["Vehicles associated",String(vehicles.length)]
   ].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 border-b border-[#e3ebf8] py-2 text-sm"><span className="text-muted-foreground">{label}</span><strong className="text-brand-navy">{value}</strong></div>)}
    <p className="text-xs leading-5 text-muted-foreground"><LockKeyhole className="mr-1 inline size-4"/>Secure account editing requires an authenticated backend.</p></CardContent></Card>
   <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="size-5 text-brand-blue"/>Documents & Verification</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-brand-navy">Seeded application</span><Badge tone={application?.status==="approved"?"success":"warning"}>{application?.status??"none"} · sample</Badge></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-brand-navy">Seed document review</span><Badge tone={application?.documentsStatus==="approved"?"success":"warning"}>{application?.documentsStatus??"none"} · sample</Badge></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-brand-navy">Part 14 preview request</span><Badge tone="info">{preview?.status??"not submitted"}</Badge></div>
    <p className="rounded-lg bg-[#f6f9ff] p-3 text-xs leading-6 text-muted-foreground">These are stored review labels, not real KYC or legally verified driver documents. No personal files are available for download.</p>
    <Link href="/driver/verification" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">View verification status <ArrowRight className="size-4"/></Link>
   </CardContent></Card>
  </div>
  <div className="flex gap-2 rounded-xl border border-[#f1dcc0] bg-[#fff8ef] p-4 text-xs leading-6 text-[#805d38]"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>Do not type government IDs or financial details into the demo. Production document management must use secure upload and access controls.</div>
 </main></DriverAccess>;
}
