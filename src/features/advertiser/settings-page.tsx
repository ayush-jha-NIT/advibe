"use client";
import * as React from "react";
import {Bell,CheckCircle2,Info,RotateCcw,Save,Settings2,ShieldAlert,UserRound} from "lucide-react";
import {Button,Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import {useDemoStore} from "@/services/demo-store";
import {defaultAdvertiserPreferences,useAdvertiserPreferences} from "@/services/advertiser-preferences";
import {validateAccountProfile,type AccountProfileDraft} from "./account-model";
import {useAdvertiserData} from "./shared";

const field="min-h-11 w-full min-w-0 rounded-xl border border-[#ccdef3] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#daedff]";
function ProfileEditor({accountId,initial}:{accountId:string;initial:AccountProfileDraft}){
 const [name,setName]=React.useState(initial.name),[business,setBusiness]=React.useState(initial.business),[city,setCity]=React.useState(initial.city);
 const [error,setError]=React.useState(""),[success,setSuccess]=React.useState("");
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setSuccess("");
  try{
   const valid=validateAccountProfile({name,business,city});
   useDemoStore.getState().updateAdvertiserProfile({role:"advertiser",accountId},valid);
   setName(valid.name);setBusiness(valid.business);setCity(valid.city);setSuccess("Demo profile updated in browser storage.");
  }catch(e){setError(e instanceof Error?e.message:"Cannot update sample profile.");}
 }
 return <form onSubmit={submit} className="space-y-4">
  <div className="grid gap-4 sm:grid-cols-2">
   <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Display name</span><input className={field} value={name} maxLength={80} required onChange={e=>setName(e.target.value)} autoComplete="off"/></label>
   <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Business / brand name</span><input className={field} value={business} maxLength={100} required onChange={e=>setBusiness(e.target.value)} autoComplete="off"/></label>
   <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-brand-navy">Operating city (demo)</span><input className={field} value={city} maxLength={80} required onChange={e=>setCity(e.target.value)} autoComplete="off"/></label>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-[#fff0f2] p-3 text-sm text-[#b72f44]">{error}</p>}
  {success&&<p role="status" className="rounded-lg bg-[#effaf3] p-3 text-sm text-[#207244]">{success}</p>}
  <Button type="submit"><Save className="size-4"/>Save demo profile</Button>
 </form>;
}
export function AdvertiserSettings(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const account=db.accounts.find(a=>a.id===accountId&&a.role==="advertiser");
 const [prefsReady,setPrefsReady]=React.useState(false);
 const values=useAdvertiserPreferences(s=>s.values[accountId]??defaultAdvertiserPreferences);
 const update=useAdvertiserPreferences(s=>s.update),reset=useAdvertiserPreferences(s=>s.reset);
 React.useEffect(()=>{
  let active=true;
  void Promise.resolve(useAdvertiserPreferences.persist.rehydrate()).then(()=>{if(active)setPrefsReady(true);});
  return ()=>{active=false;};
 },[]);
 if(!hydrated||!prefsReady)return <p role="status" className="p-8 text-sm text-muted-foreground">Loading advertiser settings…</p>;
 return <main className="mx-auto max-w-5xl space-y-5 pb-10">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-blue">Advertiser · Preferences · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Profile & Settings</h1>
   <p className="mt-2 text-sm text-muted-foreground">Manage fictional business identity details and display preferences in this browser.</p></div>
  <p className="flex items-start gap-2 rounded-xl border border-[#d6e7f9] bg-[#f0f7ff] p-4 text-xs leading-6 text-[#47698c]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/>No real identity verification, email/password change, KYC upload, billing credentials or server-backed account update occurs here. Do not enter sensitive data.</p>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-brand-blue"/>Business Profile</CardTitle></CardHeader><CardContent>
   {account?<ProfileEditor accountId={accountId} initial={{name:account.name,business:account.business??"",city:account.city}}/>:<div className="rounded-xl border border-dashed border-[#cadcf3] p-6"><p className="font-semibold text-brand-navy">Demo profile not provisioned</p><p className="mt-2 text-sm leading-6 text-muted-foreground">New frontend-only signup identities have no linked account record. Use the preset Advertiser demo account to edit fictional business details.</p></div>}
  </CardContent></Card>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5 text-brand-blue"/>Workspace Preferences</CardTitle><p className="mt-1 text-xs text-muted-foreground">Saved locally for this demo identity. These controls affect the visible dashboard and campaign listing.</p></CardHeader><CardContent className="space-y-4">
   <label className="flex min-h-16 flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e0e9f6] p-4">
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-bold text-brand-navy"><Bell className="size-4 text-brand-blue"/>Show dashboard notification previews</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Hide or display your stored demo notices on the dashboard. All notices remain available in the Notification Center.</span></span>
    <input type="checkbox" checked={values.showDashboardNotices} disabled={!account} onChange={e=>update(accountId,{showDashboardNotices:e.target.checked})} className="size-5 shrink-0 accent-[#0866ff]"/>
   </label>
   <label className="flex min-h-16 flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e0e9f6] p-4">
    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-brand-navy">Default campaign rows per page</span><span className="mt-1 block text-xs text-muted-foreground">Applied when reopening My Campaigns.</span></span>
    <select value={values.campaignPageSize} disabled={!account} onChange={e=>update(accountId,{campaignPageSize:Number(e.target.value) as 5|10|20})} className="min-h-11 rounded-lg border border-[#cadcf0] bg-white px-3 text-sm"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select>
   </label>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#179a6d]"/>Preferences update immediately and remain local to this browser.</p>
    <Button variant="outline" disabled={!account} onClick={()=>reset(accountId)}><RotateCcw className="size-4"/>Restore defaults</Button>
   </div>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Account & Security</CardTitle></CardHeader><CardContent>
   <div className="flex items-start gap-3 rounded-xl border border-[#f6d9ae] bg-[#fff8eb] p-4"><Info className="mt-0.5 size-5 shrink-0 text-[#ac7025]"/><div><p className="font-semibold text-brand-navy">Production account management is not connected.</p>
    <p className="mt-1 text-xs leading-6 text-[#74562d]">Password reset, verified contact details, two-factor authentication, session revocation, team access and billing identity changes require secure backend support. The Part 6 demo login only uses preset credentials.</p>
   </div></div>
  </CardContent></Card>
 </main>;
}
