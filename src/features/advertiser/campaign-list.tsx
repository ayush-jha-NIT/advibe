"use client";
import * as React from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowDownToLine,ArrowLeft,CalendarDays,ChevronLeft,ChevronRight,Eye,Search,Send,SlidersHorizontal,X} from "lucide-react";
import {Button,Card,CardContent,CardHeader,CardTitle,Dialog} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {campaignsCSV,campaignBucket,filterCampaigns,paginateCampaigns,selectAdvertiserCampaigns,type CampaignBucket,type CampaignSort} from "./analytics";
import {CampaignStatusBadge,DemoDataNotice,EmptyAdvertiser,PartSevenHeader,useAdvertiserData} from "./shared";
import type {Campaign} from "@/types/domain";

const statuses:{value:CampaignBucket;label:string}[]=[
 {value:"all",label:"All"},{value:"live",label:"Live"},{value:"in_review",label:"In Review"},
 {value:"draft",label:"Drafts"},{value:"completed",label:"Completed"},{value:"other",label:"Other"}];
const sorts:{value:CampaignSort;label:string}[]=[
 {value:"newest",label:"Newest"},{value:"oldest",label:"Oldest"},{value:"name_asc",label:"Name A–Z"},
 {value:"name_desc",label:"Name Z–A"},{value:"most_impressions",label:"Most impressions"},{value:"fewest_impressions",label:"Fewest impressions"}];
const field="min-h-11 w-full min-w-0 rounded-xl border border-[#cadcf1] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#d8e9ff]";

