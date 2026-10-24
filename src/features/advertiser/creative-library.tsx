"use client";

import * as React from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,FileImage,Film,Image as ImageIcon,Info,Plus,Search,ShieldAlert,Trash2,UploadCloud,X} from "lucide-react";
import {Badge,Button,Card,CardContent,CardHeader,CardTitle,Dialog} from "@/components/ui";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import {useDemoStore} from "@/services/demo-store";
import {inspectLocalPreview} from "./preview-inspection";
import {fileSizeLabel} from "./creative-guards";
import {assertCreativeEdit,filterCreativeLibrary,formatDescriptions,placements,validateCreativeDraft,type CreativeDraft,type CreativeFormat} from "./library-model";
import {useAdvertiserData} from "./shared";
import type {Creative,Placement,ReviewStatus} from "@/types/domain";

const field="min-h-11 w-full min-w-0 rounded-xl border border-[#ccdbef] bg-white px-3 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#dceafe]";
const defaultForm:CreativeDraft={title:"",format:"image",placement:"auto_rear"};
function ReviewBadge({approval}:{approval:ReviewStatus}){
 return <Badge tone={approval==="approved"?"success":approval==="rejected"?"danger":approval==="under_review"?"info":"warning"} className="capitalize">{approval.replaceAll("_"," ")}</Badge>;
}
export function CreativeLibrary(){
 const {db,accountId,hydrated}=useAdvertiserData();
 const owned=React.useMemo(()=>db.creatives.filter(c=>c.advertiserId===accountId),[db,accountId]);
 const [query,setQuery]=React.useState("");
 const [placementFilter,setPlacementFilter]=React.useState<Placement|"all">("all");
 const [formatFilter,setFormatFilter]=React.useState<CreativeFormat|"all">("all");
 const [reviewFilter,setReviewFilter]=React.useState<ReviewStatus|"all">("all");
 const [editing,setEditing]=React.useState<string|null>(null);
 const [showForm,setShowForm]=React.useState(false);
 const [form,setForm]=React.useState<CreativeDraft>(defaultForm);
 const [error,setError]=React.useState(""),[message,setMessage]=React.useState("");
 const [file,setFile]=React.useState<File|null>(null);
 const [previewUrl,setPreviewUrl]=React.useState("");
 const [inspection,setInspection]=React.useState("");
 const [checking,setChecking]=React.useState(false);
 const [deleteTarget,setDeleteTarget]=React.useState<Creative|null>(null);
 const previewRef=React.useRef("");
 const pickRef=React.useRef(0);
 const results=React.useMemo(()=>filterCreativeLibrary(owned,accountId,{query,placement:placementFilter,format:formatFilter,approval:reviewFilter}),[owned,accountId,query,placementFilter,formatFilter,reviewFilter]);
 const linked=React.useCallback((id:string)=>db.campaigns.filter(c=>c.advertiserId===accountId&&c.creativeId===id),[db,accountId]);
 const editable=(c:Creative)=>{try{assertCreativeEdit(db,{role:"advertiser",accountId},c.id);return true;}catch{return false;}};
 function dispose(){
  pickRef.current++;
  if(previewRef.current)URL.revokeObjectURL(previewRef.current);
  previewRef.current="";setPreviewUrl("");setFile(null);setInspection("");setChecking(false);
 }
 React.useEffect(()=>()=>{if(previewRef.current)URL.revokeObjectURL(previewRef.current);},[]);
 function openNew(){dispose();setEditing(null);setForm(defaultForm);setError("");setMessage("");setShowForm(true);}
 function openEdit(c:Creative){dispose();setEditing(c.id);setForm({title:c.title,format:c.format,placement:c.placement});setError("");setMessage("");setShowForm(true);}
 function close(){dispose();setShowForm(false);setError("");}
 async function chooseFile(next:File|null){
  dispose();setError("");
  if(!next)return;
  const token=pickRef.current;
  setChecking(true);
  try{
   const result=await inspectLocalPreview(next);
   if(token!==pickRef.current)return;
   const url=URL.createObjectURL(next);
   previewRef.current=url;setPreviewUrl(url);setFile(next);
   setForm(p=>({...p,format:result.kind}));
   setInspection(fileSizeLabel(next.size)+" · "+result.measurements.width+" × "+result.measurements.height+" px"+(result.kind==="video"?" · "+Math.round(result.measurements.durationSeconds??0)+" sec":""));
  }catch(e){if(token===pickRef.current)setError(e instanceof Error?e.message:"Could not preview file.");}
  finally{if(token===pickRef.current)setChecking(false);}
 }
 function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setMessage("");
  if(accountId==="not-provisioned"){setError("Use the preset advertiser demo account to save library metadata.");return;}
  try{
   const valid=validateCreativeDraft(form);
   const actor={role:"advertiser" as const,accountId};
   if(editing){useDemoStore.getState().updateCreativeMetadata(actor,editing,valid);setMessage("Creative metadata updated in this browser.");}
   else{const id=useDemoStore.getState().createCreativeMetadata(actor,valid);setMessage("Creative "+id+" saved as pending metadata. No media file was uploaded.");}
   close();setMessage(editing?"Creative metadata updated.":"Pending creative metadata saved. No media bytes were uploaded.");
  }catch(e){setError(e instanceof Error?e.message:"Cannot save creative metadata.");}
 }
 function deleteCreative(){
  if(!deleteTarget)return;setError("");setMessage("");
  try{useDemoStore.getState().deleteCreativeMetadata({role:"advertiser",accountId},deleteTarget.id);
   setMessage("Unlinked pending creative metadata removed.");setDeleteTarget(null);
  }catch(e){setError(e instanceof Error?e.message:"Cannot remove creative.");setDeleteTarget(null);}
 }
 function clearFilters(){setQuery("");setPlacementFilter("all");setFormatFilter("all");setReviewFilter("all");}
 if(!hydrated)return <div role="status" className="p-8 text-sm text-muted-foreground">Loading creative library…</div>;
 return <main className="mx-auto max-w-7xl space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand-blue">Advertiser · Media library · DEMO</p><h1 className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">Creative Library</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Organize approved and pending creative metadata. Inspect a local image or video before planning a campaign.</p></div>
   <Button type="button" onClick={openNew} disabled={accountId==="not-provisioned"}><Plus className="size-4"/>Add Creative</Button>
  </div>
  <div className="flex items-start gap-2 rounded-xl border border-[#d0e5fa] bg-[#f0f7ff] p-4 text-xs leading-6 text-[#49658b]"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-blue"/>
   <p><strong>Metadata-only demo.</strong> No files are uploaded or retained, no approval is granted by this screen, and preview files remain on your device. Newly registered, unprovisioned demo accounts can browse an empty library but cannot save records.</p>
  </div>
  {message&&<p role="status" className="rounded-xl border border-[#b6dfc9] bg-[#effaf3] p-3 text-sm text-[#226a43]">{message}</p>}
  {error&&!showForm&&<p role="alert" className="rounded-xl border border-[#f0bbc2] bg-[#fff1f3] p-3 text-sm text-[#ad3141]">{error}</p>}
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
   {[
    ["My creatives",owned.length],
    ["Approved",owned.filter(x=>x.approval==="approved").length],
    ["Awaiting review",owned.filter(x=>x.approval==="pending"||x.approval==="under_review").length],
    ["In campaigns",owned.filter(x=>linked(x.id).length>0).length]
   ].map(([name,count])=><div key={name} className="rounded-xl border border-[#dce8f7] bg-white p-4"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-2 text-2xl font-extrabold text-brand-navy">{count}</p></div>)}
  </div>
  <Card><CardHeader><CardTitle>Find creative assets</CardTitle></CardHeader><CardContent>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#436087]">Search title or ID</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#8096b4]"/><input type="search" className={field+" pl-9"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search creative…"/></div></label>
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#436087]">Placement</span><select className={field} value={placementFilter} onChange={e=>setPlacementFilter(e.target.value as Placement|"all")}><option value="all">All placements</option>{placements.map(p=><option key={p} value={p}>{formatDescriptions[p].name}</option>)}</select></label>
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#436087]">Media type</span><select className={field} value={formatFilter} onChange={e=>setFormatFilter(e.target.value as CreativeFormat|"all")}><option value="all">All media</option><option value="image">Image</option><option value="gif">GIF</option><option value="video">Video</option></select></label>
    <label className="block"><span className="mb-1 block text-xs font-semibold text-[#436087]">Review status</span><select className={field} value={reviewFilter} onChange={e=>setReviewFilter(e.target.value as ReviewStatus|"all")}><option value="all">All statuses</option>{(["pending","under_review","approved","rejected"] as const).map(p=><option value={p} key={p}>{p.replaceAll("_"," ")}</option>)}</select></label>
   </div>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Showing {results.length} of {owned.length} creative record(s)</span><button type="button" className="min-h-11 font-semibold text-brand-blue hover:underline" onClick={clearFilters}>Clear filters</button></div>
  </CardContent></Card>
  {results.length?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{results.map(c=><article key={c.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#dce8f7] bg-white shadow-sm">
    <div className="relative aspect-[1.8] overflow-hidden bg-[#eaf2ff]"><FormatPreviewArt type={c.placement}/><div className="absolute bottom-2 left-2 rounded-md bg-[#071b3fdd] px-2 py-1 text-[11px] text-white">Illustrative placement only</div></div>
    <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-base font-bold text-brand-navy">{c.title}</h2><p className="mt-1 font-mono text-[11px] text-muted-foreground">{c.id}</p></div><ReviewBadge approval={c.approval}/></div>
     <div className="mt-3 flex flex-wrap gap-2"><Badge tone="info">{c.format.toUpperCase()}</Badge><Badge>{formatDescriptions[c.placement].name}</Badge></div>
     <p className="mt-3 text-xs text-muted-foreground">{linked(c.id).length} linked campaign(s) · No stored media</p>
     <div className="mt-4 flex flex-wrap gap-2"><Link href="/advertiser/create-campaign" className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-blue px-3 text-xs font-bold text-white hover:bg-[#0055de]">Use in wizard <ArrowRight className="size-4"/></Link>
      {editable(c)&&<><Button type="button" variant="outline" size="sm" className="min-h-11" onClick={()=>openEdit(c)}>Edit</Button><Button type="button" variant="outline" size="sm" className="min-h-11" onClick={()=>setDeleteTarget(c)}><Trash2 className="size-4"/>Delete</Button></>}</div>
    </div>
   </article>)}</div>:<div className="rounded-2xl border border-dashed border-[#cadcf3] bg-white p-10 text-center"><FileImage className="mx-auto size-10 text-[#8faace]"/><h2 className="mt-3 font-bold text-brand-navy">No creative records found</h2><p className="mt-2 text-sm text-muted-foreground">Create pending metadata or adjust your filters. This does not represent a live media library.</p></div>}
  <Dialog open={showForm} onOpenChange={open=>{if(!open)close();}} title={editing?"Edit creative metadata":"Add creative metadata"} description="Only metadata is saved in this demonstration. Files never leave your device." className="max-w-xl">
   <form onSubmit={save} className="space-y-4">
    <label className="block"><span className="mb-1 block text-sm font-semibold text-brand-navy">Creative name *</span><input required maxLength={100} minLength={3} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className={field} placeholder="Festival offer display"/></label>
    <div className="grid gap-3 sm:grid-cols-2">
     <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Placement *</span><select className={field} value={form.placement} onChange={e=>setForm(p=>({...p,placement:e.target.value as Placement}))}>{placements.map(p=><option key={p} value={p}>{formatDescriptions[p].name}</option>)}</select></label>
     <label><span className="mb-1 block text-sm font-semibold text-brand-navy">Media type *</span><select disabled={!!file} className={field} value={form.format} onChange={e=>setForm(p=>({...p,format:e.target.value as CreativeFormat}))}><option value="image">Image</option><option value="gif">GIF</option><option value="video">Video</option></select></label>
    </div>
    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#9fc5fa] bg-[#f7faff] p-4 text-center hover:bg-[#f0f7ff]"><UploadCloud className="mb-2 size-7 text-brand-blue"/><span className="text-sm font-bold text-brand-navy">{checking?"Inspecting media…":"Choose file for local preview"}</span><span className="mt-1 text-xs text-muted-foreground">PNG, JPEG, GIF or MP4 · 10 MB max · 320–4096 px · Video 1–60 sec</span>
     <input type="file" className="sr-only" disabled={checking} accept=".png,.jpg,.jpeg,.gif,.mp4,image/png,image/jpeg,image/gif,video/mp4" onChange={e=>{const f=e.target.files?.[0]??null;e.target.value="";void chooseFile(f);}}/></label>
    {inspection&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#eefaf4] p-3 text-xs text-[#245f42]"><span className="break-words">{file?.name} · {inspection}</span><Button size="sm" variant="outline" onClick={dispose}><X className="size-4"/>Remove preview</Button></div>}
    {previewUrl&&file&&(file.type==="video/mp4"?<video controls preload="metadata" className="max-h-56 w-full rounded-lg bg-[#06142c] object-contain" src={previewUrl}/>:<img src={previewUrl} className="max-h-56 w-full rounded-lg bg-[#edf4ff] object-contain" alt="Local creative preview, not uploaded"/>)}
    {error&&<p role="alert" className="rounded-lg bg-[#fff1f3] p-3 text-sm text-[#ab263a]">{error}</p>}
    <p className="flex items-start gap-2 rounded-lg bg-[#fff8eb] p-3 text-xs leading-5 text-[#795825]"><Info className="mt-0.5 size-4 shrink-0"/>Saving will retain only the creative title, format and placement. The image/video is never uploaded. Admin moderation and actual approval are not available in Part 11.</p>
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={checking}><CheckCircle2 className="size-4"/>Save metadata only</Button></div>
   </form>
  </Dialog>
  <Dialog open={!!deleteTarget} onOpenChange={open=>{if(!open)setDeleteTarget(null);}} title="Remove creative metadata?" description="This action removes an unlinked, pending demo record. No uploaded file exists." footer={<><Button variant="outline" onClick={()=>setDeleteTarget(null)}>Keep creative</Button><Button variant="destructive" onClick={deleteCreative}>Remove metadata</Button></>}>
   <p className="text-sm leading-6 text-muted-foreground">Remove {deleteTarget?.title} from this browser’s fictional library? Linked campaigns and reviewed creatives cannot be deleted.</p>
  </Dialog>
  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><Film className="size-4"/>Workflow integration: use an existing compatible creative in Step 3 of the campaign wizard. <ImageIcon className="size-4"/>Media delivery is not yet connected.</div>
 </main>;
}
