"use client";
import * as React from "react";
import {CalendarDays,CheckCircle2} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {availableScreens} from "@/lib/demo-rules";
import type {PricingRule,Settlement} from "@/types/domain";
import {AdminAccess,AdminAction,AdminHeading,AdminNotice,AdminWarning,control,demoAdmin,MiniStat,StatusPill,useAdminData,money} from "./admin-shared";
import {adminBookingCandidates,pricingSearch} from "./admin-finance-rules";

function useAction(){
 const [message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 const act=(fn:()=>void,label:string)=>{setError("");setMessage("");try{fn();setMessage(label+" updated in fictional browser records.");}catch(e){setError(e instanceof Error?e.message:"Action blocked.");}};
 return {message,error,act};
}
function RateEditor({rule,onSave}:{rule:PricingRule;onSave:(patch:Pick<PricingRule,"rupeesPerScreenDay"|"active"|"validFrom"|"validTo">)=>void}){
 const [rupees,setRupees]=React.useState(String(rule.rupeesPerScreenDay)),[from,setFrom]=React.useState(rule.validFrom),[to,setTo]=React.useState(rule.validTo),[active,setActive]=React.useState(rule.active);
 return <form onSubmit={e=>{e.preventDefault();onSave({rupeesPerScreenDay:Number(rupees),validFrom:from,validTo:to,active});}} className="mt-3 grid gap-3 rounded-xl bg-[#f7faff] p-3 sm:grid-cols-2">
  <label className="text-xs font-semibold text-[#56718f]">Sample INR per screen per day<input required type="number" step="1" min="0" max="100000" value={rupees} onChange={e=>setRupees(e.target.value)} className={control+" mt-1"}/></label>
  <label className="flex items-center gap-2 self-end pb-3 text-sm text-brand-navy"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} className="size-4 accent-[#0866ff]"/>Active fictional rate</label>
  <label className="text-xs font-semibold text-[#56718f]">Valid from<input required type="date" value={from} onChange={e=>setFrom(e.target.value)} className={control+" mt-1"}/></label>
  <label className="text-xs font-semibold text-[#56718f]">Valid through<input required type="date" value={to} onChange={e=>setTo(e.target.value)} className={control+" mt-1"}/></label>
  <div className="sm:col-span-2"><Button type="submit" size="sm"><CheckCircle2 className="size-4"/>Save sample rate</Button></div>
 </form>;
}
export function AdminPricing(){
 const {db,ready,admin}=useAdminData(),{message,error,act}=useAction();
 const [query,setQuery]=React.useState(""),[city,setCity]=React.useState("all"),[editing,setEditing]=React.useState<string|null>(null);
 const cities=[...new Set(db.pricingRules.map(r=>r.city))].sort();
 const rows=pricingSearch(db,query,city);
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Pricing & Commercial" eyebrow="Admin · Example Rate Cards" description="Inspect and edit the fictional rupee-per-screen-day records used by the local campaign quote preview."/>
  <AdminWarning>Rate-card updates affect only this browser and can change later example quotes. They do not amend signed contracts, live transactions, tax policies or previously recorded settlements.</AdminWarning><AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Sample rate rules" value={db.pricingRules.length}/><MiniStat label="Active rules" value={db.pricingRules.filter(r=>r.active).length}/><MiniStat label="Rate-card cities" value={cities.length}/></div>
  <Card><CardHeader><CardTitle>Example Rate Rules</CardTitle></CardHeader><CardContent>
   <div className="mb-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#5b7492]">Search<input type="search" className={control+" mt-1"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rate, city or format"/></label><label className="text-xs font-semibold text-[#5b7492]">City<select className={control+" mt-1"} value={city} onChange={e=>setCity(e.target.value)}><option value="all">All cities</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label></div>
   <div className="grid gap-3 lg:grid-cols-2">{rows.map(r=><article key={r.id} className="rounded-xl border border-[#dce7f7] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-brand-navy">{r.placement.replaceAll("_"," ")}</h2><p className="mt-1 text-xs text-muted-foreground">{r.city} · {r.id}</p></div><Badge tone={r.active?"success":"neutral"}>{r.active?"Active demo":"Inactive demo"}</Badge></div>
    <p className="mt-2 text-lg font-extrabold text-brand-navy">{money(r.rupeesPerScreenDay*100)}/day</p><p className="mt-1 text-xs text-muted-foreground">Valid {r.validFrom} to {r.validTo}</p>
    <AdminAction onClick={()=>setEditing(editing===r.id?null:r.id)}>{editing===r.id?"Close editor":"Edit sample rate"}</AdminAction>
    {editing===r.id&&<RateEditor key={r.id} rule={r} onSave={patch=>{
     if(!window.confirm("Update fictional rate "+r.id+"? No real contract or invoice is changed."))return;
     act(()=>useDemoStore.getState().adminUpdateRate(demoAdmin,r.id,patch),"Rate "+r.id);
     setEditing(null);
    }}/>}
   </article>)}{!rows.length&&<p className="p-5 text-sm text-muted-foreground">No pricing rules match.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
const placements=["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"] as const;
export function AdminAdFormats(){
 const {db,ready,admin}=useAdminData();
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <AdminHeading title="Ad Formats & Rules" eyebrow="Admin · Content Standards" description="Review available placement formats, illustrative rate cards and approval constraints."/>
  <AdminWarning>Actual creative specifications, hardware aspect ratios, electrical constraints, local laws and playback validation require operator-certified documents. No production format rule editor is connected.</AdminWarning>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{placements.map(p=>{
   const rows=db.pricingRules.filter(r=>r.placement===p),screens=db.screens.filter(s=>s.placement===p);
   return <Card key={p}><CardHeader><CardTitle className="capitalize">{p.replaceAll("_"," ")}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Example installed screens: <strong>{screens.length}</strong></p><p className="mt-2 text-xs text-muted-foreground">{rows.length} illustrative rate-card row(s)</p><div className="mt-3 space-y-2">{rows.map(r=><p key={r.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#f7faff] p-2 text-xs"><span>{r.city}</span><strong>{money(r.rupeesPerScreenDay*100)}/day</strong></p>)}</div><Badge className="mt-3" tone="info">Metadata approval only</Badge></CardContent></Card>;
  })}</div>
 </main></AdminAccess>;
}
export function AdminBookings(){
 const {db,ready,admin}=useAdminData(),{message,error,act}=useAction();
 const [date,setDate]=React.useState(""),[campaignId,setCampaignId]=React.useState(""),[selected,setSelected]=React.useState<string[]>([]);
 const candidates=adminBookingCandidates(db),target=candidates.find(c=>c.id===campaignId);
 const creative=target&&db.creatives.find(c=>c.id===target.creativeId);
 const eligible=target&&creative?availableScreens(db,target.startDate,target.endDate).filter(s=>s.placement===creative.placement):[];
 const bookings=db.bookings.filter(b=>!date||(b.startDate<=date&&b.endDate>=date)).sort((a,b)=>a.startDate.localeCompare(b.startDate));
 function schedule(){
  if(!target||!selected.length)return;
  if(!window.confirm("Create confirmed fictional bookings for "+target.title+" on "+selected.length+" screens? This will not contact any vehicle."))return;
  act(()=>useDemoStore.getState().adminScheduleCampaign(demoAdmin,target.id,selected),"Sample campaign "+target.id+" booking");
  setCampaignId("");setSelected([]);
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Bookings & Schedule" eyebrow="Admin · Sample Inventory Scheduling" description="Inspect confirmed demo reservations and create guarded assignments for paid, approved fictional campaigns."/>
  <AdminWarning>The scheduler requires pre-existing demo payment status paid, Admin approval, matching creative placement and eligible screens. It cannot charge an advertiser, sell physical inventory or confirm playback.</AdminWarning><AdminNotice error={error} message={message}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Booking records" value={db.bookings.length}/><MiniStat label="Confirmed" value={db.bookings.filter(b=>b.status==="confirmed").length}/><MiniStat label="Eligible demo campaigns" value={candidates.length}/></div>
  <Card><CardHeader><CardTitle>Schedule Eligible Campaign</CardTitle></CardHeader><CardContent className="space-y-4">
   <label className="block text-xs font-semibold text-[#567292]">Approved and demo-paid campaign<select className={control+" mt-1"} value={campaignId} onChange={e=>{setCampaignId(e.target.value);setSelected([]);}}><option value="">Select eligible campaign</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.title} · {c.startDate} to {c.endDate}</option>)}</select></label>
   {target&&<><p className="text-xs leading-6 text-muted-foreground">{eligible.length} screen(s) match the approved creative and available period. Only demo driver-verified, online, non-conflicting inventory is listed.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{eligible.map(s=><label key={s.id} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-[#d9e6f5] p-3"><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,s.id]:prev.filter(x=>x!==s.id))} className="size-5 accent-[#0866ff]"/><span className="text-sm"><strong className="text-brand-navy">{s.id}</strong><span className="block text-xs text-muted-foreground">{db.locations.find(l=>l.id===s.locationId)?.name??"Unknown"} · {s.placement}</span></span></label>)}</div>
    <Button disabled={!selected.length} onClick={schedule}><CalendarDays className="size-4"/>Create confirmed demo bookings</Button></>}
   {!target&&<p className="rounded-xl bg-[#f7faff] p-4 text-xs leading-6 text-muted-foreground">There may be no eligible seed campaigns. No payment or booking status is fabricated just to populate this form. An approved and paid demo record is required.</p>}
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Bookings Ledger</CardTitle></CardHeader><CardContent><label className="block text-xs font-semibold text-[#59708f]">Show bookings overlapping date<input value={date} onChange={e=>setDate(e.target.value)} type="date" className={control+" mt-1 max-w-xs"}/></label>
   <p className="my-3 text-xs text-muted-foreground">{bookings.length} of {db.bookings.length} booking(s)</p><div className="space-y-2">{bookings.map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0e9f8] p-4"><div><p className="font-bold text-brand-navy">{db.campaigns.find(c=>c.id===b.campaignId)?.title??b.campaignId}</p><p className="mt-1 text-xs text-muted-foreground">{b.id} · Screen {b.screenId} · {b.startDate} to {b.endDate}</p></div><StatusPill value={b.status}/></div>)}{!bookings.length&&<p className="p-5 text-sm text-muted-foreground">No bookings overlap this date.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminPayments(){
 const {db,ready,admin}=useAdminData();
 const [status,setStatus]=React.useState("all"),[query,setQuery]=React.useState("");
 const filtered=db.payments.filter(p=>(status==="all"||p.status===status)&&(!query||[p.id,p.campaignId,p.providerReference??"",db.campaigns.find(c=>c.id===p.campaignId)?.title??""].some(x=>x.toLowerCase().includes(query.toLowerCase()))));
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <AdminHeading eyebrow="Admin · Sample Revenue Ledger" title="Payments & Refunds" description="View fictional advertiser payment rows and status metadata without inventing transaction confirmations."/>
  <AdminWarning>Cashfree order creation, webhook verification and refunds are not configured. A sample paid or refunded flag must not be treated as a real bank/card transaction or tax invoice.</AdminWarning>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Stored demo payments" value={db.payments.length}/><MiniStat label="Fictional paid total" value={money(db.payments.filter(p=>p.status==="paid").reduce((sum,p)=>sum+p.amountPaise,0))}/><MiniStat label="Failed/pending records" value={db.payments.filter(p=>["failed","pending"].includes(p.status)).length}/></div>
  <Card><CardHeader><CardTitle>Payment Records</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#597594]">Search<input type="search" className={control+" mt-1"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Campaign or reference"/></label><label className="text-xs font-semibold text-[#597594]">Status<select className={control+" mt-1"} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{["unpaid","pending","paid","failed","refunded"].map(s=><option key={s}>{s}</option>)}</select></label></div>
   <div className="mt-4 space-y-3">{filtered.map(p=><article key={p.id} className="rounded-xl border border-[#dfebf8] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-bold text-brand-navy">{db.campaigns.find(c=>c.id===p.campaignId)?.title??p.campaignId}</h2><StatusPill value={p.status}/></div><p className="mt-2 text-xl font-extrabold text-brand-navy">{money(p.amountPaise)}</p><p className="mt-1 text-xs text-muted-foreground">Record {p.id} · Provider field {p.provider} · Ref {p.providerReference??"None"}</p><p className="mt-2 text-xs text-[#7d633e]">Refunds and invoice generation are disabled until an authoritative backend and gateway reconciliation exist.</p></article>)}{!filtered.length&&<p className="p-5 text-sm text-muted-foreground">No matching fictional payments.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminSettlements(){
 const {db,ready,admin}=useAdminData(),{message,error,act}=useAction();
 const [q,setQ]=React.useState(""),[status,setStatus]=React.useState("all");
 const rows=db.settlements.filter(s=>(status==="all"||s.status===status)&&(!q||[s.id,s.driverId,db.accounts.find(a=>a.id===s.driverId)?.name??""].some(x=>x.toLowerCase().includes(q.toLowerCase())))).sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd));
 function decision(row:Settlement,next:"processed"|"failed"){
  if(!window.confirm("Change fictional settlement "+row.id+" to "+next+"? No money is sent and no bank state is verified."))return;
  act(()=>useDemoStore.getState().adminMarkSettlement(demoAdmin,row.id,next),"Settlement "+row.id);
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <AdminHeading title="Driver Settlements" eyebrow="Admin · Driver Finance" description="Review fictional gross, deduction and net records, and update example workflow statuses without sending payouts."/>
  <AdminWarning>A processed status in this demo is not proof of a transfer. No bank account, UPI, payment rail, provider receipt or payroll operation is connected.</AdminWarning><AdminNotice error={error} message={message}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Settlement rows" value={db.settlements.length}/><MiniStat label="Pending net" value={money(db.settlements.filter(s=>s.status==="pending").reduce((sum,s)=>sum+s.grossPaise-s.deductionsPaise,0))}/><MiniStat label="Processed demo rows" value={db.settlements.filter(s=>s.status==="processed").length}/></div>
  <Card><CardHeader><CardTitle>Settlement Workbench</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#587292]">Search driver or reference<input value={q} onChange={e=>setQ(e.target.value)} type="search" className={control+" mt-1"}/></label><label className="text-xs font-semibold text-[#587292]">Status<select className={control+" mt-1"} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All</option>{["pending","processed","failed"].map(s=><option key={s}>{s}</option>)}</select></label></div>
   <div className="mt-4 space-y-3">{rows.map(s=><article key={s.id} className="rounded-xl border border-[#dde9f9] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-brand-navy">{db.accounts.find(a=>a.id===s.driverId)?.name??s.driverId}</h2><p className="mt-1 text-xs text-muted-foreground">{s.id} · Campaign {s.campaignId} · {s.periodStart} to {s.periodEnd}</p></div><StatusPill value={s.status}/></div>
    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Gross</dt><dd className="mt-1 font-bold text-brand-navy">{money(s.grossPaise)}</dd></div><div><dt className="text-muted-foreground">Deductions</dt><dd className="mt-1 font-bold text-brand-navy">{money(s.deductionsPaise)}</dd></div><div><dt className="text-muted-foreground">Net</dt><dd className="mt-1 font-bold text-brand-navy">{money(s.grossPaise-s.deductionsPaise)}</dd></div></dl>
    {s.status==="pending"&&<div className="mt-4 flex flex-wrap gap-2"><AdminAction onClick={()=>decision(s,"processed")}>Mark processed (demo)</AdminAction><AdminAction onClick={()=>decision(s,"failed")}>Mark failed (demo)</AdminAction></div>}
   </article>)}{!rows.length&&<p className="p-5 text-sm text-muted-foreground">No matching sample settlements.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
