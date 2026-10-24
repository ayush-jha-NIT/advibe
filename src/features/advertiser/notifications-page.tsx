"use client";
import * as React from "react";
import Link from "next/link";
import {Bell,BellOff,CheckCheck,CheckCircle2,Filter,Search,ShieldAlert} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {ownerNotices} from "./account-model";
import {useAdvertiserData} from "./shared";
import type {Notice} from "@/types/domain";

const noticeTypes:readonly Notice["type"][]=["campaign","verification","device","billing","settlement","support"];
function localDate(value:string):string{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(date);
}
export function AdvertiserNotifications(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const [query,setQuery]=React.useState("");
 const [type,setType]=React.useState<Notice["type"]|"all">("all");
 const [unreadOnly,setUnreadOnly]=React.useState(false);
 const [error,setError]=React.useState(""),[notice,setNotice]=React.useState("");
 const owned=React.useMemo(()=>ownerNotices(db,accountId),[db,accountId]);
 const items=React.useMemo(()=>owned.filter(n=>(type==="all"||n.type===type)
  &&(!unreadOnly||!n.read)&&(!query.trim()||[n.title,n.message,n.type].some(x=>x.toLowerCase().includes(query.trim().toLowerCase())))),[owned,type,unreadOnly,query]);
 const unread=owned.filter(n=>!n.read).length;
 function mark(id:string){
  try{setError("");setNotice("");useDemoStore.getState().markNoticeRead({role:"advertiser",accountId},id);}
  catch(e){setError(e instanceof Error?e.message:"Cannot mark notification.");}
 }
 function markAll(){
  try{setError("");useDemoStore.getState().markAllNoticesRead({role:"advertiser",accountId});setNotice("All your demo notifications are now marked read.");}
  catch(e){setError(e instanceof Error?e.message:"Cannot update notifications.");}
 }
 if(!hydrated)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading notifications…</p>;
 return <main className="mx-auto max-w-5xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Alerts · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Notifications</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Review stored campaign and support notices for your fictional advertiser account.</p></div>
   <Button variant="outline" disabled={!unread||accountId==="not-provisioned"} onClick={markAll}><CheckCheck className="size-4"/>Mark all read</Button>
  </div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d4e6fa] bg-[#eff7ff] p-4 text-xs leading-6 text-[#46688d]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/>Notifications reflect only actions in this browser demo. No email, SMS, push notification or real delivery-state event has been sent.</p>
  <div className="grid grid-cols-2 gap-3">{[["All notifications",owned.length],["Unread",unread]].map(([title,value])=><div key={title} className="rounded-xl border border-[#dae6f6] bg-white p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-extrabold text-brand-navy">{value}</p></div>)}</div>
  {error&&<p role="alert" className="rounded-xl bg-[#fff0f2] p-3 text-sm text-[#b5283c]">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-[#effaf4] p-3 text-sm text-[#266744]">{notice}</p>}
  <Card><CardHeader><CardTitle>Notification Center</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
    <label><span className="mb-1 block text-xs font-semibold text-[#526e92]">Search notices</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#869fbd]"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notice text" className="min-h-11 w-full rounded-xl border border-[#d2dff2] bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-blue"/></span></label>
    <label><span className="mb-1 block text-xs font-semibold text-[#526e92]">Event type</span><select className="min-h-11 w-full rounded-xl border border-[#d2dff2] bg-white px-3 text-sm" value={type} onChange={e=>setType(e.target.value as Notice["type"]|"all")}><option value="all">All types</option>{noticeTypes.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}</select></label>
    <button type="button" aria-pressed={unreadOnly} onClick={()=>setUnreadOnly(v=>!v)} className={"mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold "+(unreadOnly?"border-brand-blue bg-brand-blue text-white":"border-[#d2dff2] bg-white text-brand-blue")}><Filter className="size-4"/>Unread only</button>
   </div>
   <p className="my-4 text-xs text-muted-foreground">{items.length} matching notification(s)</p>
   {items.length?<div className="space-y-3">{items.map(n=><article key={n.id} className={"rounded-xl border p-4 "+(n.read?"border-[#e2eaf6] bg-white":"border-[#b4d4fe] bg-[#f5f9ff]")}>
    <div className="flex flex-wrap items-start gap-3">
     <div className={"grid size-11 shrink-0 place-items-center rounded-xl "+(n.read?"bg-[#eef2f8] text-[#7290b2]":"bg-[#e2f0ff] text-brand-blue")}>{n.read?<BellOff className="size-5"/>:<Bell className="size-5"/>}</div>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-brand-navy">{n.title}</h2>{!n.read&&<Badge tone="info">Unread</Badge>}<Badge className="capitalize">{n.type}</Badge></div><p className="mt-2 break-words text-sm leading-6 text-[#526b8c]">{n.message}</p><p className="mt-2 text-xs text-muted-foreground">{localDate(n.createdAt)}</p></div>
     {!n.read&&<Button variant="outline" size="sm" className="min-h-11" onClick={()=>mark(n.id)}><CheckCircle2 className="size-4"/>Mark read</Button>}
    </div>
   </article>)}</div>:<div className="rounded-xl border border-dashed border-[#cbdcf1] bg-[#f8fbff] p-7 text-center"><BellOff className="mx-auto size-8 text-[#84a0be]"/><p className="mt-3 font-bold text-brand-navy">No notifications match</p><p className="mt-1 text-sm text-muted-foreground">Try changing the type, search or unread filter.</p></div>}
  </CardContent></Card>
  <div className="flex flex-wrap gap-3"><Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-blue hover:underline">View campaigns</Link><Link href="/advertiser/support" className="inline-flex min-h-11 items-center text-sm font-bold text-brand-blue hover:underline">Help & Support</Link></div>
 </main>;
}
