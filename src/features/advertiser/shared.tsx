"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,FileText,Plus,ShieldAlert} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {DEMO_USERS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import type {CampaignStatus} from "@/types/domain";

export function useAdvertiserData(){
 const session=useDemoAuth(s=>s.session);
 const db=useDemoStore(s=>s.db);
 const [hydrated,setHydrated]=React.useState(false);
 React.useEffect(()=>{
  let mounted=true;
  void Promise.resolve(useDemoStore.persist.rehydrate()).then(()=>{if(mounted)setHydrated(true);});
  const onStorage=(event:StorageEvent)=>{if(event.key==="advibe:demo:v1")void useDemoStore.persist.rehydrate();};
  window.addEventListener("storage",onStorage);
  return ()=>{mounted=false;window.removeEventListener("storage",onStorage);};
 },[]);
 // The only seeded advertiser account is the preset identity. Accounts created
 // in the demo signup have no production backend record and see an empty view.
 const id=session?.role==="advertiser"&&session.email===DEMO_USERS.find(x=>x.role==="advertiser")?.email?"adv-1":"not-provisioned";
 return {db,accountId:id,hydrated,displayName:session?.displayName??"Advertiser"};
}
export function statusTone(status:CampaignStatus):"success"|"info"|"neutral"|"warning"|"danger"|"purple"{
 if(status==="live"||status==="completed")return "success";
 if(status==="draft")return "neutral";
 if(status==="approved"||status==="scheduled")return "info";
 if(status==="rejected"||status==="cancelled")return "danger";
 if(status==="paused"||status==="changes_requested")return "warning";
 return "purple";
}
export function CampaignStatusBadge({status}:{status:CampaignStatus}){
 return <Badge tone={statusTone(status)} shape="pill" className="capitalize">{status.replaceAll("_"," ")}</Badge>;
}
export function PartSevenHeader({title,description,eyebrow}:{title:string;description:string;eyebrow?:string}){
 return <div className="flex flex-wrap items-start justify-between gap-4">
  <div className="max-w-2xl">
   <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-brand-blue">{eyebrow??"Advertiser workspace"} · DEMO</p>
   <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">{title}</h1>
   <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </div>
  <Link href="/advertiser/create-campaign" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white hover:bg-[#dd5e00]">
   <Plus className="size-4" aria-hidden/> Create Campaign <ArrowRight className="size-4" aria-hidden/>
  </Link>
 </div>;
}
export function DemoDataNotice(){
 return <div className="flex items-start gap-2 rounded-xl border border-[#d4e5fa] bg-[#eff6ff] px-4 py-3 text-xs leading-5 text-[#43638e]">
  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden/>
  <p>All figures and campaigns on this page are fictional records stored in this browser. This does not measure real delivery, audience reach, screen availability or payments. The six-step creation wizard starts in Part 8.</p>
 </div>;
}
export function EmptyAdvertiser({filtered=false}:{filtered?:boolean}){
 return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#cadbf1] bg-[#f8fbff] p-6 text-center">
  <FileText className="size-7 text-[#769ac9]" aria-hidden/>
  <p className="mt-2 font-bold text-brand-navy">{filtered?"No matching campaigns":"No campaigns for this demo identity"}</p>
  <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{filtered?"Change the search, date or status filters.":"The preset Advertiser demo account has sample campaigns. New signup profiles have no seeded business records."}</p>
  {!filtered&&<Link href="/advertiser/create-campaign" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Campaign wizard preview <ArrowRight className="size-4"/></Link>}
 </div>;
}
