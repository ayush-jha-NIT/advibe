"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowDownToLine,ArrowRight,BarChart3,Eye,FileBarChart2,MonitorPlay,ShieldAlert} from "lucide-react";
import {Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {campaignsCSV,impressionsChart,selectAdvertiserCampaigns,statusChart,campaignSummary} from "./analytics";
import {useAdvertiserData} from "./shared";

export function AdvertiserReports(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const campaigns=React.useMemo(()=>selectAdvertiserCampaigns(db,accountId),[db,accountId]);
 const summary=React.useMemo(()=>campaignSummary(campaigns,db,accountId),[campaigns,db,accountId]);
 const impressions=React.useMemo(()=>impressionsChart(campaigns,8),[campaigns]);
 const statuses=React.useMemo(()=>statusChart(campaigns),[campaigns]);
 function download(){
  const csv=campaignsCSV(campaigns);
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="advibe-demo-campaign-report.csv";document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 if(!hydrated)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading advertiser reports…</p>;
 return <main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Analytics · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Reports & Analytics</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Inspect your campaign-level fictional summary and export the records shown in the demo database.</p></div>
   <Button variant="outline" disabled={!campaigns.length} onClick={download}><ArrowDownToLine className="size-4"/>Export demo CSV</Button></div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d3e5fa] bg-[#eff7ff] p-4 text-xs leading-6 text-[#47688d]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/>No verified impressions, audience reach, daily telemetry, GPS, conversion attribution, revenue analytics or return on ad spend are available. These are stored totals from fictional campaign rows, not a live performance report.</p>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
   ["Campaign records",String(summary.total),FileBarChart2],
   ["Marked live",String(summary.live),MonitorPlay],
   ["Sample impressions",summary.impressions.toLocaleString("en-IN"),Eye],
   ["Stored demo paid",moneyINR(summary.paidPaise),BarChart3]
  ].map(([label,value,Icon])=><div key={label as string} className="rounded-xl border border-[#dce8f7] bg-white p-4">
   <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label as string}</span><Icon className="size-5 text-brand-blue"/></div><p className="mt-2 break-words text-xl font-extrabold text-brand-navy sm:text-2xl">{value as string}</p>
  </div>)}</div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)]">
   <Card><CardHeader><CardTitle>Sample Impressions by Campaign</CardTitle><p className="text-xs text-muted-foreground">Totals per demo campaign. Not a daily trend or delivery guarantee.</p></CardHeader><CardContent>
    {impressions.length?<div className="h-72 w-full" role="img" aria-label={impressions.map(x=>x.fullTitle+": "+x.impressions).join("; ")}>
     <ResponsiveContainer width="100%" height="100%"><BarChart data={impressions} margin={{top:10,right:5,bottom:6,left:-16}} accessibilityLayer>
      <CartesianGrid stroke="#e2ebf8" strokeDasharray="4 4" vertical={false}/>
      <XAxis dataKey="title" tick={{fontSize:11,fill:"#617b9b"}} tickLine={false} axisLine={false} interval={0}/>
      <YAxis tickFormatter={v=>Number(v).toLocaleString("en-IN",{notation:"compact"})} tick={{fontSize:11,fill:"#617b9b"}} tickLine={false} axisLine={false}/>
      <Tooltip formatter={v=>[Number(v).toLocaleString("en-IN"),"Sample impressions"]}/>
      <Bar dataKey="impressions" radius={[6,6,0,0]} maxBarSize={56} fill="#0c6af9"/>
     </BarChart></ResponsiveContainer></div>:<p className="rounded-lg bg-[#f7faff] p-6 text-sm text-muted-foreground">No campaigns for this demo identity.</p>}
   </CardContent></Card>
   <Card><CardHeader><CardTitle>Campaign Status Mix</CardTitle></CardHeader><CardContent>
    {statuses.length?<div className="space-y-3">{statuses.map(s=><div key={s.bucket} className="rounded-xl bg-[#f6f9fe] p-3">
     <div className="flex items-center justify-between text-sm"><span className="font-semibold text-brand-navy">{s.name}</span><Badge tone="info">{s.count}</Badge></div>
     <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce8f7]"><div className="h-full rounded-full bg-brand-blue" style={{width:summary.total?100*s.count/summary.total+"%":"0%"}}/></div>
    </div>)}</div>:<p className="text-sm text-muted-foreground">No campaign statuses to display.</p>}
   </CardContent></Card>
  </div>
  <Card><CardHeader><CardTitle>Campaign-level Records</CardTitle></CardHeader><CardContent>
   {campaigns.length?<div className="space-y-3">{campaigns.map(c=><Link key={c.id} href={"/advertiser/campaigns/"+encodeURIComponent(c.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0e9f6] p-4 hover:border-brand-blue hover:bg-[#f8fbff]">
    <div className="min-w-0"><p className="break-words text-sm font-bold text-brand-navy">{c.title}</p><p className="mt-1 text-xs text-muted-foreground">{c.id} · {c.startDate} to {c.endDate} · {c.status.replaceAll("_"," ")}</p></div>
    <div className="flex items-center gap-3"><span className="text-sm font-extrabold text-brand-navy">{c.impressions.toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">demo impressions</span></span><ArrowRight className="size-4 text-brand-blue"/></div>
   </Link>)}</div>:<p className="rounded-lg bg-[#f7faff] p-6 text-sm text-muted-foreground">No matching campaigns. Newly registered demo identities have no seeded campaigns.</p>}
  </CardContent></Card>
 </main>;
}
