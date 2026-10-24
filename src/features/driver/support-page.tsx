"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,ChevronDown,Headphones,Plus,Send} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverTickets,ticketTextMatch,type DriverSupportDraft} from "./service-model";
import type {Ticket} from "@/types/domain";
const questions=[
 {title:"Who handles screen faults?",answer:"A real installation/technical team is not connected yet. Use Maintenance & Issues to create a fictional report for an owned screen; it does not dispatch a technician."},
 {title:"Are the shown settlements actual earnings?",answer:"No. Part 16 displays only fictional settlement ledger records. No banking, transfer confirmation or live income calculation exists."},
 {title:"Can I view real GPS routes or playback counts?",answer:"No. The system currently has stored sample bookings and screen metadata, but no telematics, exposure routes or independently verified ad-play logs."},
 {title:"Will a demo support ticket receive a reply?",answer:"No. The ticket and Admin notice are stored locally for workflow demonstration. They are not delivered to a real helpdesk."}
];
const initial:DriverSupportDraft={category:"technical",subject:"",description:""};
export function DriverSupport(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [draft,setDraft]=React.useState<DriverSupportDraft>(initial),[open,setOpen]=React.useState(false);
 const [query,setQuery]=React.useState(""),[status,setStatus]=React.useState<Ticket["status"]|"all">("all");
 const [error,setError]=React.useState(""),[message,setMessage]=React.useState("");
 const tickets=driverTickets(db,accountId);
 const matches=tickets.filter(t=>(status==="all"||t.status===status)&&ticketTextMatch(t,query));
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setMessage("");
  try{const id=useDemoStore.getState().createDriverSupport({role:"driver",accountId},draft);
   setDraft(initial);setOpen(false);setMessage("Fictional ticket "+id+" saved. No external support message was sent.");
  }catch(e){setError(e instanceof Error?e.message:"Could not submit demo ticket.");}
 }
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Support · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Driver Support</h1><p className="mt-2 text-sm text-muted-foreground">Frequently asked questions and your account-owned fictional support history.</p></div><Button onClick={()=>{setError("");setOpen(v=>!v);}}><Plus className="size-4"/>{open?"Close form":"New request"}</Button></div>
  <DriverDemoWarning detail="No live helpdesk, customer service agent, response time commitment, phone call or service order is connected. Do not provide real personal, identity or bank information."/>
  {message&&<p role="status" className="rounded-lg bg-[#effaf3] p-3 text-sm text-[#256d44]">{message}</p>}
  {open&&<Card><CardHeader><CardTitle>New Demo Support Request</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
   <label className="block text-sm font-semibold text-brand-navy">Topic<select className="mt-1 min-h-11 w-full rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as DriverSupportDraft["category"]}))}><option value="technical">Technical</option><option value="billing">Sample settlement question</option><option value="other">Other</option></select></label>
   <label className="block text-sm font-semibold text-brand-navy">Subject *<input required minLength={5} maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm" value={draft.subject} onChange={e=>setDraft(d=>({...d,subject:e.target.value}))} placeholder="Example support question"/></label>
   <label className="block text-sm font-semibold text-brand-navy">Explanation *<textarea required minLength={15} maxLength={1200} rows={4} className="mt-1 w-full rounded-lg border border-[#cbdcf0] bg-white p-3 text-sm" value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="Use fictional, non-sensitive details…"/><span className="block text-xs font-normal text-muted-foreground">{draft.description.length}/1200</span></label>
   {error&&<p role="alert" className="rounded-lg bg-[#fff0f2] p-3 text-sm text-[#af2540]">{error}</p>}
   <div className="flex gap-2"><Button type="submit"><Send className="size-4"/>Save demo request</Button><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button></div>
  </form></CardContent></Card>}
  <div className="grid gap-4 lg:grid-cols-2">
   <Card><CardHeader><CardTitle>Common Questions</CardTitle></CardHeader><CardContent className="space-y-2">{questions.map(q=><details key={q.title} className="group rounded-xl border border-[#e0eafa] p-4"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-navy">{q.title}<ChevronDown className="size-4 shrink-0 text-brand-blue group-open:rotate-180"/></summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{q.answer}</p></details>)}<Link href="/driver/maintenance" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Report a screen issue <ArrowRight className="size-4"/></Link></CardContent></Card>
   <Card><CardHeader><CardTitle>My Ticket History</CardTitle></CardHeader><CardContent><div className="mb-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-[#607894]">Search tickets<input value={query} onChange={e=>setQuery(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm" type="search" placeholder="Subject or reference"/></label><label className="text-xs font-semibold text-[#607894]">Status<select value={status} onChange={e=>setStatus(e.target.value as typeof status)} className="mt-1 min-h-11 w-full rounded-lg border border-[#cbdcf0] bg-white px-3 text-sm"><option value="all">All</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div>
    <p className="mb-3 text-xs text-muted-foreground">{matches.length} of {tickets.length} owned ticket(s)</p>
    <div className="space-y-3">{matches.length?matches.map(t=><article key={t.id} className="rounded-xl border border-[#e0eafa] p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-brand-navy">{t.subject}</p><Badge tone={t.status==="resolved"?"success":t.status==="in_progress"?"info":"warning"}>{t.status.replaceAll("_"," ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{t.id} · {t.createdAt}{t.screenId?" · "+t.screenId:""}</p>{t.description&&<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#59718f]">{t.description}</p>}</article>):<div className="rounded-lg bg-[#f7faff] p-5 text-sm text-muted-foreground"><Headphones className="mb-2 size-7 text-brand-blue"/>No matching tickets.</div>}</div>
   </CardContent></Card>
  </div>
 </main></DriverAccess>;
}
