"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowLeft,Download,FileText,ShieldAlert} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle,Dialog} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverSettlements,settlementCSV,settlementNet,settlementStatuses,type SettlementStatus} from "./finance-model";
function download(csv:string){const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="advibe-DEMO-payout-history.csv";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function DriverPayouts(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [status,setStatus]=React.useState<SettlementStatus|"all">("all"),[selected,setSelected]=React.useState<string|null>(null);
 const rows=React.useMemo(()=>driverSettlements(db,accountId),[db,accountId]);
 const filtered=rows.filter(s=>status==="all"||s.status===status);
 const chosen=rows.find(s=>s.id===selected);
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Demo Settlements</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Payout History</h1><p className="mt-2 text-sm text-muted-foreground">Detailed settlement periods and accounting fields as recorded in the sample ledger.</p></div><Link href="/driver/earnings" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue"><ArrowLeft className="size-4"/>Earnings overview</Link></div>
  <DriverDemoWarning detail="No bank destination, Cashfree payout, transfer reference, transfer timestamp, real invoice, TDS certificate or verified earnings exists. Processed is a seeded demo status, never bank proof."/>
  <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Settlement Records</CardTitle><Badge tone="info">{filtered.length} records</Badge></div></CardHeader><CardContent>
   <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-semibold text-[#597391]">Status<select className="mt-1 min-h-11 rounded-xl border border-[#cbdcf1] bg-white px-3 text-sm text-brand-navy" value={status} onChange={e=>setStatus(e.target.value as SettlementStatus|"all")}><option value="all">All statuses</option>{settlementStatuses.map(s=><option value={s} key={s}>{s}</option>)}</select></label><Button variant="outline" size="sm" disabled={!filtered.length} onClick={()=>download(settlementCSV(filtered,db))}><Download className="size-4"/>Download demo CSV</Button></div>
   {filtered.length?<div className="space-y-3">{filtered.map(s=><article key={s.id} className="rounded-xl border border-[#dce8f7] bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-brand-navy">{db.campaigns.find(c=>c.id===s.campaignId)?.title??s.campaignId}</h2><p className="mt-1 text-xs text-muted-foreground">{s.id} · Period {s.periodStart} to {s.periodEnd}</p></div><Badge tone={s.status==="processed"?"success":s.status==="pending"?"warning":"danger"} className="capitalize">{s.status} · demo</Badge></div>
    <dl className="mt-4 grid grid-cols-3 gap-2"><div><dt className="text-xs text-muted-foreground">Gross</dt><dd className="mt-1 break-words text-sm font-bold text-brand-navy">{moneyINR(s.grossPaise)}</dd></div><div><dt className="text-xs text-muted-foreground">Deductions</dt><dd className="mt-1 break-words text-sm font-bold text-brand-navy">{moneyINR(s.deductionsPaise)}</dd></div><div><dt className="text-xs text-muted-foreground">Net</dt><dd className="mt-1 break-words text-sm font-extrabold text-brand-navy">{moneyINR(settlementNet(s))}</dd></div></dl>
    <Button variant="outline" size="sm" className="mt-4" onClick={()=>setSelected(s.id)}><FileText className="size-4"/>View demo statement</Button>
   </article>)}</div>:<p className="rounded-xl bg-[#f6f9ff] p-5 text-sm text-muted-foreground">No settlement records for this filter.</p>}
  </CardContent></Card>
  <Dialog open={!!chosen} onOpenChange={open=>{if(!open)setSelected(null);}} title="Illustrative Settlement Statement" description="A browser-local record. Not bank confirmation, a payslip or a tax document." footer={<Button variant="outline" onClick={()=>setSelected(null)}>Close</Button>}>
   {chosen&&<div className="space-y-3"><div className="flex items-start gap-2 rounded-lg border border-[#f5d49d] bg-[#fff7e8] p-3 text-xs leading-6 text-[#825e31]"><ShieldAlert className="mt-0.5 size-4 shrink-0"/>Demo only. No payout was initiated by viewing this statement.</div>
    {([["Reference",chosen.id],["Campaign",db.campaigns.find(c=>c.id===chosen.campaignId)?.title??chosen.campaignId],["Period",chosen.periodStart+" – "+chosen.periodEnd],["Gross",moneyINR(chosen.grossPaise)],["Deductions",moneyINR(chosen.deductionsPaise)],["Net",moneyINR(settlementNet(chosen))],["Recorded status",chosen.status]] as const).map(([title,val])=><div key={title} className="flex flex-wrap justify-between gap-2 border-b border-[#e4edfa] pb-2 text-sm"><span className="text-muted-foreground">{title}</span><strong className="break-words text-brand-navy">{val}</strong></div>)}
   </div>}
  </Dialog>
 </main></DriverAccess>;
}