export function AdvertiserCampaignList(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const params=useSearchParams();
 const initial=params.get("status");
 const [status,setStatus]=React.useState<CampaignBucket>(()=>statuses.some(s=>s.value===initial)?initial as CampaignBucket:"all");
 const [search,setSearch]=React.useState(()=>params.get("search")??"");
 const [sort,setSort]=React.useState<CampaignSort>("newest");
 const [from,setFrom]=React.useState(""),[to,setTo]=React.useState("");
 const [page,setPage]=React.useState(1),[perPage,setPerPage]=React.useState(5);
 const [selected,setSelected]=React.useState<string|null>(null);
 const [feedback,setFeedback]=React.useState("");
 const campaigns=React.useMemo(()=>selectAdvertiserCampaigns(db,accountId),[db,accountId]);
 const filtered=React.useMemo(()=>filterCampaigns(campaigns,{search,bucket:status,sort,from,to}),[campaigns,search,status,sort,from,to]);
 const paging=React.useMemo(()=>paginateCampaigns(filtered,page,perPage),[filtered,page,perPage]);
 const picked=campaigns.find(c=>c.id===selected)??null;
 const counts=React.useMemo(()=>Object.fromEntries(statuses.map(s=>[s.value,s.value==="all"?campaigns.length:campaigns.filter(c=>campaignBucket(c.status)===s.value).length])) as Record<CampaignBucket,number>,[campaigns]);
 function submitDraft(c:Campaign){
  setFeedback("");
  try{
   if(c.advertiserId!==accountId)throw Error("Not your campaign");
   if(c.status!=="draft"&&c.status!=="changes_requested")throw Error("Only drafts or changes-requested campaigns can be submitted");
   useDemoStore.getState().submitCampaign({role:"advertiser",accountId},c.id);
   setFeedback("Demo campaign submitted. The Admin review queue now includes this campaign.");
  }catch(e){setFeedback(e instanceof Error?e.message:"Submission failed");}
 }
 function download(){
  const url=URL.createObjectURL(new Blob([campaignsCSV(filtered)],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");
  link.href=url;link.download="advibe-campaigns-demo.csv";document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function clear(){setSearch("");setStatus("all");setFrom("");setTo("");setSort("newest");setPage(1);}
 if(!hydrated)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading campaign records…</p>;
 return <div className="mx-auto max-w-7xl space-y-5">
  <PartSevenHeader title="My Campaigns" description="Search, filter, review and manage all your advertising campaigns." eyebrow="Campaign management"/>
  <DemoDataNotice/>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Campaign status filters">{statuses.map(s=><button key={s.value} type="button" aria-pressed={status===s.value} onClick={()=>{setStatus(s.value);setPage(1);}}
    className={"inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-bold sm:text-sm "+(status===s.value?"border-brand-blue bg-brand-blue text-white":"border-[#d9e5f6] bg-white text-brand-navy hover:border-brand-blue")}>
    {s.label} <span className={"rounded-full px-2 py-0.5 text-xs "+(status===s.value?"bg-white/20":"bg-[#eaf3ff] text-brand-blue")}>{counts[s.value]}</span>
   </button>)}</div>
  <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Campaign Directory</CardTitle><p className="mt-1 text-xs text-muted-foreground">Only your own fictional campaign records</p></div>
   <Button variant="outline" type="button" disabled={!filtered.length} onClick={download}><ArrowDownToLine className="size-4"/>Export filtered CSV</Button></div></CardHeader>
   <CardContent>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
     <label className="block"><span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#466086]"><Search className="size-4"/>Search</span><input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className={field} placeholder="Name, ID, status, objective"/></label>
     <label className="block"><span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#466086]"><SlidersHorizontal className="size-4"/>Sort</span><select className={field} value={sort} onChange={e=>{setSort(e.target.value as CampaignSort);setPage(1);}}>{sorts.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
     <label className="block"><span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#466086]"><CalendarDays className="size-4"/>Created from</span><input type="date" className={field} value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setPage(1);}}/></label>
     <label className="block"><span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#466086]"><CalendarDays className="size-4"/>Created through</span><input type="date" className={field} value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setPage(1);}}/></label>
    </div>
    <div className="my-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Showing {paging.from}–{paging.to} of {paging.total}</span><button type="button" onClick={clear} className="inline-flex min-h-11 items-center gap-1 font-bold text-brand-blue"><X className="size-4"/>Clear filters</button></div>
    {feedback&&<p className="mb-3 rounded-xl bg-[#edf5ff] p-3 text-sm text-brand-navy" role="status">{feedback}</p>}
    {paging.rows.length?<><div className="grid gap-3 md:hidden">{paging.rows.map(c=><article key={c.id} className="rounded-xl border border-[#dbe7f8] p-4">
     <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold text-brand-navy">{c.title}</h3><p className="mt-1 text-xs text-muted-foreground">{c.id}</p></div><CampaignStatusBadge status={c.status}/></div>
     <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">{[["Schedule",c.startDate+" – "+c.endDate],["Impressions",c.impressions.toLocaleString("en-IN")],["Creative",db.creatives.find(x=>x.id===c.creativeId)?.title??"Unknown"],["Payment",c.paymentStatus]].map(([k,v])=><div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="mt-1 break-words font-semibold text-brand-navy">{v}</dd></div>)}</dl>
     <div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={()=>setSelected(c.id)}><Eye className="size-4"/>Details</Button>{(c.status==="draft"||c.status==="changes_requested")&&<Link href={"/advertiser/create-campaign?campaign="+encodeURIComponent(c.id)} className="inline-flex min-h-9 items-center rounded-lg border border-[#a8c6f1] px-3 text-xs font-bold text-brand-blue">Resume wizard</Link>}{(c.status==="draft"||c.status==="changes_requested")&&<Button size="sm" onClick={()=>submitDraft(c)}><Send className="size-4"/>Submit for review</Button>}</div>
    </article>)}</div>
    <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-[#dce6f4] md:block" role="region" tabIndex={0} aria-label="Campaign results table">
     <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#eff5fd] text-xs font-semibold text-[#4a6486]"><tr><th className="p-3">Campaign</th><th className="p-3">Creative</th><th className="p-3">Schedule</th><th className="p-3">Status</th><th className="p-3 text-right">Impressions</th><th className="p-3">Actions</th></tr></thead>
      <tbody className="divide-y divide-[#e6edf8]">{paging.rows.map(c=><tr key={c.id} className="hover:bg-[#f8fbff]">
       <td className="p-3"><span className="block max-w-52 font-bold text-brand-navy">{c.title}</span><span className="text-xs text-muted-foreground">{c.id}</span></td>
       <td className="p-3 text-xs">{db.creatives.find(x=>x.id===c.creativeId)?.title??"Unknown"}</td>
       <td className="p-3 text-xs">{c.startDate}<span className="block text-muted-foreground">to {c.endDate}</span></td>
       <td className="p-3"><CampaignStatusBadge status={c.status}/></td><td className="p-3 text-right font-semibold tabular-nums">{c.impressions.toLocaleString("en-IN")}</td>
       <td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setSelected(c.id)}><Eye className="size-4"/>Details</Button>{(c.status==="draft"||c.status==="changes_requested")&&<Link href={"/advertiser/create-campaign?campaign="+encodeURIComponent(c.id)} className="inline-flex min-h-9 items-center rounded-lg border border-[#a8c6f1] px-3 text-xs font-bold text-brand-blue">Resume</Link>}{(c.status==="draft"||c.status==="changes_requested")&&<Button size="sm" onClick={()=>submitDraft(c)}><Send className="size-4"/>Submit</Button>}</div></td>
      </tr>)}</tbody></table>
    </div></>:<EmptyAdvertiser filtered={campaigns.length>0}/>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5edf8] pt-4">
     <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-[#466086]">Rows per page <select className="min-h-10 rounded-lg border border-[#cadcf1] bg-white px-2" value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1);}}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
     <nav aria-label="Campaign page navigation" className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={paging.page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft className="size-4"/>Previous</Button><span className="text-xs font-semibold text-[#466086]">{paging.page} / {paging.pages}</span><Button size="sm" variant="outline" disabled={paging.page>=paging.pages} onClick={()=>setPage(p=>Math.min(paging.pages,p+1))}>Next <ChevronRight className="size-4"/></Button></nav>
    </div>
   </CardContent>
  </Card>
  <Link href="/advertiser" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"><ArrowLeft className="size-4"/>Back to dashboard</Link>
  <Dialog open={!!picked} onOpenChange={v=>{if(!v)setSelected(null);}} title={picked?.title??"Campaign details"} description="Fictional campaign. Detailed tracking is scheduled for Part 10.">
   {picked&&<><CampaignStatusBadge status={picked.status}/><dl className="mt-4 divide-y divide-[#e4ecf8]">{[
    ["Campaign ID",picked.id],["Objective",picked.objective],["Creative",db.creatives.find(x=>x.id===picked.creativeId)?.title??"Unknown"],
    ["Start",picked.startDate],["End",picked.endDate],["Screens",picked.screenIds.join(", ")||"Not assigned"],
    ["Demo impressions",picked.impressions.toLocaleString("en-IN")],["Payment flag",picked.paymentStatus]
   ].map(([k,v])=><div key={k} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="max-w-full break-words text-right font-semibold text-brand-navy">{v}</dd></div>)}</dl></>}
  </Dialog>
 </div>;
}
