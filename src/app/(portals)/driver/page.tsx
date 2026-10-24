import Link from "next/link";
import {ArrowRight,ClipboardCheck} from "lucide-react";
import {DemoDashboard} from "@/components/demo/demo-dashboard";
export default function Page(){return <div className="space-y-5">
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b9d6fc] bg-[#edf5ff] p-4 sm:p-5">
  <div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-blue"><ClipboardCheck className="size-5"/></span>
  <div><p className="text-sm font-extrabold text-brand-navy">Driver Partner Onboarding · Steps 1–3</p>
  <p className="mt-1 text-xs leading-6 text-[#527093]">Explore profile, vehicle and sample KYC checklist forms. No real documents, identity numbers or bank data are collected.</p></div></div>
  <Link href="/driver/onboarding" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-bold text-white hover:bg-[#0051da]">Open onboarding <ArrowRight className="size-4"/></Link>
 </div>
 <DemoDashboard role="driver"/>
 </div>;}
