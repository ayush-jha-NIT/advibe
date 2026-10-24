"use client";
import * as React from "react";
import {Download} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import type {Account} from "@/types/domain";
import {AdminAccess,AdminAction,AdminHeading,AdminNavLink,AdminNotice,AdminWarning,control,demoAdmin,MiniStat,StatusPill,useAdminData,money} from "./admin-shared";
import {adminCampaignCSV,adminKPIs,campaignStatusGroups} from "./admin-governance-rules";
function exportCSV(content:string,name:string){
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export function AdminAnalytics(){
 const {db,ready,admin}=useAdminData();
 const k=adminKPIs(db),groups=campaignStatusGroups(db);
 const statusMax=Math.max(1,...groups.map(x=>x.number));
 const cities=[...new Set(db.locations.map(l=>l.city))].sort();
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3"><AdminHeading title="Reports & Analytics" eyebrow="Admin · Sample Platform Reports" description="Summaries of recorded fictional campaigns, screens, payments, driver settlements and customer support activity."/><Button variant="outline" onClick={()=>exportCSV(adminCampaignCSV(db),"advibe-admin-DEMO-campaigns.csv")}><Download className="size-4"/>Export sample campaigns</Button></div>
  <AdminWarning>All counts and amounts describe browser-local fictional records. There is no verified campaign reach, actual screen impression reporting, net platform revenue, GPS, device telemetry or audited accounting.</AdminWarning>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <MiniStat label="Campaign records" value={k.campaigns}/><MiniStat label="Example recorded impressions" value={k.sampleImpressions.toLocaleString("en-IN")}/>
   <MiniStat label="Fictional paid payment rows" value={money(k.samplePaidPaise)}/><MiniStat label="Driver settlement net" value={money(k.sampleSettlementNetPaise)}/>
   <MiniStat label="Registered sample accounts" value={k.accounts}/><MiniStat label="Screen inventory" value={k.screens} caption={k.activeScreens+" marked online"}/>
   <MiniStat label="Unresolved tickets" value={k.unresolvedTickets}/><MiniStat label="Recorded refund flags" value={money(k.sampleRefundedPaise)}/>
  </div>
  <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Campaign Status Mix</CardTitle></CardHeader><CardContent>
   {groups.length?<div className="space-y-4">{groups.map(g=><div key={g.status}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="font-semibold capitalize text-brand-navy">{g.status.replaceAll("_"," ")}</span><span className="text-muted-foreground">{g.number}</span></div><div className="h-3 overflow-hidden rounded-full bg-[#e8eff9]"><div className="h-full rounded-full bg-brand-blue" style={{width:100*g.number/statusMax+"%"}}/></div></div>)}</div>:<p className="p-5 text-sm text-muted-foreground">No campaign records.</p>}
  </CardContent></Card><Card><CardHeader><CardTitle>Example City Coverage</CardTitle></CardHeader><CardContent className="space-y-3">{cities.map(city=><div key={city} className="rounded-xl border border-[#e0eafa] p-4"><h2 className="font-bold text-brand-navy">{city}</h2><p className="mt-1 text-xs text-muted-foreground">{db.locations.filter(l=>l.city===city).length} sample areas · {db.screens.filter(s=>db.locations.find(l=>l.id===s.locationId)?.city===city).length} sample screens</p></div>)}<p className="mt-2 text-xs leading-6 text-muted-foreground">Location counts are not a coverage or availability guarantee.</p></CardContent></Card></div>
  <Card><CardHeader><CardTitle>Report Boundaries</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">The platform has no playback event stream, customer attribution, verified datewise reach, device GPS, server-processed financial journals or settlement bank reconciliation. Reports export only stored sample rows. Real analytics require signed event ingestion, reliable timestamps, permissions and a production database.</p><AdminNavLink href="/admin/audit">Review demo audit trail</AdminNavLink></CardContent></Card>
 </main></AdminAccess>;
}
export function AdminAdvertisers(){
 const {db,ready,admin}=useAdminData();
 const [search,setSearch]=React.useState("");
 const accounts=db.accounts.filter(a=>a.role==="advertiser"&&(!search.trim()||[a.id,a.name,a.business??"",a.city].some(t=>t.toLowerCase().includes(search.toLowerCase()))));
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-6xl space-y-5 pb-10">
  <AdminHeading title="Advertiser Accounts" eyebrow="Admin · Client Directory" description="Review fictional advertiser identities, linked campaigns and their stored demo performance fields."/>
  <AdminWarning>These are invented profiles, not a production CRM or verified advertisers. Account creation, KYC, contracts, contact details and secure billing records are not connected.</AdminWarning>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Sample advertisers" value={db.accounts.filter(a=>a.role==="advertiser").length}/><MiniStat label="Campaigns" value={db.campaigns.length}/><MiniStat label="Recorded sample payments" value={db.payments.length}/></div>
  <Card><CardHeader><CardTitle>Advertiser Directory</CardTitle></CardHeader><CardContent>
   <label className="block max-w-lg text-xs font-semibold text-[#617793]">Search advertisers<input value={search} onChange={e=>setSearch(e.target.value)} type="search" className={control+" mt-1"} placeholder="Brand, account or city"/></label><div className="mt-4 grid gap-3 lg:grid-cols-2">
    {accounts.map(a=>{const campaigns=db.campaigns.filter(c=>c.advertiserId===a.id),paid=db.payments.filter(p=>p.advertiserId===a.id&&p.status==="paid");
    return <article key={a.id} className="rounded-xl border border-[#e0eafa] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-brand-navy">{a.business??a.name}</h2><p className="mt-1 text-xs text-muted-foreground">{a.name} · {a.city} · {a.id}</p></div><StatusPill value={a.active?"active":"inactive"}/></div>
     <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#f5f9ff] p-3"><p className="text-xs text-muted-foreground">Campaigns</p><p className="mt-1 text-lg font-extrabold text-brand-navy">{campaigns.length}</p></div><div className="rounded-lg bg-[#f5f9ff] p-3"><p className="text-xs text-muted-foreground">Fictional paid ledger</p><p className="mt-1 text-lg font-extrabold text-brand-navy">{money(paid.reduce((sum,p)=>sum+p.amountPaise,0))}</p></div></div>
     <p className="mt-3 text-xs leading-6 text-muted-foreground">{campaigns.map(c=>c.title+" ("+c.status+")").join(" · ")||"No sample campaigns recorded."}</p>
    </article>;})}{!accounts.length&&<p className="p-5 text-sm text-muted-foreground">No matching demo advertiser accounts.</p>}
   </div></CardContent></Card>
 </main></AdminAccess>;
}
export function AdminUsers(){
 const {db,ready,admin}=useAdminData();
 const [search,setSearch]=React.useState(""),[role,setRole]=React.useState("all"),[message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 const rows=db.accounts.filter(a=>(role==="all"||a.role===role)&&(!search.trim()||[a.id,a.name,a.business??"",a.city].some(t=>t.toLowerCase().includes(search.toLowerCase()))));
 function toggle(a:Account){
  if(!window.confirm("Change the fictional "+a.role+" account "+a.id+" to "+(a.active?"inactive":"active")+"? This does NOT revoke any real sessions."))return;
  setMessage("");setError("");
  try{useDemoStore.getState().adminSetAccountActive(demoAdmin,a.id,!a.active);setMessage("Demo account "+a.id+" flag updated. Backend authentication remains unchanged.");}
  catch(e){setError(e instanceof Error?e.message:"Cannot update sample account.");}
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Users & Roles" eyebrow="Admin · Example Accounts" description="Inspect fictional accounts, their fixed role labels and active/inactive demo flags."/>
  <AdminWarning>These role flags are not server RBAC. Toggling a sample account does not revoke real login sessions, grant privileges or change a production user record. Demo Admin role is protected.</AdminWarning><AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Accounts" value={db.accounts.length}/><MiniStat label="Advertisers" value={db.accounts.filter(a=>a.role==="advertiser").length}/><MiniStat label="Driver partners" value={db.accounts.filter(a=>a.role==="driver").length}/></div>
  <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Sample Account Directory</CardTitle><AdminNavLink href="/admin/audit">Audit history</AdminNavLink></div></CardHeader><CardContent>
   <div className="mb-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#607995]">Search<input type="search" className={control+" mt-1"} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, account ID, city"/></label><label className="text-xs font-semibold text-[#607995]">Role<select value={role} onChange={e=>setRole(e.target.value)} className={control+" mt-1"}><option value="all">All roles</option>{["admin","advertiser","driver"].map(r=><option key={r}>{r}</option>)}</select></label></div>
   <div className="space-y-3">{rows.map(a=><article key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e0eafa] p-4"><div className="min-w-0"><p className="font-bold text-brand-navy">{a.name}</p><p className="mt-1 text-xs text-muted-foreground">{a.id} · {a.city}</p><div className="mt-2 flex gap-2"><Badge tone="info">{a.role}</Badge><StatusPill value={a.active?"active":"inactive"}/></div></div>
    <AdminAction disabled={a.role==="admin"} onClick={()=>toggle(a)}>{a.active?"Mark inactive (demo)":"Mark active (demo)"}</AdminAction>
   </article>)}{!rows.length&&<p className="p-5 text-sm text-muted-foreground">No demo accounts match the filters.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
