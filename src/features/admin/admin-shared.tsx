"use client";
import * as React from "react";
import Link from "next/link";
import {AlertTriangle,ArrowRight,ShieldAlert} from "lucide-react";
import {Badge,Button} from "@/components/ui";
import {DEMO_USERS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import type {DemoDatabase} from "@/types/domain";
export const demoAdmin={role:"admin" as const,accountId:"adm-1"};
export const control="min-h-11 w-full rounded-xl border border-[#cbdcf1] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d9ebff]";
export function useAdminData(){
 const session=useDemoAuth(s=>s.session),db=useDemoStore(s=>s.db);
 const [ready,setReady]=React.useState(false);
 React.useEffect(()=>{let active=true;void Promise.all([Promise.resolve(useDemoAuth.persist.rehydrate()),Promise.resolve(useDemoStore.persist.rehydrate())]).then(()=>{if(active)setReady(true);});return ()=>{active=false;};},[]);
 const admin=session?.role==="admin"&&session.email===DEMO_USERS.find(a=>a.role==="admin")?.email;
 return {db,ready,admin};
}
export function AdminAccess({ready,admin,children}:{ready:boolean;admin:boolean;children:React.ReactNode}){
 if(!ready)return <p role="status" className="p-6 text-sm text-muted-foreground">Loading Admin demo records…</p>;
 if(!admin)return <section className="mx-auto max-w-xl rounded-2xl border border-[#dce8f7] bg-white p-6"><AlertTriangle className="size-8 text-brand-blue"/><h1 className="mt-3 text-xl font-bold text-brand-navy">Preset Admin demo login required</h1><p className="mt-2 text-sm text-muted-foreground">Only the preset fictional Admin identity can operate these client-side sample controls. This is not server-backed authorization.</p><Link className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-brand-blue" href="/login?role=admin">Open demo login <ArrowRight className="size-4"/></Link></section>;
 return <>{children}</>;
}
export function AdminHeading({title,eyebrow,description}:{title:string;eyebrow:string;description:string}){
 return <header><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-blue">{eyebrow} · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></header>;
}
export function AdminWarning({children}:{children?:React.ReactNode}){
 return <div className="flex gap-3 rounded-xl border border-[#cde2fa] bg-[#f1f7ff] p-4 text-xs leading-6 text-[#4d6a8a]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/><p><strong>Frontend-only demonstration.</strong> {children??"All records are fictional and stored in this browser. No production authentication, real funds, physical devices, legal KYC or external services are involved."}</p></div>;
}
export function AdminNotice({message,error}:{message:string;error:string}){
 return <>{error&&<p role="alert" className="rounded-xl border border-[#f6bbc4] bg-[#fff0f2] p-3 text-sm text-[#a6263a]">{error}</p>}{message&&<p role="status" className="rounded-xl border border-[#b7dfc8] bg-[#f0fbf4] p-3 text-sm text-[#1f7549]">{message}</p>}</>;
}
export function MiniStat({label,value,caption}:{label:string;value:string|number;caption?:string}){
 return <div className="min-w-0 rounded-xl border border-[#dbe7f6] bg-white p-4"><p className="text-xs font-semibold text-[#617a97]">{label}</p><p className="mt-2 break-words text-xl font-extrabold text-brand-navy sm:text-2xl">{value}</p>{caption&&<p className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</p>}</div>;
}
export function StatusPill({value}:{value:string}){const good=["approved","paid","processed","online","live","completed","resolved","confirmed","active"].includes(value);const bad=["rejected","failed","cancelled","offline","inactive"].includes(value);return <Badge tone={good?"success":bad?"danger":"warning"}>{value.replaceAll("_"," ")} · sample</Badge>;}
export const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(paise/100);
export function AdminNavLink({href,children}:{href:string;children:React.ReactNode}){return <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbdcf0] px-4 text-sm font-bold text-brand-blue hover:bg-[#f2f8ff]" href={href}>{children}<ArrowRight className="size-4"/></Link>;}
export function AdminAction({onClick,disabled,children}:{onClick:()=>void;disabled?:boolean;children:React.ReactNode}){return <Button size="sm" variant="outline" disabled={disabled} onClick={onClick}>{children}</Button>;}
export function adminSummary(db:DemoDatabase){
 return {campaigns:db.campaigns.length,needsCampaignReview:db.campaigns.filter(c=>["submitted","under_review"].includes(c.status)).length,
 creativeReview:db.creatives.filter(c=>["pending","under_review"].includes(c.approval)).length,
 pendingDrivers:db.driverApplications.filter(d=>d.status!=="approved").length,
 screens:db.screens.length,online:db.screens.filter(s=>s.status==="online").length,
 pendingSettlements:db.settlements.filter(s=>s.status==="pending").reduce((a,b)=>a+b.grossPaise-b.deductionsPaise,0),
 unpaidPayments:db.payments.filter(p=>p.status==="pending").length,
 openTickets:db.tickets.filter(t=>t.status!=="resolved").length,
 unread:db.notices.filter(n=>n.recipientId==="adm-1"&&!n.read).length};
}
