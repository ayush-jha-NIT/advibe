"use client";

import * as React from "react";
import Link from "next/link";
import {ArrowRight, Database, RotateCcw, ShieldAlert, Monitor, Megaphone, Wallet, ClipboardCheck, CheckCircle2} from "lucide-react";
import {Card,CardContent,CardHeader,CardTitle,Badge,Button} from "@/components/ui";
import {DEMO_ACTORS} from "@/data/demo-seed";
import {adminSummary,advertiserSummary,driverCampaigns,driverSummary,visibleRecords} from "@/services/demo-selectors";
import {useDemoStore} from "@/services/demo-store";
import {availableScreens,moneyINR,quoteCampaign} from "@/lib/demo-rules";
import type {Role} from "@/types/domain";

const start="2026-11-10",end="2026-11-12";
export function DemoDashboard({role}:{role:Role}){
 const actor=DEMO_ACTORS[role];
 const db=useDemoStore(s=>s.db);
 const [feedback,setFeedback]=React.useState("");
 React.useEffect(()=>{
  void useDemoStore.persist.rehydrate();
  const onStorage=(e:StorageEvent)=>{if(e.key==="advibe:demo:v1")void useDemoStore.persist.rehydrate();};
  window.addEventListener("storage",onStorage);
  return ()=>window.removeEventListener("storage",onStorage);
 },[]);
 const campaigns=visibleRecords(db,actor,"campaigns");
 const alerts=visibleRecords(db,actor,"notices");
 const admin=adminSummary(db);
 const advertiser=advertiserSummary(db,actor.accountId);
 const driver=driverSummary(db,actor.accountId);
 const metrics=role==="admin"
  ?[{title:"Campaigns",value:admin.campaigns,icon:Megaphone},{title:"Awaiting review",value:admin.reviewQueue,icon:ClipboardCheck},
    {title:"Online screens",value:admin.online+"/"+admin.screens,icon:Monitor},{title:"Demo collections",value:moneyINR(admin.confirmedPaymentsPaise),icon:Wallet}]
  :role==="advertiser"
  ?[{title:"My campaigns",value:advertiser.campaigns,icon:Megaphone},{title:"Live campaigns",value:advertiser.live,icon:CheckCircle2},
    {title:"Sample impressions",value:advertiser.impressions.toLocaleString("en-IN"),icon:Monitor},{title:"Sample paid",value:moneyINR(advertiser.paymentsPaise),icon:Wallet}]
  :[{title:"My campaigns",value:driver.campaigns,icon:Megaphone},{title:"My screens",value:driver.screens,icon:Monitor},
    {title:"Online screens",value:driver.online,icon:CheckCircle2},{title:"Pending demo payouts",value:moneyINR(driver.pendingPaise),icon:Wallet}];
 const eligible=availableScreens(db,start,end);
 const quote=eligible.filter(s=>s.id==="scr-2");
 const quoted=quote.length?quoteCampaign({screens:quote,locations:db.locations,rules:db.pricingRules,startDate:start,endDate:end}):null;
 const items=role==="driver"?driverCampaigns(db,actor.accountId):campaigns;
 const notice=alerts.find(n=>!n.read);
 function run(fn:()=>void,success:string){
  try{fn();setFeedback(success);}catch(e){setFeedback(e instanceof Error?e.message:"Demo operation failed");}
 }
 function createDraft(){
  run(()=>{
   const id=useDemoStore.getState().createDraft(actor,{title:"Sample Campaign "+new Date().toLocaleDateString("en-IN"),
    creativeId:"crt-1",objective:"awareness",startDate,endDate:end});
   setFeedback("Created draft "+id+". You can submit it using the button below.");
  },"Draft created");
 }
 function submitDraft(){
  const mine=db.campaigns.find(c=>c.advertiserId===actor.accountId&&c.status==="draft"&&c.creativeId==="crt-1");
  run(()=>{if(!mine)throw Error("Create an approved-creative draft first");useDemoStore.getState().submitCampaign(actor,mine.id);},"Submitted for admin review. Switch to Admin to see it.");
 }
 function advanceReview(){
  const target=db.campaigns.find(c=>c.status==="submitted"||c.status==="under_review");
  run(()=>{
   if(!target)throw Error("No pending review campaigns");
   if(target.status==="submitted")useDemoStore.getState().reviewCampaign(actor,target.id,"under_review");
   else if(db.creatives.some(c=>c.id===target.creativeId&&c.approval==="approved"))
    useDemoStore.getState().reviewCampaign(actor,target.id,"approved");
   else useDemoStore.getState().reviewCampaign(actor,target.id,"changes_requested");
  },"Review decision saved; advertiser receives a demo notification.");
 }
 function toggleScreen(){
  const screen=db.screens.find(s=>s.id==="scr-2");
  run(()=>{if(!screen)throw Error("Screen not found");
   useDemoStore.getState().setScreenStatus(actor,screen.id,screen.status==="online"?"maintenance":"online");
  },"Screen status updated. The Driver portal shares the change.");
 }
 return <div className="mx-auto w-full max-w-7xl space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-blue">Part 3 · Shared frontend data</p>
    <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{role==="admin"?"Admin Data Overview":role==="advertiser"?"Advertiser Data Overview":"Driver Data Overview"}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Live React state shared across the three demo portals. These numbers are fictional examples, not real platform metrics.</p></div>
   <Badge tone="purple"><Database className="size-3.5" aria-hidden/> DEMO DATA</Badge>
  </div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {metrics.map(({title,value,icon:Icon})=><Card key={title}><CardContent className="pt-5">
    <Icon className="size-5 text-brand-blue" aria-hidden/><p className="mt-3 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{title}</p>
   </CardContent></Card>)}
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
   <Card><CardHeader><CardTitle>Linked campaign records</CardTitle><p className="text-xs text-muted-foreground">Campaign, advertiser, creative and screen identifiers stay consistent across portals.</p></CardHeader>
    <CardContent>
     <div className="min-w-0 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[510px] text-left text-xs sm:text-sm"><thead className="bg-[#f1f6ff] text-muted-foreground">
       <tr><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Creative</th><th className="px-3 py-3">Screens</th><th className="px-3 py-3">Status</th></tr></thead>
       <tbody>{items.map(c=><tr key={c.id} className="border-t border-line">
        <td className="px-3 py-3"><span className="font-semibold">{c.title}</span><span className="block text-xs text-muted-foreground">{c.id}</span></td>
        <td className="px-3 py-3">{db.creatives.find(x=>x.id===c.creativeId)?.title??"Missing"}</td>
        <td className="px-3 py-3">{c.screenIds.join(", ")||"Not assigned"}</td>
        <td className="px-3 py-3"><Badge tone={c.status==="live"?"success":c.status==="draft"?"neutral":"warning"}>{c.status.replaceAll("_"," ")}</Badge></td>
       </tr>)}</tbody>
      </table>
      {!items.length&&<p className="p-5 text-sm text-muted-foreground">No campaigns for this demo account.</p>}
     </div>
    </CardContent>
   </Card>
   <Card><CardHeader><CardTitle>Cross-portal actions</CardTitle><p className="text-xs text-muted-foreground">Actions update one persistent dataset. Nothing contacts a payment or device provider.</p></CardHeader>
    <CardContent className="space-y-3">
     {role==="advertiser"&&<><Button className="w-full" onClick={createDraft}>Create demo draft</Button><Button className="w-full" variant="outline" onClick={submitDraft}>Submit approved-creative draft</Button></>}
     {role==="admin"&&<><Button className="w-full" onClick={advanceReview}>Advance next campaign review</Button><Button className="w-full" variant="outline" onClick={toggleScreen}>Toggle scr-2 online / maintenance</Button><Button className="w-full" variant="outline" onClick={()=>run(()=>useDemoStore.getState().reset(actor),"Restored original demo records.")}><RotateCcw className="size-4" aria-hidden/> Reset demo data</Button></>}
     {role==="driver"&&<><p className="text-sm">Screen scr-2: <Badge tone={db.screens.find(s=>s.id==="scr-2")?.status==="online"?"success":"warning"}>{db.screens.find(s=>s.id==="scr-2")?.status??"Unavailable"}</Badge></p>
      <Button className="w-full" disabled={!notice} onClick={()=>run(()=>{if(notice)useDemoStore.getState().markNoticeRead(actor,notice.id);},"Notification marked read.")}>Mark next notification read</Button></>}
     <div className="rounded-xl bg-[#f2f7ff] p-4 text-xs leading-6">
      <strong>Availability example, {start} to {end}:</strong><br/>
      {eligible.length} eligible screen(s). Auto-side screen cost: {quoted?moneyINR(quoted.totalPaise):"Not available"} including 18% GST.
     </div>
     {feedback&&<div role="status" aria-live="polite" className="rounded-lg border border-[#bfd7f5] bg-[#edf5ff] px-3 py-2 text-sm text-brand-navy">{feedback}</div>}
    </CardContent>
   </Card>
  </div>
  <div className="grid gap-4 sm:grid-cols-2">
   <Card><CardHeader><CardTitle>Demo notifications</CardTitle></CardHeader><CardContent className="space-y-2">
    {alerts.length?alerts.slice(0,4).map(n=><div key={n.id} className="flex gap-2 border-b border-line pb-2 text-sm last:border-0">
     <span className={"mt-1.5 size-2 shrink-0 rounded-full "+(n.read?"bg-slate-300":"bg-brand-blue")}/>
     <span><span className="block font-semibold">{n.title}</span><span className="text-xs text-muted-foreground">{n.message}</span></span>
    </div>):<p className="text-sm text-muted-foreground">No notifications for this demo role.</p>}
   </CardContent></Card>
   <Card><CardHeader><CardTitle>Boundary checks</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
    <p className="flex gap-2"><CheckCircle2 className="size-5 shrink-0 text-[#0a9a55]"/> Demo UI filters records by role and owner.</p>
    <p className="flex gap-2"><CheckCircle2 className="size-5 shrink-0 text-[#0a9a55]"/> No overlapping screen bookings.</p>
    <p className="flex gap-2"><ShieldAlert className="size-5 shrink-0 text-[#ef8713]"/> Client roles are not security. Backend authorization and verified Cashfree payments come later.</p>
    <Link href="/design-system" className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-blue hover:underline">View design primitives <ArrowRight className="size-4" aria-hidden/></Link>
   </CardContent></Card>
  </div>
 </div>;
}
