"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,Monitor,Plus,ShieldAlert,Wrench} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {ownedDriverScreens} from "./operations-model";
import {driverTickets,maintenanceCategories,ownedMaintenanceScreen,type DriverIssueDraft} from "./service-model";
const initial:DriverIssueDraft={screenId:"",category:"screen_offline",subject:"",description:""};
const field="mt-1 min-h-11 w-full rounded-xl border border-[#c8dbf0] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d5e9ff]";
const categoryLabels:Record<DriverIssueDraft["category"],string>={screen_offline:"Screen showing offline",screen_damage:"Screen or casing damage",power:"Power or charging issue",mounting:"Mounting / fitment concern",other:"Other device issue"};
export function DriverMaintenance(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const screens=ownedDriverScreens(db,accountId);
 const [draft,setDraft]=React.useState<DriverIssueDraft>(initial);
 const [open,setOpen]=React.useState(false),[error,setError]=React.useState(""),[message,setMessage]=React.useState("");
 const [filter,setFilter]=React.useState<"all"|"open"|"in_progress"|"resolved">("all");
 const tickets=driverTickets(db,accountId).filter(t=>!!t.screenId);
 const visible=tickets.filter(t=>filter==="all"||t.status===filter);
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setMessage("");
  try{
   const id=useDemoStore.getState().createDriverMaintenance({role:"driver",accountId},draft);
   setMessage("Sample issue "+id+" recorded in this browser. No real repair dispatch was created.");
   setDraft(initial);setOpen(false);
  }catch(e){setError(e instanceof Error?e.message:"Could not save issue.");}
 }
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Device Care · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Maintenance & Issues</h1><p className="mt-2 text-sm text-muted-foreground">Report a fictional issue with one of your own demo screens and review its support status.</p></div><Button disabled={!screens.length} onClick={()=>{setError("");setOpen(v=>!v);}}><Plus className="size-4"/>{open?"Close form":"Report an issue"}</Button></div>
  <DriverDemoWarning detail="This is a browser-local issue log, not a monitored IoT alert or a maintenance dispatch system. Issues do not change actual screen status or trigger a technician visit."/>
  <div className="grid grid-cols-3 gap-3">{[
   ["My screens",screens.length],["Open reports",tickets.filter(t=>t.status==="open").length],["Resolved demo reports",tickets.filter(t=>t.status==="resolved").length]
  ].map(([label,val])=><div key={label} className="rounded-xl border border-[#dce8f8] bg-white p-3 sm:p-5"><Wrench className="size-5 text-brand-blue"/><p className="mt-2 text-xl font-extrabold text-brand-navy">{val}</p><p className="mt-1 text-xs text-[#627a98]">{label}</p></div>)}</div>
  {message&&<p role="status" className="rounded-xl bg-[#effaf4] p-3 text-sm text-[#236947]">{message}</p>}
  {open&&<Card><CardHeader><CardTitle>New Device Issue Report</CardTitle><p className="text-xs text-muted-foreground">Use invented issue descriptions only. Real personal details and hardware identifiers are not needed.</p></CardHeader><CardContent>
   <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-brand-navy">My demo screen *<select required className={field} value={draft.screenId} onChange={e=>setDraft(d=>({...d,screenId:e.target.value}))}><option value="">Choose owned screen</option>{screens.map(s=><option key={s.id} value={s.id}>{s.id} · {s.placement.replaceAll("_"," ")}</option>)}</select></label>
     <label className="text-sm font-semibold text-brand-navy">Issue category *<select className={field} value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as DriverIssueDraft["category"]}))}>{maintenanceCategories.map(c=><option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label></div>
    <label className="block text-sm font-semibold text-brand-navy">Short description *<input required minLength={5} maxLength={100} className={field} value={draft.subject} placeholder="Example: sample screen not powered" onChange={e=>setDraft(d=>({...d,subject:e.target.value}))}/></label>
    <label className="block text-sm font-semibold text-brand-navy">Issue details *<textarea required minLength={15} maxLength={1000} rows={4} className={field+" py-3"} value={draft.description} placeholder="Describe this fictional issue without personal information…" onChange={e=>setDraft(d=>({...d,description:e.target.value}))}/><span className="mt-1 block text-xs font-normal text-muted-foreground">{draft.description.length}/1000 characters</span></label>
    {error&&<p role="alert" className="rounded-lg bg-[#fff0f2] p-3 text-sm text-[#a32941]">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit"><CheckCircle2 className="size-4"/>Save demo report</Button><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button></div>
   </form>
  </CardContent></Card>}
  <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>My Device Issue Reports</CardTitle><label className="text-xs font-semibold text-[#567493]">Status<select className="ml-2 min-h-11 rounded-lg border border-[#c9d9ec] bg-white px-3 text-sm" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">All</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div></CardHeader><CardContent className="space-y-3">
   {visible.length?visible.map(t=><article key={t.id} className="rounded-xl border border-[#dfeaf7] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-brand-navy">{t.subject}</h3><p className="mt-1 text-xs text-muted-foreground">{t.id} · {t.createdAt} · {t.screenId}</p></div><Badge tone={t.status==="resolved"?"success":t.status==="in_progress"?"info":"warning"}>{t.status.replaceAll("_"," ")} · demo</Badge></div>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#526e90]">{t.description??"No further description was recorded."}</p><p className="mt-2 text-xs text-muted-foreground">Category: {t.maintenanceCategory?categoryLabels[t.maintenanceCategory]:"Other"}. Linked screen: {ownedMaintenanceScreen(db,accountId,t.screenId??"")?.id??"Unavailable"}.</p></article>)
    :<div className="rounded-xl border border-dashed border-[#cbdcf1] bg-[#f8fbff] p-6"><Monitor className="size-8 text-[#8ea9c8]"/><p className="mt-2 text-sm font-bold text-brand-navy">No issue reports match</p><p className="mt-1 text-xs text-muted-foreground">The existing seed includes a general maintenance question, not a screen-specific issue report.</p></div>}
   <Link href="/driver/support" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">View general driver support <ArrowRight className="size-4"/></Link>
  </CardContent></Card>
  <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldAlert className="size-4 shrink-0"/>Do not attempt electrical or mechanical repairs yourself based on this demo. Real fitment and safety checks require qualified personnel.</p>
 </main></DriverAccess>;
}
