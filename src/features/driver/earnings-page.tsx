"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,BarChart3,Download,ReceiptText,ShieldAlert,Wallet} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {DriverAccess,DriverDemoWarning,useDriverOperationsData} from "./operations-shared";
import {driverSettlements,filteredDriverSettlements,monthlySettlementSeries,settlementCSV,settlementSummary,settlementStatuses,type SettlementStatus} from "./finance-model";

function saveCSV(csv:string){
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="advibe-driver-DEMO-settlements.csv";document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function DriverEarnings(){
 const {db,accountId,hydrated}=useDriverOperationsData();
 const [status,setStatus]=React.useState<SettlementStatus|"all">("all"),[query,setQuery]=React.useState("");
 const [from,setFrom]=React.useState(""),[to,setTo]=React.useState("");
 const settlements=React.useMemo(()=>driverSettlements(db,accountId),[db,accountId]);
 const visible=React.useMemo(()=>filteredDriverSettlements(settlements,db,query,status,from,to),[settlements,db,query,status,from,to]);
 const summary=React.useMemo(()=>settlementSummary(visible),[visible]);
 const months=React.useMemo(()=>monthlySettlementSeries(visible),[visible]);
 const max=Math.max(1,...months.map(m=>m.pending+m.processed+m.failed));
 return <DriverAccess hydrated={hydrated} accountId={accountId}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-brand-blue">Driver Partner · Settlement Analytics · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Earnings Overview</h1><p className="mt-2 text-sm text-muted-foreground">Explore sample settlement totals, deductions and monthly periods. These records are not actual earnings.</p></div>
   <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c3d6f1] bg-white px-4 text-sm font-semibold text-brand-blue" href="/driver/payouts">Payout history <ArrowRight className="size-4"/></Link></div>
  <DriverDemoWarning detail="All amounts originate from fictional settlement ledger rows. Pending is not paid, processed is only a demo status, and no verified bank transfer, payroll or tax reporting exists."/>
  <Card><CardHeader><CardTitle>Filter Settlement Periods</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label className="text-xs font-semibold text-[#58718e]">Search campaign or reference<input className="mt-1 min-h-11 w-full rounded-xl border border-[#c9d9ee] bg-white px-3 text-sm text-brand-navy" value={query} onChange={e=>setQuery(e.target.value)} type="search" placeholder="Campaign, settlement ID"/></label>
    <label className="text-xs font-semibold text-[#58718e]">Status<select className="mt-1 min-h-11 w-full rounded-xl border border-[#c9d9ee] bg-white px-3 text-sm text-brand-navy" value={status} onChange={e=>setStatus(e.target.value as SettlementStatus|"all")}><option value="all">All statuses</option>{settlementStatuses.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#58718e]">Period intersects after<input type="date" className="mt-1 min-h-11 w-full rounded-xl border border-[#c9d9ee] bg-white px-3 text-sm text-brand-navy" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label className="text-xs font-semibold text-[#58718e]">Period intersects before<input type="date" className="mt-1 min-h-11 w-full rounded-xl border border-[#c9d9ee] bg-white px-3 text-sm text-brand-navy" value={to} onChange={e=>setTo(e.target.value)}/></label>
   </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Showing {visible.length} of {settlements.length} owned settlement records</p><Button variant="outline" size="sm" disabled={!visible.length} onClick={()=>saveCSV(settlementCSV(visible,db))}><Download className="size-4"/>Export sample CSV</Button></div>
  </CardContent></Card>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
   {title:"Gross sample amount",value:moneyINR(summary.grossPaise),icon:BarChart3},
   {title:"Demo deductions",value:moneyINR(summary.deductionsPaise),icon:ReceiptText},
   {title:"Pending net",value:moneyINR(summary.pendingPaise),icon:Wallet},
   {title:"Processed net (sample)",value:moneyINR(summary.processedPaise),icon:ShieldAlert},
  ].map(({title,value,icon:Icon})=><div key={title} className="rounded-2xl border border-[#dce8f7] bg-white p-4"><Icon className="size-5 text-brand-blue"/><p className="mt-2 break-words text-xl font-extrabold text-brand-navy">{value}</p><p className="mt-1 text-xs leading-5 text-[#607792]">{title}</p></div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
   <Card><CardHeader><CardTitle>Monthly Sample Settlement Breakdown</CardTitle><p className="text-xs text-muted-foreground">Grouped by recorded period end month, not payment date. All amounts INR.</p></CardHeader><CardContent>
    {months.length?<div className="space-y-5">{months.map(m=><div key={m.month}><div className="mb-2 flex items-center justify-between gap-2 text-sm"><span className="font-bold text-brand-navy">{m.month}</span><span className="text-xs text-muted-foreground">{moneyINR(Math.round((m.pending+m.processed+m.failed)*100))} net</span></div><div className="flex h-6 w-full overflow-hidden rounded-full bg-[#e6edf9]">
      {m.pending>0&&<div title={"Pending "+m.pending} className="h-full bg-[#f2a33a]" style={{width:(m.pending/max*100)+"%"}}/>}
      {m.processed>0&&<div title={"Processed "+m.processed} className="h-full bg-[#20a477]" style={{width:(m.processed/max*100)+"%"}}/>}
      {m.failed>0&&<div title={"Failed "+m.failed} className="h-full bg-[#db5266]" style={{width:(m.failed/max*100)+"%"}}/>}
     </div></div>)}</div>:<p className="rounded-lg bg-[#f7faff] p-6 text-sm text-muted-foreground">No sample settlement periods match your filters.</p>}
    <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>● Pending (orange)</span><span>● Processed (green)</span><span>● Failed (red)</span></div>
   </CardContent></Card>
   <Card><CardHeader><CardTitle>Ledger Totals</CardTitle></CardHeader><CardContent className="space-y-3">{[
    ["Net amount across filtered rows",moneyINR(summary.netPaise)],
    ["Failed net (not paid)",moneyINR(summary.failedPaise)],
    ["Settlement records",String(summary.total)]
   ].map(([name,value])=><div key={name} className="flex flex-wrap justify-between gap-2 border-b border-[#e0eafa] py-2 text-sm"><span className="text-[#58718d]">{name}</span><strong className="text-brand-navy">{value}</strong></div>)}
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Status is a fictional flag. No payout ID, transfer date, IFSC, bank account or provider confirmation is recorded.</p>
    <Link href="/driver/payouts" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue">Inspect settlement rows <ArrowRight className="size-4"/></Link>
   </CardContent></Card>
  </div>
 </main></DriverAccess>;
}
