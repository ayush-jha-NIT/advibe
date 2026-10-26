"use client";
import * as React from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {portalNavigation,type PortalRole} from "@/config/navigation";
import {api,apiPage,downloadApiCsv,liveSession,newIdempotencyKey,
 type LiveSession} from "@/services/api-client";
type Row=Record<string,unknown>;
type Result={rows:Row[];nextCursor:string|null;summary:Row|null};
const input="w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const button="min-h-10 rounded-lg bg-[#1768d3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1050a5] disabled:opacity-50";
const outline="min-h-10 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50";
function simple(value:unknown):string{
 if(value===null||value===undefined)return "—";
 if(typeof value==="object")return JSON.stringify(value);
 if(typeof value==="boolean")return value?"Yes":"No";
 return String(value);
}
function money(value:unknown):string{
 try{
  const amount=BigInt(String(value??"0"));
  const neg=amount<BigInt(0)?"-":"";
  const val=amount<BigInt(0)?-amount:amount;
  return neg+"₹"+(val/BigInt(100)).toLocaleString("en-IN")+"."+
   (val%BigInt(100)).toString().padStart(2,"0");
 }catch{return "Unavailable";}
}
function meaningfulRows(data:unknown):Result{
 if(Array.isArray(data))return {rows:data.filter(x=>x&&typeof x==="object") as Row[],
  summary:null,nextCursor:null};
 if(data&&typeof data==="object"){
  const record=data as Row;
  const arr=Object.entries(record).find(([key,value])=>
   ["entries","items","records","results"].includes(key)&&Array.isArray(value))?.[1];
  if(Array.isArray(arr))return {rows:arr as Row[],summary:record,nextCursor:null};
  return {rows:[],summary:record,nextCursor:null};
 }
 return {rows:[],summary:null,nextCursor:null};
}
function heading(section:string){
 return section==="home"?"Overview":section.split("-").map(s=>
  s.charAt(0).toUpperCase()+s.slice(1)).join(" ");
}
function routeFor(role:PortalRole,section:string,pathname:string):string|null{
 if(role==="admin"){
  const map:Record<string,string>={
   home:"/admin/reports",analytics:"/admin/reports",users:"/admin/users",
   advertisers:"/admin/users?role=ADVERTISER",drivers:"/admin/driver-applications",
   approvals:"/admin/driver-applications",audit:"/admin/audit-events",
   support:"/support/tickets",notifications:"/notifications",screens:"/screens",
   campaigns:"/campaigns",bookings:"/payments",payments:"/payments",
   settlements:"/admin/settlements",pricing:"/pricing/rules",
   locations:"/admin/locations","ad-formats":"/public/formats",
   settings:"/auth/admin-security",
  };
  return map[section]??null;
 }
 if(role==="advertiser"){
  const map:Record<string,string>={
   home:"/campaigns",campaigns:"/campaigns",
   "create-campaign":"/campaigns",creatives:"/creatives",billing:"/payments",
   reports:"/reports/advertiser",notifications:"/notifications",
   support:"/support/tickets",locations:"/public/locations",
   "ad-formats":"/public/formats",settings:"/businesses",
  };
  const detail=pathname.match(/^\/advertiser\/campaigns\/([0-9a-f-]{36})$/);
  return detail?"/campaigns/"+detail[1]:map[section]??null;
 }
 const map:Record<string,string>={
  home:"/drivers/me",earnings:"/drivers/me/earnings",
  payouts:"/drivers/me/settlements",vehicle:"/drivers/me/vehicles",
  onboarding:"/drivers/applications",verification:"/drivers/applications",
  "assigned-ads":"/driver/assignments",delivery:"/driver/assignments",
  campaigns:"/driver/assignments",trips:"/drivers/applications",
  maintenance:"/maintenance",notifications:"/notifications",
  support:"/support/tickets",profile:"/drivers/me",
 };
 return map[section]??null;
}
function SafeSummary({data}:{data:Row}){
 const lines=Object.entries(data).filter(([key])=>!["entries","items","records","results",
  "meta","limitations"].includes(key)).slice(0,35);
 return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
  {lines.map(([key,value])=><div key={key} className="min-w-0 rounded-xl border border-blue-100 bg-white p-4">
   <div className="break-words text-xs font-semibold text-slate-600">{heading(key.replace(/([A-Z])/g,"-$1").toLowerCase())}</div>
   {value&&typeof value==="object"&&!Array.isArray(value)?
    <div className="mt-2 space-y-1">{Object.entries(value as Row).slice(0,18).map(([inner,v])=>
     <p key={inner} className="flex justify-between gap-3 border-b border-slate-100 py-1 text-xs">
      <span className="min-w-0 text-slate-600">{heading(inner.replace(/([A-Z])/g,"-$1").toLowerCase())}</span>
      <strong className="break-all text-right text-[#153658]">{inner.toLowerCase().includes("paise")?money(v):simple(v)}</strong>
     </p>)}</div>:
    <p className="mt-2 break-all text-lg font-bold text-[#133a64]">{key.toLowerCase().includes("paise")?money(value):simple(value)}</p>}
  </div>)}
 </div>;
}
function SafeTable({rows,onSelect}:{rows:Row[];onSelect?:(row:Row)=>void}){
 if(!rows.length)return <p className="rounded-xl border border-dashed border-blue-200 bg-white p-6 text-sm text-slate-600">No live records available for this account.</p>;
 const preferred=["id","title","subject","displayName","name","status","state",
  "email","createdAt","updatedAt","amountPaise","grossPaise"];
 const fields=[...new Set([...preferred.filter(f=>rows.some(r=>f in r)),...Object.keys(rows[0]??{})])]
  .filter(f=>!/(token|secret|password|hash|url|metadata)/i.test(f)).slice(0,8);
 return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
  <table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#edf5ff] text-[#20436d]">
   <tr>{fields.map(key=><th key={key} className="px-4 py-3 text-xs font-bold">{heading(key.replace(/([A-Z])/g,"-$1").toLowerCase())}</th>)}
    {onSelect&&<th className="px-4 py-3">Actions</th>}</tr></thead>
   <tbody>{rows.map((row,i)=><tr key={String(row.id??i)} className="border-t border-slate-100">
    {fields.map(key=><td key={key} className="max-w-[230px] truncate px-4 py-3 text-xs text-slate-700" title={simple(row[key])}>
     {key.toLowerCase().includes("paise")?money(row[key]):simple(row[key])}</td>)}
    {onSelect&&<td className="px-4 py-3"><button type="button" className="text-xs font-bold text-blue-700 underline" onClick={()=>onSelect(row)}>Manage</button></td>}
   </tr>)}</tbody></table>
 </div>;
}
function CampaignForm({session,onDone}:{session:LiveSession;onDone:()=>void}){
 const router=useRouter();
 const [businesses,setBusinesses]=React.useState<Row[]>([]);
 const [creatives,setCreatives]=React.useState<Row[]>([]);
 const [businessId,setBusinessId]=React.useState("");
 const [creativeId,setCreativeId]=React.useState("");
 const [title,setTitle]=React.useState("");
 const [from,setFrom]=React.useState(""),[to,setTo]=React.useState("");
 const [days,setDays]=React.useState<number[]>([1,2,3,4,5,6,0]);
 const [saving,setSaving]=React.useState(false),[error,setError]=React.useState("");
 React.useEffect(()=>{void api<Row[]>("/businesses?limit=50").then(setBusinesses).catch(e=>setError(e instanceof Error?e.message:"Business list unavailable"));},[]);
 React.useEffect(()=>{if(!businessId)return;void api<Row[]>("/creatives?businessId="+businessId).then(setCreatives).catch(()=>setCreatives([]));},[businessId]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError("");
  try{
   const result=await api<{id:string}>("/campaigns",{method:"POST",
    csrfToken:session.csrfToken,idempotencyKey:newIdempotencyKey(),
    body:{businessId,creativeId,title,startDate:from,endDate:to,weekdays:days}});
   onDone();router.push("/advertiser/campaigns/"+result.id);
  }catch(err){setError(err instanceof Error?err.message:"Campaign creation failed");}
  finally{setSaving(false);}
 }
 return <form onSubmit={submit} className="max-w-3xl space-y-4 rounded-xl border border-blue-100 bg-white p-5">
  <p className="text-sm text-slate-600">New campaigns are drafts until reviewed and booked. Payments and screen delivery are not automatically activated.</p>
  <label className="block text-sm font-semibold">Business<select required className={input} value={businessId} onChange={e=>{setBusinessId(e.target.value);setCreativeId("");}}>
   <option value="">Choose business</option>{businesses.map(b=><option key={String(b.id)} value={String(b.id)}>{simple(b.displayName??b.name??b.id)}</option>)}</select></label>
  <label className="block text-sm font-semibold">Approved or uploaded creative<select required className={input} value={creativeId} onChange={e=>setCreativeId(e.target.value)}>
   <option value="">Choose creative</option>{creatives.map(c=><option key={String(c.id)} value={String(c.id)}>{simple(c.title??c.id)} ({simple(c.approval)})</option>)}</select></label>
  <label className="block text-sm font-semibold">Campaign title<input className={input} value={title} maxLength={180} required onChange={e=>setTitle(e.target.value)}/></label>
  <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Start<input className={input} type="date" required value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label className="text-sm font-semibold">End (within 60 days)<input className={input} type="date" required value={to} onChange={e=>setTo(e.target.value)}/></label></div>
  <fieldset><legend className="text-sm font-semibold">Delivery weekdays</legend><div className="mt-2 flex flex-wrap gap-3">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,i)=>
   <label key={day} className="text-sm"><input type="checkbox" checked={days.includes(i)} onChange={e=>setDays(old=>e.target.checked?[...old,i].sort():old.filter(d=>d!==i))}/> {day}</label>)}</div></fieldset>
  <button className={button} type="submit" disabled={saving||!days.length}>{saving?"Saving…":"Save campaign draft"}</button>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </form>;
}
function SupportForm({session,role,onDone}:{session:LiveSession;role:PortalRole;onDone:()=>void}){
 const [businesses,setBusinesses]=React.useState<Row[]>([]);
 const [category,setCategory]=React.useState(role==="driver"?"GENERAL":"BILLING");
 const [businessId,setBusinessId]=React.useState("");
 const [screenId,setScreenId]=React.useState("");
 const [subject,setSubject]=React.useState(""),[description,setDescription]=React.useState("");
 const [error,setError]=React.useState(""),[busy,setBusy]=React.useState(false);
 React.useEffect(()=>{if(role==="advertiser")void api<Row[]>("/businesses?limit=50").then(setBusinesses).catch(()=>setBusinesses([]));},[role]);
 if(role==="admin")return null;
 return <form className="mb-5 grid gap-3 rounded-xl border border-blue-100 bg-white p-5" onSubmit={async e=>{
  e.preventDefault();setBusy(true);setError("");
  try{await api("/support/tickets",{method:"POST",csrfToken:session.csrfToken,
   idempotencyKey:newIdempotencyKey(),body:{category,subject,description,
    ...(role==="driver"&&category==="DEVICE"?{screenId}:{})
    ,...(role==="advertiser"?{businessId}:{})}});
   setSubject("");setDescription("");onDone();
  }catch(err){setError(err instanceof Error?err.message:"Ticket could not be submitted");}
  finally{setBusy(false);}
 }}>
  <h2 className="text-lg font-bold text-[#153a63]">Open support ticket</h2>
  <label className="text-sm font-semibold">Category<select className={input} value={category} onChange={e=>setCategory(e.target.value)}>
   {role==="driver"?<><option value="GENERAL">General</option><option value="DEVICE">Device</option></>:<><option value="GENERAL">General</option><option value="BILLING">Billing</option></>}</select></label>
  {role==="advertiser"?<label className="text-sm font-semibold">Business<select required className={input} value={businessId} onChange={e=>setBusinessId(e.target.value)}><option value="">Select business</option>{businesses.map(x=><option value={String(x.id)} key={String(x.id)}>{simple(x.displayName??x.name??x.id)}</option>)}</select></label>:
   category==="DEVICE"&&<label className="text-sm font-semibold">Owned screen ID<input required className={input} value={screenId} onChange={e=>setScreenId(e.target.value)} placeholder="Screen UUID"/></label>}
  <label className="text-sm font-semibold">Subject<input required minLength={5} maxLength={160} className={input} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
  <label className="text-sm font-semibold">Description<textarea className={input} required minLength={12} maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <button className={button} disabled={busy}>{busy?"Submitting…":"Submit ticket"}</button>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </form>;
}
export function ApiPortal({role}:{role:PortalRole}){
 const router=useRouter(),pathname=usePathname();
 const [session,setSession]=React.useState<LiveSession|null>(null);
 const [authError,setAuthError]=React.useState("");
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState("");
 const [data,setData]=React.useState<Result>({rows:[],summary:null,nextCursor:null});
 const [cursor,setCursor]=React.useState(""),[cursorPath,setCursorPath]=React.useState(""),[refresh,setRefresh]=React.useState(0);
 const activeCursor=cursorPath===pathname?cursor:"";
 const [selected,setSelected]=React.useState<Row|null>(null);
 const [busy,setBusy]=React.useState(false);
 const section=pathname.split("/")[2]??"home";
 const endpoint=routeFor(role,section,pathname);
 React.useEffect(()=>{
  const ac=new AbortController();
  void liveSession(ac.signal).then(current=>{
   if(current.role!==role){setAuthError("Your authenticated account does not have access to the "+role+" portal.");return;}
   setSession(current);setAuthError("");
  }).catch(e=>{if(!ac.signal.aborted)setAuthError(e instanceof Error?e.message:"Unable to verify live session");})
  .finally(()=>{if(!ac.signal.aborted)setLoading(false);});
  return ()=>ac.abort();
 },[role]);
 React.useEffect(()=>{
  if(!session||!endpoint)return;
  const ac=new AbortController();
  Promise.resolve().then(()=>{
   setLoading(true);setError("");
   const url=endpoint+(activeCursor?(endpoint.includes("?")?"&":"?")+"cursor="+activeCursor:"");
   return apiPage<Row>(url,ac.signal).then(payload=>{
    if(!ac.signal.aborted){
     const result=meaningfulRows(payload.data);
     setData({...result,nextCursor:payload.meta.nextCursor??null});
    }
   });
  }).catch(e=>{if(!ac.signal.aborted){setError(e instanceof Error?e.message:"Live data unavailable");setData({rows:[],summary:null,nextCursor:null});}})
  .finally(()=>{if(!ac.signal.aborted)setLoading(false);});
  return ()=>ac.abort();
 },[session,endpoint,activeCursor,refresh]);
 async function signOut(){
  if(!session)return;
  setBusy(true);
  try{await api("/auth/logout",{method:"POST",csrfToken:session.csrfToken});router.replace("/login");router.refresh();}
  catch(err){setError(err instanceof Error?err.message:"Could not sign out");}
  finally{setBusy(false);}
 }
 async function rowAction(row:Row){
  if(!session)return;
  if(section==="users"&&role==="admin"){
   const status=String(row.status).toUpperCase();
   if(!["ACTIVE","SUSPENDED"].includes(status))return;
   const reason=window.prompt("Document a reviewed reason (minimum 20 characters).");
   if(!reason||reason.trim().length<20)return;
   const next=status==="ACTIVE"?"SUSPENDED":"ACTIVE";
   if(!window.confirm("Change this account status to "+next+"? All sessions will be revoked."))return;
   setBusy(true);setError("");
   try{await api("/admin/users/"+row.id+"/status",{method:"PATCH",csrfToken:session.csrfToken,
    idempotencyKey:newIdempotencyKey(),
    body:{expectedStatus:status,status:next,reason:reason.trim()}});
    setRefresh(r=>r+1);
   }catch(e){setError(e instanceof Error?e.message:"Status change rejected");}finally{setBusy(false);}
  }else if(section==="notifications"){
   setBusy(true);
   try{await api("/notifications/"+row.id+"/read",{method:"POST",csrfToken:session.csrfToken,body:{}});
    setRefresh(r=>r+1);
   }catch(e){setError(e instanceof Error?e.message:"Notification update failed");}finally{setBusy(false);}
  }else if(section==="support"||section==="campaigns"){setSelected(row);}
 }
 const management=(section==="users"&&role==="admin"||section==="notifications"||
  section==="campaigns"||section==="support")?rowAction:undefined;
 if(authError||(!loading&&!session))return <main className="grid min-h-dvh place-items-center bg-[#f2f7ff] p-5"><section className="max-w-md rounded-xl bg-white p-8 shadow">
  <h1 className="text-xl font-bold text-[#153658]">Live session required</h1><p role="alert" className="my-4 text-sm text-slate-700">{authError||"Sign in with a verified account."}</p>
  <Link className={button} href={"/login?next="+encodeURIComponent(pathname)}>Secure sign in</Link>
 </section></main>;
 if(!session)return <p role="status" className="p-8 text-sm text-slate-600">Verifying authenticated session…</p>;
 const nav=portalNavigation[role];
 return <div className="min-h-dvh bg-[#f1f6fc] text-[#153658]">
  <header className="sticky top-0 z-20 border-b border-[#cce0f5] bg-white px-4 py-3">
   <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
    <Link href={"/"+role} className="text-xl font-extrabold">AdVibe <span className="ml-2 text-xs font-medium text-blue-700">LIVE API · {role.toUpperCase()}</span></Link>
    <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-600 sm:block">Authenticated session</span>
     <button type="button" className={outline} disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>
   </div>
  </header>
  <div className="mx-auto flex max-w-[1500px] flex-col md:flex-row">
   <nav aria-label={role+" portal navigation"} className="flex max-h-[220px] gap-1 overflow-auto border-b border-blue-100 bg-[#092b53] p-3 text-white md:sticky md:top-[64px] md:h-[calc(100dvh-64px)] md:max-h-none md:w-60 md:min-w-60 md:flex-col md:border-r md:border-b-0">
    {nav.map(item=><Link key={item.href} href={item.href} onClick={()=>{setSelected(null);setCursor("");setCursorPath(item.href);}}
     className={"shrink-0 rounded-lg px-3 py-2.5 text-xs font-semibold hover:bg-[#285784] "+(pathname===item.href?"bg-[#1768d3]":"")}
     aria-current={pathname===item.href?"page":undefined}>{item.label}</Link>)}
   </nav>
   <main className="min-w-0 flex-1 space-y-5 px-4 py-6 sm:px-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{role} / backend</p>
     <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{heading(section)}</h1>
     <p className="mt-1 text-sm text-slate-600">Only records returned by the authenticated AdVibe API are shown. No simulated financial or campaign activity.</p></div>
     <div className="flex gap-2"><button className={outline} onClick={()=>setRefresh(x=>x+1)}>Refresh</button>
      {role==="admin"&&(section==="analytics"||section==="audit"||section==="home")&&<button className={button}
       onClick={()=>void downloadApiCsv(section==="audit"?"/admin/audit-events/export":"/admin/reports/export","advibe-"+section+"-live.csv").catch(e=>setError(e instanceof Error?e.message:"Export unavailable"))}>Download verified CSV</button>}</div>
    </div>
    {error&&<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {section==="create-campaign"&&role==="advertiser"&&<CampaignForm session={session} onDone={()=>setRefresh(x=>x+1)}/>}
    {section==="support"&&<SupportForm role={role} session={session} onDone={()=>setRefresh(x=>x+1)}/>}
    {!endpoint?<div className="rounded-xl border border-amber-200 bg-white p-6">
     <h2 className="text-lg font-bold">This workflow is not connected in API mode</h2><p className="mt-2 text-sm text-slate-600">A live backend endpoint or verified production adapter is required. The demo workflow is intentionally disabled.</p>
     </div>:loading?<p role="status" className="rounded-xl bg-white p-5 text-sm">Loading authenticated records…</p>:
     <>{data.summary&&<SafeSummary data={data.summary}/>}
      {data.rows.length>0&&<SafeTable rows={data.rows} onSelect={management}/>}
      {!data.summary&&!data.rows.length&&<p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm">No records returned by this account&apos;s backend endpoint.</p>}
      {data.nextCursor&&<button className={outline} onClick={()=>{setCursorPath(pathname);setCursor(data.nextCursor!);}}>Next page</button>}
      {activeCursor&&<button className={outline} onClick={()=>setCursor("")}>First page</button>}
     </>}
    {selected&&<section className="rounded-xl border border-blue-200 bg-white p-5">
     <div className="flex justify-between"><h2 className="font-bold">Selected live record</h2><button className="text-sm text-blue-700" onClick={()=>setSelected(null)}>Close</button></div>
     <SafeSummary data={selected}/>
     {section==="support"&&<form className="mt-4 flex flex-col gap-3" onSubmit={async e=>{
      e.preventDefault();if(!session)return;
      const form=new FormData(e.currentTarget);const body=String(form.get("body")??"");
      setBusy(true);setError("");
      try{await api("/support/tickets/"+selected.id+"/messages",{method:"POST",
       csrfToken:session.csrfToken,idempotencyKey:newIdempotencyKey(),body:{body,visibility:"PUBLIC"}});
       setSelected(null);setRefresh(x=>x+1);
      }catch(err){setError(err instanceof Error?err.message:"Message failed");}finally{setBusy(false);}
     }}><label className="text-sm font-semibold">Send ticket response<textarea name="body" className={input} maxLength={2000} required rows={3}/></label><button className={button} disabled={busy}>Send response</button></form>}
     </section>}
   </main>
  </div>
 </div>;
}
