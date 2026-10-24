"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,Banknote,CheckCircle2,Download,FileText,Info,LockKeyhole,ReceiptText,Search,ShieldAlert,Wallet} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle,Dialog} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {checkoutReadiness,filterPaymentRows,invoicePreview,ownerPayments,paymentStates,paymentTotals} from "./account-model";
import {useAdvertiserData} from "./shared";
import type {PaymentStatus} from "@/types/domain";

const field="min-h-11 w-full rounded-xl border border-[#cddff5] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d6e9ff]";
const tones:Record<PaymentStatus,"success"|"neutral"|"info"|"danger"|"warning">={paid:"success",pending:"warning",unpaid:"neutral",failed:"danger",refunded:"info"};
function downloadText(name:string,content:string){
 const blob=new Blob([content],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function AdvertiserBilling(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const [search,setSearch]=React.useState(""),[status,setStatus]=React.useState<PaymentStatus|"all">("all");
 const [selected,setSelected]=React.useState<string|null>(null);
 const [campaignSelected,setCampaignSelected]=React.useState("");
 const [checkoutOpen,setCheckoutOpen]=React.useState(false);
 const campaigns=React.useMemo(()=>db.campaigns.filter(c=>c.advertiserId===accountId),[db,accountId]);
 const payments=React.useMemo(()=>ownerPayments(db,accountId),[db,accountId]);
 const filtered=React.useMemo(()=>filterPaymentRows(payments,campaigns,search,status),[payments,campaigns,search,status]);
 const totals=React.useMemo(()=>paymentTotals(payments),[payments]);
 const picked=selected?invoicePreview(db,accountId,selected):null;
 const reviewed=checkoutReadiness(db,accountId,campaignSelected);
 function statement(){
  if(!picked)return;
  const {account,campaign,payment}=picked;
  downloadText("AdVibe-DEMO-STATEMENT-"+payment.id+".txt",[
   "ADVIBE | DEMONSTRATION PAYMENT STATEMENT","NOT A TAX INVOICE | NOT VALID FOR ACCOUNTING OR GST CLAIMS","",
   "Fictional account: "+account.name,
   "Sample business: "+(account.business??"Not specified"),
   "Campaign: "+campaign.title+" ("+campaign.id+")",
   "Payment record: "+payment.id,
   "Provider field: "+payment.provider+" (demo data)",
   "Reference: "+(payment.providerReference??"None"),
   "Stored status: "+payment.status,
   "Stored amount: "+moneyINR(payment.amountPaise),"",
   "No real transaction, signature, invoice serial number, GSTIN, tax allocation or payment date is certified.",
   "The browser-local record is not proof of settlement or a Cashfree payment."
  ].join("\r\n"));
 }
 if(!hydrated)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading demo billing ledger…</p>;
 return <main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Finance · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Billing & Payments</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Review fictional payment records, inspect sample statements and see the future Cashfree checkout boundary.</p></div><Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#aacaf4] px-4 text-sm font-bold text-brand-blue">My Campaigns <ArrowRight className="size-4"/></Link></div>
  <div className="flex items-start gap-2 rounded-xl border border-[#d3e4f8] bg-[#eff6ff] p-4 text-xs leading-6 text-[#47658c]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/><p>All amounts and transactions are seeded or browser-local demonstration data. No Cashfree API call, real charge, refund, wallet balance or legally valid tax invoice can be produced by this frontend.</p></div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[
    ["Recorded demo paid",moneyINR(totals.paidPaise),CheckCircle2],
    ["Recorded pending",moneyINR(totals.pendingPaise),Wallet],
    ["Recorded refunded",moneyINR(totals.refundedPaise),Banknote],
    ["Ledger entries",String(totals.count),ReceiptText]
   ].map(([title,value,Icon])=><div key={title as string} className="rounded-2xl border border-[#dbe7f7] bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#607b9e]">{title as string}</p><Icon className="size-5 text-brand-blue"/></div><p className="mt-3 break-words text-xl font-black text-brand-navy sm:text-2xl">{value as string}</p></div>)}
  </div>
  <Card><CardHeader><CardTitle>Payment History</CardTitle><p className="text-xs leading-5 text-muted-foreground">There is no transaction timestamp in the demo schema. Records are shown without fabricated payment dates.</p></CardHeader><CardContent>
   <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(150px,1fr)]">
    <label><span className="mb-1 block text-xs font-semibold text-[#557091]">Search by campaign or reference</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#86a0c1]"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} className={field+" pl-10"} placeholder="Campaign, payment ID or reference"/></span></label>
    <label><span className="mb-1 block text-xs font-semibold text-[#557091]">Payment status</span><select className={field} value={status} onChange={e=>setStatus(e.target.value as PaymentStatus|"all")}><option value="all">All statuses</option>{paymentStates.map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label>
   </div>
   <p className="mb-3 text-xs text-muted-foreground">Showing {filtered.length} of {payments.length} owned demo ledger entries</p>
   {filtered.length?<div className="space-y-3">{filtered.map(p=>{
    const campaign=campaigns.find(c=>c.id===p.campaignId);
    return <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dae6f6] p-4">
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold text-brand-navy">{campaign?.title??"Unknown owned campaign"}</p><Badge tone={tones[p.status]} className="capitalize">{p.status}</Badge></div>
      <p className="mt-1 break-all text-xs text-muted-foreground">{p.id} · Provider field: {p.provider} · Ref: {p.providerReference??"Not supplied"}</p><p className="mt-2 text-xl font-extrabold text-brand-navy">{moneyINR(p.amountPaise)}</p>
     </div>
     <Button type="button" variant="outline" onClick={()=>setSelected(p.id)}><FileText className="size-4"/>Sample statement</Button>
    </article>;
   })}</div>:<div className="rounded-xl border border-dashed border-[#cadcf2] bg-[#f8fbff] p-6 text-sm text-muted-foreground">No matching demonstration payment entries. A campaign without a recorded transaction is not a completed payment.</div>}
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Cashfree Checkout Preparation</CardTitle><p className="text-xs leading-5 text-muted-foreground">Review readiness only. The production payment button cannot be enabled without a trusted backend.</p></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div className="space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-[#506c90]">Choose your campaign</span><select className={field} value={campaignSelected} onChange={e=>setCampaignSelected(e.target.value)}><option value="">Select campaign</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.title} · {c.status}</option>)}</select></label>
     <Button type="button" variant="outline" disabled={!campaignSelected} onClick={()=>setCheckoutOpen(true)}>Review checkout requirements <ArrowRight className="size-4"/></Button></div>
    <div className="rounded-xl border border-[#dce8f7] bg-[#f7faff] p-4">
     <p className="text-sm font-bold text-brand-navy">Payment readiness</p><p className="mt-2 text-xs leading-6 text-[#597494]">{campaignSelected?reviewed.message:"Choose a campaign to inspect the required state."}</p>
     {campaignSelected&&reviewed.amountPaise!==null&&<p className="mt-2 text-lg font-bold text-brand-navy">Stored estimate: {moneyINR(reviewed.amountPaise)}</p>}
     <button type="button" disabled className="mt-4 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#b4c5dc] px-4 text-sm font-bold text-white"><LockKeyhole className="size-4"/>Real Cashfree checkout unavailable</button>
    </div>
  </CardContent></Card>
  <Dialog open={!!picked} onOpenChange={open=>{if(!open)setSelected(null);}} title="Demonstration Payment Statement" description="Not a tax invoice, legal receipt, or proof of payment."
   footer={<><Button variant="outline" onClick={()=>setSelected(null)}>Close</Button><Button onClick={statement}><Download className="size-4"/>Download sample .txt</Button></>}>
   {picked&&<div className="space-y-4 text-sm"><p className="rounded-lg border border-[#f6d7a2] bg-[#fff7e8] p-3 text-xs font-bold text-[#8b5422]">SAMPLE ONLY. No tax invoice number, valid GSTIN, tax component certification or Cashfree verification.</p>
    <dl className="divide-y divide-[#e6edf8]">{[
     ["Fictional business",picked.account.business??"Not listed"],["Campaign",picked.campaign.title],["Payment entry",picked.payment.id],
     ["Stored amount",moneyINR(picked.payment.amountPaise)],["Stored status",picked.payment.status],["Provider field",picked.payment.provider],
     ["Demo reference",picked.payment.providerReference??"Not supplied"]
    ].map(([k,v])=><div key={k} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="break-words text-right font-semibold text-brand-navy">{v}</dd></div>)}</dl>
   </div>}
  </Dialog>
  <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen} title="Future Cashfree Checkout" description="Integration specification, not a working payment gateway." footer={<Button onClick={()=>setCheckoutOpen(false)}>Close</Button>}>
   <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-[#526b8c]"><li>Admin approves the campaign and verified rate.</li><li>A trusted backend creates and stores a Cashfree order with its own authorization checks.</li><li>The frontend opens only a returned, trusted payment session.</li><li>Backend validates callback/webhook and re-fetches authoritative payment status.</li><li>Only then may the backend record payment and allow inventory reservation.</li></ol>
   <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#fff6e8] p-3 text-xs leading-5 text-[#866033]"><Info className="mt-0.5 size-4 shrink-0"/>This preview never calls the Cashfree SDK, writes a paid record or accepts the client redirect as evidence of a charge.</p>
  </Dialog>
 </main>;
}
