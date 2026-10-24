"use client";
import * as React from "react";
import {Bell,BellOff,CheckCheck,CheckCircle2,Search} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverNotices} from "./service-model";
import type {Notice} from "@/types/domain";
const types:readonly Notice["type"][]=["campaign","device","settlement","verification","support","billing"];
export function DriverNotifications(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [search,setSearch]=React.useState(""),[type,setType]=React.useState<Notice["type"]|"all">("all"),[unread,setUnread]=React.useState(false);
 const [error,setError]=React.useState(""),[message,setMessage]=React.useState("");
 const owned=driverNotices(db,accountId);
 const results=owned.filter(n=>(type==="all"||n.type===type)&&(!unread||!n.read)&&(!search.trim()||[n.title,n.message,n.type].some(t=>t.toLowerCase().includes(search.trim().toLowerCase()))));
 function mark(id:string){setError("");try{useDemoStore.getState().markNoticeRead({role:"driver",accountId},id);}catch(e){setError(e instanceof Error?e.message:"Could not mark notice.");}}
 function all(){setError("");try{useDemoStore.getState().markDriverNoticesRead({role:"driver",accountId});setMessage("Your driver demo notices are now marked read.");}catch(e){setError(e instanceof Error?e.message:"Could not mark notices.");}}
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-5xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Alerts · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Campaign assignments, verification and maintenance notices in the local demo.</p></div><Button variant="outline" disabled={!owned.some(n=>!n.read)} onClick={all}><CheckCheck className="size-4"/>Mark all read</Button></div>
  <DriverDemoWarning detail="These are stored local notices, not SMS, email, push alerts, verified screen telemetry or payout notifications."/>
  <div className="grid grid-cols-2 gap-3">{[["All notices",owned.length],["Unread",owned.filter(n=>!n.read).length]].map(([label,val])=><div key={label} className="rounded-xl border border-[#dce8f8] bg-white p-4"><Bell className="size-5 text-brand-blue"/><p className="mt-2 text-2xl font-extrabold text-brand-navy">{val}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
  {error&&<p role="alert" className="rounded-lg bg-[#fff0f2] p-3 text-sm text-[#aa2541]">{error}</p>}
  {message&&<p role="status" className="rounded-lg bg-[#effaf4] p-3 text-sm text-[#276a43]">{message}</p>}
  <Card><CardHeader><CardTitle>Notice Center</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]"><label><span className="mb-1 block text-xs font-semibold text-[#5c7895]">Search</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#8ba1bc]"/><input value={search} onChange={e=>setSearch(e.target.value)} type="search" className="min-h-11 w-full rounded-xl border border-[#ceddf0] bg-white pl-10 pr-3 text-sm text-brand-navy" placeholder="Search notices"/></span></label>
   <label><span className="mb-1 block text-xs font-semibold text-[#5c7895]">Type</span><select className="min-h-11 w-full rounded-xl border border-[#ceddf0] bg-white px-3 text-sm text-brand-navy" value={type} onChange={e=>setType(e.target.value as Notice["type"]|"all")}><option value="all">All types</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select></label><label className="flex min-h-11 items-center gap-2 self-end text-sm text-brand-navy"><input type="checkbox" checked={unread} onChange={e=>setUnread(e.target.checked)} className="size-4 accent-[#0866ff]"/>Unread only</label></div>
   <p className="my-4 text-xs text-muted-foreground">{results.length} notice(s) matched</p>
   <div className="space-y-3">{results.length?results.map(n=><article key={n.id} className={"rounded-xl border p-4 "+(n.read?"border-[#e0eafa] bg-white":"border-[#bbd8ff] bg-[#f5f9ff]")}><div className="flex flex-wrap items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f2ff] text-brand-blue">{n.read?<BellOff className="size-5"/>:<Bell className="size-5"/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-brand-navy">{n.title}</h3><Badge>{n.type}</Badge>{!n.read&&<Badge tone="info">Unread</Badge>}</div><p className="mt-2 break-words text-sm leading-6 text-[#546f90]">{n.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("en-IN")}</p></div>{!n.read&&<Button size="sm" variant="outline" onClick={()=>mark(n.id)}><CheckCircle2 className="size-4"/>Mark read</Button>}</div></article>)
    :<p className="rounded-lg bg-[#f7faff] p-5 text-sm text-muted-foreground">No notices match this search or filter.</p>}</div>
  </CardContent></Card>
 </main></DriverAccess>;
}
