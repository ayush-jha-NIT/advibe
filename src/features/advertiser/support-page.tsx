"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,ChevronDown,FileQuestion,Headphones,Plus,Search,Send,ShieldAlert,Ticket as TicketIcon} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {filterTickets,ownerTickets,supportCategories,type SupportCategory,type TicketDraft} from "./account-model";
import {useAdvertiserData} from "./shared";
import type {Ticket} from "@/types/domain";

const questions=[
 {q:"When does my advertising campaign go live?",a:"The frontend demo requires a separate Admin approval step, a confirmed payment flag and confirmed screen bookings before the record can be marked live. Real activation and hardware delivery are not connected."},
 {q:"Can I upload video or artwork to AdVibe?",a:"Only local previews and creative metadata are supported right now. Your file is not sent to a server. Approved production media upload, moderation and device distribution will require secure backend services."},
 {q:"Can I pay through Cashfree right now?",a:"No. The Billing page demonstrates readiness and sample ledger entries, but cannot create a Cashfree order. A trusted server must authenticate the advertiser, compute the charge, create an order and verify payment status."},
 {q:"How are screens and cities selected?",a:"The Locations page shows fictional eligible screens and accepts provisional selections. Campaign wizard validation rechecks the chosen period. No inventory is reserved by a frontend selection."},
 {q:"Where can I download my invoice?",a:"Billing provides a clearly labeled text-based demonstration statement for stored fictional payments. It is not a tax invoice or evidence of a completed transaction."},
 {q:"Will support reply to this ticket?",a:"This is a browser-local demonstration. The ticket is saved in the shared demo records and an Admin demo notice is created, but no email, helpdesk, SLA or real staff member is connected."}
];
const field="min-h-11 w-full rounded-xl border border-[#cddff4] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#dcecff]";
const draftInitial:TicketDraft={subject:"",description:"",category:"campaign",campaignId:""};
function readable(value:string){return value.replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase());}
const statusTone:Record<Ticket["status"],"warning"|"info"|"success">={open:"warning",in_progress:"info",resolved:"success"};
export function AdvertiserSupport(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const [draft,setDraft]=React.useState<TicketDraft>(draftInitial);
 const [search,setSearch]=React.useState(""),[ticketSearch,setTicketSearch]=React.useState("");
 const [status,setStatus]=React.useState<Ticket["status"]|"all">("all");
 const [showForm,setShowForm]=React.useState(false);
 const [error,setError]=React.useState(""),[message,setMessage]=React.useState("");
 const tickets=React.useMemo(()=>ownerTickets(db,accountId),[db,accountId]);
 const campaigns=React.useMemo(()=>db.campaigns.filter(c=>c.advertiserId===accountId),[db,accountId]);
 const visible=React.useMemo(()=>filterTickets(tickets,ticketSearch,status),[tickets,ticketSearch,status]);
 const faqs=questions.filter(x=>!search.trim()||[x.q,x.a].some(t=>t.toLowerCase().includes(search.trim().toLowerCase())));
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setMessage("");
  try{
   const id=useDemoStore.getState().createAdvertiserTicket({role:"advertiser",accountId},draft);
   setDraft(draftInitial);setShowForm(false);setMessage("Demo ticket "+id+" saved locally. No helpdesk message was sent.");
  }catch(e){setError(e instanceof Error?e.message:"Cannot save demo ticket.");}
 }
 if(!hydrated)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading advertiser support…</p>;
 return <main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Assistance · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Help & Support</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Find guidance and create a demonstration support request for your advertiser workspace.</p></div>
   <Button disabled={accountId==="not-provisioned"} onClick={()=>{setShowForm(v=>!v);setError("");}}>{showForm?"Close request":"New support request"} <Plus className="size-4"/></Button></div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d4e5f9] bg-[#eff6ff] p-4 text-xs leading-6 text-[#48678c]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/>Tickets and replies are not connected to customer service. A submitted request creates only a fictional browser-local record and a demo Admin notice. Do not include passwords, payment numbers, government IDs or personal secrets.</p>
  {message&&<p role="status" className="rounded-xl bg-[#effaf5] p-3 text-sm text-[#216a45]">{message}</p>}
  {error&&<p role="alert" className="rounded-xl bg-[#fff0f2] p-3 text-sm text-[#b72b43]">{error}</p>}
  {showForm&&<Card><CardHeader><CardTitle>Submit Demonstration Support Request</CardTitle><p className="text-xs text-muted-foreground">This form does not contact a real support team.</p></CardHeader><CardContent>
   <form onSubmit={submit} noValidate className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
     <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Topic *</span><select className={field} value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as SupportCategory}))}>{supportCategories.map(c=><option value={c} key={c}>{readable(c)}</option>)}</select></label>
     <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Related campaign (optional)</span><select className={field} value={draft.campaignId} onChange={e=>setDraft(d=>({...d,campaignId:e.target.value}))}><option value="">No campaign</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    </div>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-brand-navy">Subject *</span><input required minLength={5} maxLength={120} className={field} placeholder="Describe the question" value={draft.subject} onChange={e=>setDraft(d=>({...d,subject:e.target.value}))}/></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-brand-navy">Description *</span><textarea required rows={5} minLength={15} maxLength={1200} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} className={field+" min-h-28 py-3"} placeholder="Share the non-sensitive details of your demo issue…"/><span className="mt-1 block text-xs text-muted-foreground">{draft.description.length}/1200 characters</span></label>
    <div className="flex flex-wrap gap-2"><Button type="submit"><Send className="size-4"/>Save demo request</Button><Button variant="outline" onClick={()=>{setShowForm(false);setDraft(draftInitial);setError("");}}>Cancel</Button></div>
   </form>
  </CardContent></Card>}
  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
   <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileQuestion className="size-5 text-brand-blue"/>Frequently Asked Questions</CardTitle></CardHeader><CardContent>
    <label className="mb-4 block"><span className="sr-only">Search help articles</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#8ba0b8]"/><input className={field+" pl-10"} type="search" placeholder="Search common questions" value={search} onChange={e=>setSearch(e.target.value)}/></span></label>
    {faqs.length?<div className="space-y-2">{faqs.map(item=><details key={item.q} className="group rounded-xl border border-[#e0e9f6] p-4"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-brand-navy"><span className="text-sm">{item.q}</span><ChevronDown className="size-4 shrink-0 text-brand-blue transition group-open:rotate-180"/></summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.a}</p></details>)}</div>:<p className="rounded-lg bg-[#f7faff] p-5 text-sm text-muted-foreground">No matching help article.</p>}
   </CardContent></Card>
   <Card><CardHeader><CardTitle className="flex items-center gap-2"><TicketIcon className="size-5 text-brand-blue"/>My Support Requests</CardTitle></CardHeader><CardContent>
    <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]"><label><span className="sr-only">Search tickets</span><input className={field} type="search" placeholder="Search ticket title or ID" value={ticketSearch} onChange={e=>setTicketSearch(e.target.value)}/></label><label><span className="sr-only">Filter ticket status</span><select className={field} value={status} onChange={e=>setStatus(e.target.value as Ticket["status"]|"all")}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div>
    <p className="mb-3 text-xs text-muted-foreground">{visible.length} of {tickets.length} account ticket(s)</p>
    {visible.length?<div className="space-y-3">{visible.map(t=><article key={t.id} className="rounded-xl border border-[#dde8f7] p-4">
     <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-sm font-bold text-brand-navy">{t.subject}</h3><Badge tone={statusTone[t.status]}>{readable(t.status)}</Badge></div>
     <p className="mt-1 text-xs text-muted-foreground">{t.id} · Created {t.createdAt} · {readable(t.category??"other")}</p>
     {t.description&&<p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-[#526b89]">{t.description}</p>}
     {t.campaignId&&<Link href={"/advertiser/campaigns/"+encodeURIComponent(t.campaignId)} className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-brand-blue">Related campaign <ArrowRight className="size-4"/></Link>}
    </article>)}</div>:<div className="rounded-xl border border-dashed border-[#cbdbf2] bg-[#f8fbff] p-6 text-center"><Headphones className="mx-auto size-8 text-[#8aa7c7]"/><p className="mt-3 font-semibold text-brand-navy">No matching requests</p><p className="mt-1 text-xs text-muted-foreground">Create a new demo ticket or change your filters.</p></div>}
    <p className="mt-4 flex items-center gap-2 text-xs leading-6 text-muted-foreground"><CheckCircle2 className="size-4"/>Status changes require future Admin workflows. Saving here does not imply real support response.</p>
   </CardContent></Card>
  </div>
  <Link href="/help-center" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue hover:underline">Visit public Help Center <ArrowRight className="size-4"/></Link>
 </main>;
}
