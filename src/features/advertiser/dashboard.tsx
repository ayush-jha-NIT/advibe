"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,Bell,CheckCircle2,Clock3,Eye,IndianRupee,Layers3,Megaphone,MonitorPlay,TrendingUp} from "lucide-react";
import {Bar,BarChart,CartesianGrid,Cell,Legend,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {moneyINR} from "@/lib/demo-rules";
import {useAdvertiserPrefs} from "@/services/advertiser-preferences";
import {campaignSummary,filterCampaigns,impressionsChart,selectAdvertiserCampaigns,statusChart} from "./analytics";
import {CampaignStatusBadge,DemoDataNotice,EmptyAdvertiser,PartSevenHeader,useAdvertiserData} from "./shared";
const COLORS=["#0eaa7b","#7955ea","#ef9314","#1276e8","#a9b4c7"];
function CompactStat({title,value,foot,icon:Icon}:{title:string;value:string;foot:string;icon:typeof Megaphone}){
 return <Card className="min-w-0"><CardContent className="p-4 sm:p-5">
  <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-[#5e759a] sm:text-sm">{title}</p><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-brand-blue"><Icon className="size-5" aria-hidden/></span></div>
  <p className="mt-3 break-words text-2xl font-black tracking-tight text-brand-navy sm:text-[28px]">{value}</p>
  <p className="mt-1 text-xs leading-5 text-muted-foreground">{foot}</p>
 </CardContent></Card>;
}
export function AdvertiserDashboard(){
 const {db,accountId,hydrated,displayName}=useAdvertiserData();
 const prefs=useAdvertiserPrefs(accountId);
 const campaigns=React.useMemo(()=>selectAdvertiserCampaigns(db,accountId),[db,accountId]);
 const summary=React.useMemo(()=>campaignSummary(campaigns,db,accountId),[campaigns,db,accountId]);
 const latest=React.useMemo(()=>filterCampaigns(campaigns,{sort:"newest"}).slice(0,4),[campaigns]);
 const status=React.useMemo(()=>statusChart(campaigns),[campaigns]);
 const impressions=React.useMemo(()=>impressionsChart(campaigns),[campaigns]);
 const alerts=React.useMemo(()=>db.notices.filter(n=>n.recipientId===accountId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4),[db,accountId]);
 if(!hydrated)return <div role="status" className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">Loading advertiser data…</div>;
 return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
  <PartSevenHeader title={"Welcome back, "+displayName.split(" ")[0]} description="Track campaigns, review progress and navigate your advertising workspace." eyebrow="Dashboard"/>
  <DemoDataNotice/>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <CompactStat title="Total Campaigns" value={summary.total.toLocaleString("en-IN")} foot="All statuses" icon={Megaphone}/>
   <CompactStat title="Live Campaigns" value={String(summary.live)} foot="Currently marked live" icon={MonitorPlay}/>
   <CompactStat title="Sample Impressions" value={summary.impressions.toLocaleString("en-IN")} foot="Recorded in fictional campaign rows" icon={Eye}/>
   <CompactStat title="Demo Amount Paid" value={moneyINR(summary.paidPaise)} foot="Paid demo transaction totals" icon={IndianRupee}/>
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
   <Card className="min-w-0"><CardHeader><CardTitle>Campaign impressions</CardTitle><p className="text-xs text-muted-foreground">Per-campaign demonstration totals, not a time-series or verified reach</p></CardHeader>
    <CardContent>{impressions.length?<div className="h-60 w-full sm:h-72" role="img" aria-label={"Sample impressions by campaign: "+impressions.map(x=>x.fullTitle+" "+x.impressions).join("; ")}>
     <ResponsiveContainer width="100%" height="100%">
      <BarChart data={impressions} margin={{top:4,right:8,bottom:6,left:-18}} accessibilityLayer>
       <CartesianGrid vertical={false} stroke="#e3ecf8" strokeDasharray="4 4"/>
       <XAxis dataKey="title" tick={{fontSize:11,fill:"#526789"}} interval={0} tickLine={false} axisLine={false}/>
       <YAxis tick={{fontSize:11,fill:"#526789"}} tickFormatter={n=>Number(n).toLocaleString("en-IN",{notation:"compact"})} tickLine={false} axisLine={false}/>
       <Tooltip formatter={n=>[Number(n).toLocaleString("en-IN"),"Demo impressions"]} cursor={{fill:"#edf5ff"}}/>
       <Bar dataKey="impressions" name="Impressions" fill="#0875f9" radius={[7,7,0,0]} maxBarSize={55}/>
      </BarChart>
     </ResponsiveContainer>
    </div>:<EmptyAdvertiser/>}</CardContent>
   </Card>
   <Card className="min-w-0"><CardHeader><CardTitle>Campaign status</CardTitle><p className="text-xs text-muted-foreground">Distribution across all of your sample campaigns</p></CardHeader><CardContent>
    {status.length?<><div className="h-52 w-full" role="img" aria-label={"Campaign statuses: "+status.map(x=>x.name+" "+x.count).join("; ")}>
     <ResponsiveContainer width="100%" height="100%"><PieChart>
      <Pie data={status} dataKey="count" nameKey="name" innerRadius={57} outerRadius={84} paddingAngle={2} strokeWidth={0}>
       {status.map((v,i)=><Cell key={v.bucket} fill={COLORS[["live","in_review","draft","completed","other"].indexOf(v.bucket)]??COLORS[i]}/>)}
      </Pie><Tooltip formatter={n=>[String(n),"Campaigns"]}/>
     </PieChart></ResponsiveContainer></div>
     <div className="grid grid-cols-2 gap-2 text-xs">{status.map(v=><span className="flex items-center justify-between gap-2 rounded-lg bg-[#f4f7fc] px-3 py-2" key={v.bucket}><span>{v.name}</span><strong className="text-brand-navy">{v.count}</strong></span>)}</div>
    </>:<EmptyAdvertiser/>}
   </CardContent></Card>
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)]">
   <Card className="min-w-0"><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div><CardTitle>Recent Campaigns</CardTitle><p className="mt-1 text-xs text-muted-foreground">Your latest draft, submitted and running campaigns</p></div><Link href="/advertiser/campaigns" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue hover:underline">View all <ArrowRight className="size-4"/></Link></CardHeader><CardContent className="space-y-2">
    {latest.length?latest.map(c=><Link href={"/advertiser/campaigns/"+encodeURIComponent(c.id)} key={c.id} className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e1eafb] p-3 transition hover:bg-[#f7faff]">
     <span className="min-w-0"><span className="block max-w-[220px] truncate text-sm font-bold text-brand-navy">{c.title}</span><span className="mt-1 block text-xs text-muted-foreground">{c.id} · {c.startDate} to {c.endDate}</span></span><CampaignStatusBadge status={c.status}/>
    </Link>):<EmptyAdvertiser/>}
   </CardContent></Card>
   <Card className="min-w-0"><CardHeader><CardTitle>Needs Attention</CardTitle><p className="text-xs text-muted-foreground">Demo notifications and campaign review queue</p></CardHeader><CardContent className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
     <Link href="/advertiser/campaigns?status=in_review" className="rounded-xl bg-[#fff6e7] p-3 text-sm hover:bg-[#fff0d9]"><Clock3 className="size-5 text-[#cf7a05]"/><p className="mt-2 text-xl font-bold text-brand-navy">{summary.review}</p><p className="text-xs text-[#7a5e3d]">In review</p></Link>
     <Link href="/advertiser/campaigns?status=draft" className="rounded-xl bg-[#edf4ff] p-3 text-sm hover:bg-[#e3efff]"><Layers3 className="size-5 text-brand-blue"/><p className="mt-2 text-xl font-bold text-brand-navy">{summary.drafts}</p><p className="text-xs text-[#42658d]">Drafts</p></Link>
    </div>
    <div className="space-y-2">{!prefs.showDashboardNotices?<p className="rounded-lg bg-[#f4f7fc] px-3 py-4 text-sm text-muted-foreground">Dashboard notice previews are hidden in Profile & Settings.</p>:alerts.length?alerts.map(n=><div key={n.id} className="flex gap-2 rounded-lg border border-[#e1eafb] p-3 text-sm"><Bell className={"mt-0.5 size-4 shrink-0 "+(n.read?"text-[#a5afbc]":"text-brand-blue")}/><div><p className="font-semibold text-brand-navy">{n.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{n.message}</p></div></div>):<p className="rounded-lg bg-[#f4f7fc] px-3 py-4 text-sm text-muted-foreground">No notifications for this account.</p>}</div>
    <Link href="/advertiser/notifications" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-blue">Notification center <ArrowRight className="size-4"/></Link>
   </CardContent></Card>
  </div>
  <div className="grid gap-4 sm:grid-cols-3">
   {[{href:"/advertiser/create-campaign",icon:Megaphone,title:"Start Campaign",subtitle:"Create and submit a six-step demo campaign"},{href:"/advertiser/locations",icon:TrendingUp,title:"Explore Locations",subtitle:"Select target city and screen placement"},{href:"/advertiser/campaigns",icon:CheckCircle2,title:"Manage Campaigns",subtitle:"View all campaigns and submit eligible drafts"}].map(({href,icon:Icon,title,subtitle})=><Link key={href} href={href} className="flex min-h-28 items-center gap-3 rounded-2xl border border-[#dfeafb] bg-white p-5 shadow-sm hover:border-brand-blue hover:bg-[#f8fbff]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e9f3ff] text-brand-blue"><Icon className="size-5"/></span><span className="min-w-0"><strong className="block text-sm text-brand-navy">{title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{subtitle}</span></span><ArrowRight className="ml-auto size-4 shrink-0 text-brand-blue"/></Link>)}
  </div>
 </div>;
}
