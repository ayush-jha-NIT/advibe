"use client";
import * as React from "react";
import {Bell,CheckCheck,Download,RotateCcw} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import type {Notice,Ticket} from "@/types/domain";
import {AdminAccess,AdminAction,AdminHeading,AdminNavLink,AdminNotice,AdminWarning,control,demoAdmin,MiniStat,StatusPill,useAdminData} from "./admin-shared";
import {adminAuditCSV} from "./admin-governance-rules";
function download(content:string){
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="advibe-admin-DEMO-audit.csv";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export function AdminSupport(){
 const {db,ready,admin}=useAdminData();
 const [query,setQuery]=React.useState(""),[status,setStatus]=React.useState<Ticket["status"]|"all">("all"),[message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 const rows=db.tickets.filter(t=>(status==="all"||t.status===status)&&(!query||[t.id,t.subject,t.screenId??"",t.accountId,db.accounts.find(a=>a.id===t.accountId)?.name??""].some(x=>x.toLowerCase().includes(query.toLowerCase())))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 function transition(t:Ticket,next:Ticket["status"]){
  if(!window.confirm("Change fictional support ticket "+t.id+" to "+next+"? No actual message or service dispatch occurs."))return;
  setError("");setMessage("");
  try{useDemoStore.getState().adminUpdateTicket(demoAdmin,t.id,next);setMessage("Demo ticket "+t.id+" status updated.");}catch(e){setError(e instanceof Error?e.message:"Ticket transition blocked.");}
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Support & Disputes" eyebrow="Admin · Service Desk" description="Review fictional support and driver maintenance tickets, update sample work statuses and inspect linked records."/>
  <AdminWarning>No external helpdesk, technician dispatch, refund adjudication, dispute resolution or customer messaging is connected. Changing a ticket status creates only a local audit event and recipient notice.</AdminWarning><AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="All tickets" value={db.tickets.length}/><MiniStat label="Open" value={db.tickets.filter(t=>t.status==="open").length}/><MiniStat label="In progress" value={db.tickets.filter(t=>t.status==="in_progress").length}/></div>
  <Card><CardHeader><CardTitle>Account-owned Support Records</CardTitle></CardHeader><CardContent>
   <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#607995]">Search ticket, account or device<input type="search" className={control+" mt-1"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ticket, driver, advertiser, screen"/></label><label className="text-xs font-semibold text-[#607995]">Status<select className={control+" mt-1"} value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div>
   <p className="mb-3 text-xs text-muted-foreground">{rows.length} of {db.tickets.length} tickets matched</p>
   <div className="grid gap-3 lg:grid-cols-2">{rows.map(t=><article key={t.id} className="rounded-xl border border-[#dce8f7] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words font-bold text-brand-navy">{t.subject}</h2><p className="mt-1 text-xs text-muted-foreground">{t.id} · {t.createdAt}</p></div><StatusPill value={t.status}/></div>
    <p className="mt-2 text-xs text-muted-foreground">Owner: {db.accounts.find(a=>a.id===t.accountId)?.name??t.accountId} · {t.category??"General"}</p>
    {t.screenId&&<p className="mt-1 text-xs text-muted-foreground">Linked sample screen: {t.screenId}</p>}
    {t.description&&<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#526d8b]">{t.description}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{t.status==="open"?<><AdminAction onClick={()=>transition(t,"in_progress")}>Mark in progress</AdminAction><AdminAction onClick={()=>transition(t,"resolved")}>Mark resolved</AdminAction></>:t.status==="in_progress"?<><AdminAction onClick={()=>transition(t,"resolved")}>Mark resolved</AdminAction><AdminAction onClick={()=>transition(t,"open")}>Reopen</AdminAction></>:<AdminAction onClick={()=>transition(t,"in_progress")}>Reopen for review</AdminAction>}</div>
   </article>)}{!rows.length&&<p className="rounded-xl bg-[#f7faff] p-5 text-sm text-muted-foreground">No matching sample tickets.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminNotifications(){
 const {db,ready,admin}=useAdminData();
 const [query,setQuery]=React.useState(""),[unread,setUnread]=React.useState(false),[type,setType]=React.useState<Notice["type"]|"all">("all");
 const [message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 const all=db.notices.filter(n=>n.recipientId==="adm-1").sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const rows=all.filter(n=>(type==="all"||n.type===type)&&(!unread||!n.read)&&(!query.trim()||[n.title,n.message,n.type].some(v=>v.toLowerCase().includes(query.toLowerCase()))));
 function markOne(id:string){
  setError("");setMessage("");try{useDemoStore.getState().markNoticeRead(demoAdmin,id);}catch(e){setError(e instanceof Error?e.message:"Cannot mark notice.");}
 }
 function markAll(){
  setError("");setMessage("");try{useDemoStore.getState().adminMarkNoticesRead(demoAdmin);setMessage("All Admin demo notices are marked read.");}catch(e){setError(e instanceof Error?e.message:"Cannot mark notices.");}
 }
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><AdminHeading title="Admin Notifications" eyebrow="Admin · Account Notices" description="Account-owned sample alerts from the shared campaign, verification, support and device workflows."/><Button variant="outline" onClick={markAll} disabled={!all.some(n=>!n.read)}><CheckCheck className="size-4"/>Mark all read</Button></div>
  <AdminWarning>These notices exist only in browser storage. No production push/email/SMS messages, delivery confirmations or support responses are sent.</AdminWarning><AdminNotice error={error} message={message}/>
  <div className="grid grid-cols-2 gap-3"><MiniStat label="All Admin notices" value={all.length}/><MiniStat label="Unread Admin notices" value={all.filter(n=>!n.read).length}/></div>
  <Card><CardHeader><CardTitle>Notice Center</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-[1.2fr_.8fr_auto]">
   <label className="text-xs font-semibold text-[#587291]">Search<input type="search" className={control+" mt-1"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Notice text"/></label>
   <label className="text-xs font-semibold text-[#587291]">Type<select className={control+" mt-1"} value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="all">All types</option>{(["campaign","verification","device","billing","settlement","support"] as const).map(t=><option key={t}>{t}</option>)}</select></label>
   <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold text-brand-navy"><input type="checkbox" className="size-4 accent-[#0866ff]" checked={unread} onChange={e=>setUnread(e.target.checked)}/>Unread only</label>
   </div><p className="my-3 text-xs text-muted-foreground">{rows.length} notice(s) matched</p>
   <div className="space-y-3">{rows.map(n=><article key={n.id} className={"rounded-xl border p-4 "+(n.read?"border-[#e0eaf6] bg-white":"border-[#b8d5fb] bg-[#f4f9ff]")}><div className="flex flex-wrap items-start gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-brand-blue"/><div className="min-w-0 flex-1"><h2 className="font-bold text-brand-navy">{n.title}</h2><p className="mt-1 text-xs text-muted-foreground">{n.type} · {new Date(n.createdAt).toLocaleString("en-IN")}</p><p className="mt-2 text-sm leading-6 text-[#53708e]">{n.message}</p></div>{!n.read&&<AdminAction onClick={()=>markOne(n.id)}>Mark read</AdminAction>}</div></article>)}{!rows.length&&<p className="p-5 text-sm text-muted-foreground">No matching Admin notices.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminAudit(){
 const {db,ready,admin}=useAdminData();
 const [query,setQuery]=React.useState(""),[entity,setEntity]=React.useState("all");
 const entities=[...new Set(db.auditEvents.map(e=>e.entity))].sort();
 const rows=db.auditEvents.filter(e=>(entity==="all"||e.entity===entity)&&(!query||[e.actorId,e.entity,e.entityId,e.action].some(x=>x.toLowerCase().includes(query.toLowerCase())))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
 function download(){
  const data=adminAuditCSV({...db,auditEvents:rows}),url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="advibe-DEMO-audit-log.csv";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><AdminHeading title="Audit History" eyebrow="Admin · Local Event Trace" description="Browse actions recorded by the shared fictional demo store, including campaign and administrative changes."/><Button variant="outline" onClick={download} disabled={!rows.length}><Download className="size-4"/>Export filtered CSV</Button></div>
  <AdminWarning>This audit trail is stored on the same editable local client as the data. It is neither tamper-proof nor a production compliance log; time records reflect browser timestamps.</AdminWarning>
  <div className="grid grid-cols-2 gap-3"><MiniStat label="Recorded demo events" value={db.auditEvents.length}/><MiniStat label="Visible after filters" value={rows.length}/></div>
  <Card><CardHeader><CardTitle>Recent Events</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#607a95]">Search event details<input value={query} onChange={e=>setQuery(e.target.value)} className={control+" mt-1"} type="search" placeholder="Actor, entity, action"/></label>
    <label className="text-xs font-semibold text-[#607a95]">Entity type<select className={control+" mt-1"} value={entity} onChange={e=>setEntity(e.target.value)}><option value="all">All entity types</option>{entities.map(v=><option value={v} key={v}>{v}</option>)}</select></label></div>
   <p className="my-3 text-xs text-muted-foreground">Displaying up to the 100 most recent matching demo events</p>
   <div className="space-y-2">{rows.map(e=><article key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e1eaf7] p-4"><div className="min-w-0"><p className="break-words font-bold text-brand-navy">{e.action.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-muted-foreground">{e.entity} · {e.entityId} · Actor {e.actorId}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("en-IN")}</p></div><Badge tone="info">{e.id.slice(0,12)}</Badge></article>)}{!rows.length&&<p className="rounded-xl bg-[#f7faff] p-6 text-sm text-muted-foreground">No recorded events match. A fresh demo database starts without audit events. Actions taken through the app populate this list.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminSettings(){
 const {ready,admin}=useAdminData();
 const [message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 function reset(){
  if(!window.confirm("Reset ALL fictional campaign, creative, driver, ticket, pricing and settlement records in this browser to the seed? This destroys local demo changes."))return;
  if(!window.confirm("Confirm a second time: erase all shared demo changes for this browser?"))return;
  setError("");setMessage("");
  try{useDemoStore.getState().reset(demoAdmin);setMessage("Shared demo dataset restored to seeded fictional examples. Browser demo auth/session remains separate.");}catch(e){setError(e instanceof Error?e.message:"Reset was blocked.");}
 }
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-5xl space-y-5 pb-10">
  <AdminHeading title="Admin Settings" eyebrow="Admin · Environment" description="Inspect the demo environment and safely reset shared fictional records for testing."/>
  <AdminWarning>These settings cannot manage production permissions, gateway credentials, encryption, bank accounts, device keys or secure user sessions. Production configuration must live on authorized backend infrastructure.</AdminWarning>
  <AdminNotice error={error} message={message}/>
  <Card><CardHeader><CardTitle>Demonstration Environment</CardTitle></CardHeader><CardContent className="space-y-3">{[
   ["Data persistence","Browser localStorage · advibe:demo:v1"],
   ["Authentication","Public test identities and sessionStorage only"],
   ["Gateway integration","Inactive, no real Cashfree charge or refund"],
   ["KYC and identity","Fictional sample statuses, no uploaded IDs"],
   ["Physical devices","Read-only simulated statuses; no paired hardware"],
   ["Account access","Frontend preview only; no production RBAC"]
  ].map(([key,value])=><div key={key} className="flex flex-wrap justify-between gap-3 rounded-xl bg-[#f6f9ff] p-3 text-sm"><span className="font-semibold text-brand-navy">{key}</span><span className="text-[#587390]">{value}</span></div>)}</CardContent></Card>
  <Card><CardHeader><CardTitle>Reset Local Demo Data</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Reset restores the original seeded records for every portal in this browser. All added tickets, onboarding previews, changes to sample pricing, local booking assignments and demo audit entries will be lost. Demo sessions are stored separately.</p>
   <Button variant="destructive" className="mt-4" onClick={reset}><RotateCcw className="size-4"/>Reset fictional dataset</Button>
  </CardContent></Card>
  <AdminNavLink href="/admin/audit">Inspect demo audit history</AdminNavLink>
 </main></AdminAccess>;
}
