"use client";
import * as React from "react";
import {MapPin,Monitor} from "lucide-react";
import {Badge,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import type {ReviewStatus,Screen} from "@/types/domain";
import {AdminAccess,AdminAction,AdminHeading,AdminNotice,AdminWarning,control,demoAdmin,MiniStat,StatusPill,useAdminData} from "./admin-shared";
function useAdminAction(){
 const [message,setMessage]=React.useState(""),[error,setError]=React.useState("");
 function run(fn:()=>void,description:string){setError("");setMessage("");try{fn();setMessage(description+" changed in the demo database.");}catch(e){setError(e instanceof Error?e.message:"Action blocked.");}}
 return {message,error,run};
}
export function AdminDrivers(){
 const {db,ready,admin}=useAdminData(),{message,error,run}=useAdminAction();
 const [query,setQuery]=React.useState(""),[status,setStatus]=React.useState("all");
 const apps=db.driverApplications.filter(a=>(status==="all"||a.status===status)&&(!query.trim()||[a.id,a.driverId,db.accounts.find(x=>x.id===a.driverId)?.name??""].some(x=>x.toLowerCase().includes(query.toLowerCase()))));
 const previews=db.driverPreviewApplications??[];
 function update(id:string,field:"completedSteps"|"documentsStatus"|"screenSetupStatus",value:number|ReviewStatus){
  if(!window.confirm("Set this fictional driver checklist field? No real identity or vehicle verification will occur."))return;
  run(()=>useDemoStore.getState().updateDriverReview(demoAdmin,id,{[field]:value}),"Driver "+id+" checklist");
 }
 function approve(id:string){
  if(!window.confirm("Approve this fictional driver and corresponding sample vehicle? This is not legal KYC or installation verification."))return;
  run(()=>useDemoStore.getState().reviewDriver(demoAdmin,id),"Driver "+id+" sample approval");
 }
 return <AdminAccess admin={admin} ready={ready}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading title="Driver Partner Verification" eyebrow="Admin · Driver Network" description="Review fictional driver applications, their checklists and independent Part 14 preview submissions."/>
  <AdminWarning>Marking documents or screen setup as approved here is only a sample database flag. Real KYC scans, licence checks, installer evidence and consent records are not present. A finalized application cannot be edited.</AdminWarning>
  <AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MiniStat label="Driver accounts" value={db.accounts.filter(a=>a.role==="driver").length}/><MiniStat label="Open seeded applications" value={db.driverApplications.filter(a=>a.status!=="approved").length}/><MiniStat label="Preview requests" value={previews.length}/><MiniStat label="Seeded approved applications" value={db.driverApplications.filter(a=>a.status==="approved").length}/></div>
  <Card><CardHeader><CardTitle>Driver Applications</CardTitle></CardHeader><CardContent>
   <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#567394]">Search driver or application<input type="search" className={control+" mt-1"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Driver, reference"/></label><label className="text-xs font-semibold text-[#567394]">Sample application status<select className={control+" mt-1"} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{(["pending","under_review","approved","rejected"] as const).map(x=><option value={x} key={x}>{x.replaceAll("_"," ")}</option>)}</select></label></div>
   <div className="space-y-3">{apps.length?apps.map(a=>{
    const vehicle=db.vehicles.find(v=>v.id===a.vehicleId&&v.driverId===a.driverId);
    const complete=a.completedSteps===5&&a.documentsStatus==="approved"&&a.screenSetupStatus==="approved";
    return <article key={a.id} className="rounded-xl border border-[#dce8f7] p-4">
     <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-brand-navy">{db.accounts.find(x=>x.id===a.driverId)?.name??a.driverId}</h2><p className="mt-1 text-xs text-muted-foreground">{a.id} · Vehicle: {vehicle?.model??"Missing"}</p></div><StatusPill value={a.status}/></div>
     <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f6f9ff] p-3"><p className="text-xs text-muted-foreground">Completed sample steps</p><p className="mt-1 font-bold text-brand-navy">{a.completedSteps}/5</p></div><div className="rounded-lg bg-[#f6f9ff] p-3"><p className="text-xs text-muted-foreground">Example document review</p><StatusPill value={a.documentsStatus}/></div><div className="rounded-lg bg-[#f6f9ff] p-3"><p className="text-xs text-muted-foreground">Example setup review</p><StatusPill value={a.screenSetupStatus}/></div></div>
     {a.status!=="approved"&&a.status!=="rejected"&&<div className="mt-4 flex flex-wrap gap-2">
      {a.completedSteps<5&&<AdminAction onClick={()=>update(a.id,"completedSteps",5)}>Mark 5 demo steps complete</AdminAction>}
      {a.documentsStatus!=="approved"&&<AdminAction onClick={()=>update(a.id,"documentsStatus","approved")}>Mark sample document review</AdminAction>}
      {a.screenSetupStatus!=="approved"&&<AdminAction onClick={()=>update(a.id,"screenSetupStatus","approved")}>Mark sample setup reviewed</AdminAction>}
      <AdminAction disabled={!complete} onClick={()=>approve(a.id)}>Approve seeded demo application</AdminAction>
     </div>}
     <p className="mt-3 text-xs leading-5 text-muted-foreground">Approvals require all five fictional steps and both sample review flags. The linked vehicle remains read-only outside this Admin action.</p>
    </article>;
   }):<p className="rounded-xl bg-[#f7faff] p-5 text-sm text-muted-foreground">No applications match your search.</p>}</div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Independent Driver Preview Submissions</CardTitle></CardHeader><CardContent>{previews.length?<div className="grid gap-3 md:grid-cols-2">{previews.map(p=><div key={p.id} className="rounded-xl border border-[#e0eafa] p-4"><p className="font-bold text-brand-navy">{p.alias}</p><p className="mt-1 text-xs text-muted-foreground">{p.id} · {p.submittedAt.slice(0,10)}</p><p className="mt-2 text-sm text-[#536e90]">{p.city} · {p.vehicleType} · {p.vehicleModel}</p><Badge className="mt-2" tone="info">Submitted preview · not verified</Badge></div>)}</div>:<p className="text-sm text-muted-foreground">No preview submissions in this browser. Part 14 driver submissions appear here without changing seeded KYC records.</p>}</CardContent></Card>
 </main></AdminAccess>;
}
export function AdminScreens(){
 const {db,ready,admin}=useAdminData(),{message,error,run}=useAdminAction();
 const [query,setQuery]=React.useState(""),[status,setStatus]=React.useState<"all"|Screen["status"]>("all"),[city,setCity]=React.useState("all");
 const cities=[...new Set(db.locations.map(l=>l.city))].sort();
 const visible=db.screens.filter(s=>{
  const loc=db.locations.find(l=>l.id===s.locationId);
  return (status==="all"||s.status===status)&&(city==="all"||loc?.city===city)
   &&(!query.trim()||[s.id,s.placement,loc?.name??"",db.accounts.find(a=>a.id===s.driverId)?.name??""].some(x=>x.toLowerCase().includes(query.toLowerCase())));
 });
 function update(id:string,next:Screen["status"]){
  if(!window.confirm("Change fictional screen "+id+" to "+next+"? This does not touch physical hardware."))return;
  run(()=>useDemoStore.getState().setScreenStatus(demoAdmin,id,next),"Screen "+id+" status");
 }
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading eyebrow="Admin · Sample Device Inventory" title="Screens & Devices" description="Filter owned screens, placement types and stored device flags. State changes are browser-local demonstrations."/>
  <AdminWarning>Online, offline and maintenance are fictional record flags, not connectivity tests or remote device commands. Assignment/booking integrity is managed by separate lifecycle checks.</AdminWarning><AdminNotice message={message} error={error}/>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="All sample displays" value={db.screens.length}/><MiniStat label="Demo online" value={db.screens.filter(s=>s.status==="online").length}/><MiniStat label="Maintenance flags" value={db.screens.filter(s=>s.status==="maintenance").length}/></div>
  <Card><CardHeader><CardTitle>Screen Inventory</CardTitle></CardHeader><CardContent>
   <div className="mb-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-[#557493]">Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} className={control+" mt-1"} placeholder="Screen, area or driver"/></label>
    <label className="text-xs font-semibold text-[#557493]">Status<select value={status} className={control+" mt-1"} onChange={e=>setStatus(e.target.value as typeof status)}><option value="all">All statuses</option>{(["online","offline","maintenance"] as const).map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label className="text-xs font-semibold text-[#557493]">City<select value={city} className={control+" mt-1"} onChange={e=>setCity(e.target.value)}><option value="all">All cities</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
   </div><p className="mb-3 text-xs text-muted-foreground">{visible.length} of {db.screens.length} fictional display records</p>
   <div className="grid gap-3 lg:grid-cols-2">{visible.length?visible.map(s=>{
    const loc=db.locations.find(l=>l.id===s.locationId),vehicle=db.vehicles.find(v=>v.id===s.vehicleId),driver=db.accounts.find(a=>a.id===s.driverId);
    return <article key={s.id} className="rounded-xl border border-[#dce8f7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Monitor className="size-5 text-brand-blue"/><h2 className="font-bold text-brand-navy">{s.id}</h2></div><StatusPill value={s.status}/></div>
     <p className="mt-2 text-xs text-muted-foreground">{s.placement.replaceAll("_"," ")} · {s.sizeInches} inch · {loc?.name??"No location"}</p>
     <p className="mt-1 text-xs text-muted-foreground">Driver: {driver?.name??s.driverId} · Vehicle: {vehicle?.model??s.vehicleId}</p>
     <p className="mt-2 text-xs text-muted-foreground">Example potential impressions/day: {s.impressionsPerDay.toLocaleString("en-IN")} (not actual plays)</p>
     <div className="mt-3 flex flex-wrap gap-2">{(["online","offline","maintenance"] as const).filter(x=>x!==s.status).map(next=><AdminAction key={next} onClick={()=>update(s.id,next)}>Mark {next}</AdminAction>)}</div>
    </article>;
   }):<p className="rounded-lg bg-[#f7faff] p-6 text-sm text-muted-foreground">No matching sample screens.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
export function AdminLocations(){
 const {db,ready,admin}=useAdminData();
 const [q,setQ]=React.useState(""),[city,setCity]=React.useState("all");
 const cities=[...new Set(db.locations.map(l=>l.city))].sort();
 const filtered=db.locations.filter(loc=>(city==="all"||loc.city===city)&&(!q||[loc.name,loc.zone,loc.city].some(v=>v.toLowerCase().includes(q.toLowerCase()))));
 return <AdminAccess ready={ready} admin={admin}><main className="mx-auto max-w-7xl space-y-5 pb-10">
  <AdminHeading eyebrow="Admin · Area & Zone Coverage" title="Locations & Zones" description="Inspect fictional area definitions, city coverage and linked screens from the existing shared demo database."/>
  <AdminWarning>These coordinates and zones are illustrative. No actual route, driver position or real-time geofencing is available. Location editing is disabled until backend authorization and geospatial validation exist.</AdminWarning>
  <div className="grid grid-cols-3 gap-3"><MiniStat label="Seeded cities" value={cities.length}/><MiniStat label="Sample areas" value={db.locations.length}/><MiniStat label="Screen-linked areas" value={new Set(db.screens.map(s=>s.locationId)).size}/></div>
  <Card><CardHeader><CardTitle>City & Zone Directory</CardTitle></CardHeader><CardContent>
   <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#577392]">Search areas<input value={q} type="search" onChange={e=>setQ(e.target.value)} className={control+" mt-1"} placeholder="Area, city, zone"/></label>
    <label className="text-xs font-semibold text-[#577392]">City<select value={city} onChange={e=>setCity(e.target.value)} className={control+" mt-1"}><option value="all">All cities</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label></div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(loc=><article key={loc.id} className="rounded-xl border border-[#dce8f7] p-4"><div className="flex items-center gap-3"><MapPin className="size-5 text-brand-blue"/><div><h2 className="font-bold text-brand-navy">{loc.name}</h2><p className="text-xs text-muted-foreground">{loc.city} · Zone {loc.zone}</p></div></div><p className="mt-3 text-sm font-bold text-brand-navy">{db.screens.filter(s=>s.locationId===loc.id).length} linked sample screens</p><p className="mt-1 text-xs text-muted-foreground">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)} · example coordinates</p><Badge tone="neutral" className="mt-3">Read-only demo zone</Badge></article>)}{!filtered.length&&<p className="rounded-lg bg-[#f7faff] p-6 text-sm text-muted-foreground">No sample areas match.</p>}</div>
  </CardContent></Card>
 </main></AdminAccess>;
}
