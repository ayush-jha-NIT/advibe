"use client";
import * as React from "react";
import Image from "next/image";
import {Check,ImageIcon,MapPin,MonitorPlay,UploadCloud,Video} from "lucide-react";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui";
import type {DemoDatabase,Placement} from "@/types/domain";
import {moneyINR} from "@/lib/demo-rules";
import {placementLabels,placements,suggestedScreens,weekdays,wizardQuote,type WizardDraft} from "./wizard-model";
import type {Quote} from "@/lib/demo-rules";

type Props={draft:WizardDraft;db:DemoDatabase;owner:string;patch:(value:Partial<WizardDraft>)=>void};
const input="min-h-11 w-full min-w-0 rounded-xl border border-[#ccdced] bg-white px-3.5 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#dbeaff]";
const field="mb-1.5 block text-sm font-semibold text-[#32496d]";
const options:{value:WizardDraft["objective"];label:string}[]=[
 {value:"awareness",label:"Brand awareness"},{value:"offer",label:"Promote an offer"},
 {value:"visits",label:"Increase visits"},{value:"event",label:"Announce an event"}
];
function FieldHelp({children}:{children:React.ReactNode}){return <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{children}</p>;}
export function StepBasics({draft,patch,owner,db}:Props){
 const business=db.accounts.find(a=>a.id===owner)?.business??"";
 return <div className="space-y-5">
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="sm:col-span-2"><span className={field}>Campaign name *</span><input className={input} required maxLength={120} value={draft.title} onChange={e=>patch({title:e.target.value})} placeholder="e.g. Diwali Brand Awareness"/></label>
   <label><span className={field}>Business / brand *</span><input className={input} maxLength={100} value={draft.business} onChange={e=>patch({business:e.target.value})} placeholder={business||"Your brand name"}/></label>
   <label><span className={field}>Industry *</span><select className={input} value={draft.industry} onChange={e=>patch({industry:e.target.value})}><option value="">Select industry</option>{["Food & Beverage","Fashion & Lifestyle","Retail","Technology","Education","Healthcare","Real Estate","Events","Other"].map(s=><option key={s}>{s}</option>)}</select></label>
   <label className="sm:col-span-2"><span className={field}>Primary objective *</span><select className={input} value={draft.objective} onChange={e=>patch({objective:e.target.value as WizardDraft["objective"]})}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
   <label className="sm:col-span-2"><span className={field}>Campaign description</span><textarea rows={4} maxLength={500} value={draft.description} onChange={e=>patch({description:e.target.value})} className={input+" resize-y py-3"} placeholder="Describe the campaign message, goal and relevant information"/><FieldHelp>{draft.description.length}/500 characters</FieldHelp></label>
  </div>
  <div className="rounded-xl border border-[#d7e6f8] bg-[#f0f6ff] px-4 py-3 text-sm leading-6 text-[#405b83]">Contact information is linked to the demo session only. No phone number, payment details or personal documents are collected or saved in this wizard.</div>
 </div>;
}
export function StepFormats({draft,patch,db}:Props){
 return <div className="space-y-4"><p className="text-sm text-muted-foreground">Select the physical placement. Creative file formats are chosen separately in Step 3.</p>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{placements.map(p=>{
   const count=db.screens.filter(s=>s.placement===p&&s.status==="online").length;
   const isChosen=draft.placement===p;
   return <button type="button" key={p} aria-pressed={isChosen} onClick={()=>patch({placement:p,creativeId:"",creativeTitle:"",selectedScreenIds:[],agreed:false})}
     className={"relative min-h-40 rounded-2xl border p-4 text-left transition hover:border-brand-blue "+(isChosen?"border-brand-blue bg-[#eef5ff] ring-1 ring-brand-blue":"border-[#dce8f8] bg-white")}>
     <div className="mb-3 grid size-11 place-items-center rounded-xl bg-[#dbeaff] text-brand-blue">{p==="helmet"?<ImageIcon className="size-6"/>:<MonitorPlay className="size-6"/>}</div>
     <strong className="block text-base text-brand-navy">{placementLabels[p]}</strong>
     <span className="mt-1 block text-xs leading-5 text-muted-foreground">{p==="helmet"?"Printed advertising concept":"Vehicle-mounted display concept"}</span>
     <span className="mt-3 block text-xs font-semibold text-brand-blue">{count?count+" sample screen(s) online":"No online sample screen"}</span>
     {isChosen&&<span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-brand-blue text-white"><Check className="size-4"/></span>}
    </button>;
  })}</div>
  <FieldHelp>These formats are illustrative. Selection does not imply availability, assignment or inventory reservation.</FieldHelp>
 </div>;
}
export function StepCreative({draft,patch,db,owner,upload,onUpload}:{draft:WizardDraft;patch:(p:Partial<WizardDraft>)=>void;db:DemoDatabase;owner:string;upload:File|null;onUpload:(file:File|null)=>void;}){
 const files=db.creatives.filter(c=>c.advertiserId===owner&&c.placement===draft.placement);
 const [uploadError,setUploadError]=React.useState("");
 const [url,setUrl]=React.useState<string|null>(null);
 React.useEffect(()=>{
  if(!upload)return;
  const object=URL.createObjectURL(upload);
  const frame=requestAnimationFrame(()=>setUrl(object));
  return ()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(object);};
 },[upload]);
 function select(file:File|null){
  setUploadError("");
  if(!file){onUpload(null);setUrl(null);return;}
  if(!["image/png","image/jpeg","image/gif","video/mp4"].includes(file.type)){setUploadError("Choose PNG, JPG, GIF or MP4");return;}
  if(file.size>10*1024*1024){setUploadError("Use a file no larger than 10 MB for the local preview");return;}
  onUpload(file);
  const format=file.type==="video/mp4"?"video":file.type==="image/gif"?"gif":"image";
  patch({creativeMode:"preview",creativeId:"",creativeTitle:"New "+(format==="video"?"video":format==="gif"?"GIF":"image")+" creative",creativeFormat:format,agreed:false});
 }
 return <div className="space-y-4">
  <div className="grid gap-3 sm:grid-cols-2">
   <button type="button" aria-pressed={draft.creativeMode==="existing"} onClick={()=>patch({creativeMode:"existing",creativeTitle:"",agreed:false})}
    className={"min-h-14 rounded-xl border px-4 text-left text-sm font-semibold "+(draft.creativeMode==="existing"?"border-brand-blue bg-[#edf5ff] text-brand-blue":"border-[#dbe6f5] bg-white")}>Choose saved creative</button>
   <button type="button" aria-pressed={draft.creativeMode==="preview"} onClick={()=>patch({creativeMode:"preview",creativeId:"",agreed:false})}
    className={"min-h-14 rounded-xl border px-4 text-left text-sm font-semibold "+(draft.creativeMode==="preview"?"border-brand-blue bg-[#edf5ff] text-brand-blue":"border-[#dbe6f5] bg-white")}>Preview a new creative</button>
  </div>
  {draft.creativeMode==="existing"?<div className="space-y-3">
    {files.length?files.map(file=><label key={file.id} className={"flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 "+(draft.creativeId===file.id?"border-brand-blue bg-[#f2f7ff]":"border-[#dce7f8]")}>
     <input type="radio" name="creative-id" checked={draft.creativeId===file.id} onChange={()=>patch({creativeId:file.id,agreed:false})} className="size-4 accent-[#0866ff]"/>
     <span className="grid size-10 place-items-center rounded-lg bg-[#e7f0ff] text-brand-blue">{file.format==="video"?<Video className="size-5"/>:<ImageIcon className="size-5"/>}</span>
     <span className="min-w-0 flex-1"><strong className="block break-words text-sm text-brand-navy">{file.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{file.format.toUpperCase()} · Creative {file.approval.replaceAll("_"," ")}</span></span>
    </label>):<div className="rounded-xl border border-dashed border-[#c9d9ef] p-5 text-sm text-muted-foreground">No saved creative matches this placement. Use the preview option to create a pending metadata record.</div>}
    <FieldHelp>The saved demo library has metadata only, not downloadable media files. An unapproved creative can be submitted for review, but cannot launch until approved.</FieldHelp>
  </div>:<div className="space-y-4">
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#a8c8f5] bg-[#f7faff] p-5 text-center hover:bg-[#eef6ff]">
     <UploadCloud className="size-8 text-brand-blue"/><strong className="text-sm text-brand-navy">Choose a local file to preview</strong>
     <span className="text-xs text-muted-foreground">PNG, JPG, GIF or MP4 · Max 10 MB · Never uploaded</span>
     <input type="file" accept="image/png,image/jpeg,image/gif,video/mp4" className="sr-only" onChange={e=>select(e.target.files?.[0]??null)}/>
    </label>
    {uploadError&&<p role="alert" className="text-sm text-[#bf2b41]">{uploadError}</p>}
    <label><span className={field}>Creative title *</span><input className={input} maxLength={100} value={draft.creativeTitle} onChange={e=>patch({creativeTitle:e.target.value})} placeholder="e.g. Festival campaign visual"/></label>
    <label><span className={field}>Creative type</span><select className={input} value={draft.creativeFormat} onChange={e=>patch({creativeFormat:e.target.value as WizardDraft["creativeFormat"]})}><option value="image">Image</option><option value="video">Video</option><option value="gif">GIF</option></select></label>
    {url&&upload&&(upload.type==="video/mp4"?<video className="max-h-60 w-full rounded-xl bg-black object-contain" controls src={url}/>:<Image src={url} width={660} height={380} unoptimized alt="Locally selected creative preview" className="max-h-60 w-full rounded-xl bg-[#eaf2fb] object-contain"/>)}
    <p className="rounded-xl bg-[#fff5e9] p-3 text-xs leading-6 text-[#835521]">Only creative title/type metadata is persisted for this demonstration. The media file is not uploaded or stored; after refreshing, the preview will disappear. Production upload and content checks are required before deployment.</p>
  </div>}
 </div>;
}
export function StepLocations({draft,patch,db}:Props){
 const [city,setCity]=React.useState("All cities");
 const [view,setView]=React.useState<"list"|"map">("list");
 const eligible=suggestedScreens(db,draft);
 const cities=["All cities",...new Set(eligible.map(s=>db.locations.find(l=>l.id===s.locationId)?.city).filter((x):x is string=>!!x))];
 const visible=eligible.filter(s=>city==="All cities"||db.locations.find(l=>l.id===s.locationId)?.city===city);
 function toggle(id:string){patch({selectedScreenIds:draft.selectedScreenIds.includes(id)?draft.selectedScreenIds.filter(v=>v!==id):[...draft.selectedScreenIds,id],agreed:false});}
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Choose provisional screens for your placement. Dates are validated in Step 5.</p><span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-bold text-brand-blue">{draft.selectedScreenIds.length} selected</span></div>
  <div className="flex flex-wrap items-end justify-between gap-3"><label className="min-w-[170px] flex-1 sm:max-w-64"><span className={field}>City</span><select className={input} value={city} onChange={e=>setCity(e.target.value)}>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
   <div className="flex gap-2"><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")} className={"min-h-11 rounded-lg border px-4 text-xs font-bold "+(view==="list"?"bg-brand-blue text-white":"bg-white text-brand-navy")}>List</button><button type="button" aria-pressed={view==="map"} onClick={()=>setView("map")} className={"min-h-11 rounded-lg border px-4 text-xs font-bold "+(view==="map"?"bg-brand-blue text-white":"bg-white text-brand-navy")}>Map</button></div></div>
  {view==="map"&&<div className="relative h-44 overflow-hidden rounded-2xl bg-[#e8f2eb]" aria-label="Schematic sample-zone map">
   <svg viewBox="0 0 560 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden><rect width="560" height="180" fill="#eaf2e5"/>{Array.from({length:9},(_,i)=><path key={i} d={"M"+(i*80-100)+" -10 L"+(i*80+100)+" 200"} stroke="#fff" strokeWidth={i%2?6:11}/>)}</svg>
   {visible.map((s,i)=><button type="button" key={s.id} onClick={()=>toggle(s.id)} aria-pressed={draft.selectedScreenIds.includes(s.id)}
    className={"absolute rounded-full border-2 border-white px-3 py-2 text-xs font-semibold text-white shadow "+(draft.selectedScreenIds.includes(s.id)?"bg-brand-orange":"bg-brand-blue")} style={{left:(18+i*27)+"%",top:(35+(i%2)*30)+"%"}}>{s.id}</button>)}
   <span className="absolute bottom-2 left-2 rounded bg-white/95 p-1.5 text-[10px] text-[#4d6b87]">Illustration only · Not live GPS</span>
  </div>}
  {visible.length?<div className="grid gap-3 sm:grid-cols-2">{visible.map(s=>{
   const loc=db.locations.find(l=>l.id===s.locationId);
   const checked=draft.selectedScreenIds.includes(s.id);
   return <button key={s.id} type="button" aria-pressed={checked} onClick={()=>toggle(s.id)} className={"flex min-h-28 items-start gap-3 rounded-xl border p-4 text-left "+(checked?"border-brand-blue bg-[#edf5ff] ring-1 ring-brand-blue":"border-[#dce8f8] bg-white")}>
    <span className={"grid size-8 shrink-0 place-items-center rounded-full border "+(checked?"border-brand-blue bg-brand-blue text-white":"border-[#b6c8e2]")}><Check className="size-4"/></span>
    <span><strong className="text-sm text-brand-navy">{loc?.name??"Sample zone"} · {loc?.city}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{s.id} · {placementLabels[s.placement]} · {s.sizeInches}&quot; display</span><span className="mt-2 inline-flex items-center gap-1 text-xs text-[#138652]"><MapPin className="size-3.5"/>Eligible sample device</span></span>
   </button>;
  })}</div>:<div className="rounded-xl border border-dashed border-[#d6e2f3] bg-[#f7faff] p-6 text-center"><MapPin className="mx-auto size-8 text-[#86a0c4]"/><p className="mt-2 font-semibold text-brand-navy">No eligible demo screens found</p><p className="mt-1 text-sm text-muted-foreground">Try a different placement in Step 2 or another city. Unverified and offline devices cannot be selected.</p></div>}
  <FieldHelp>Screen selection is a planning preference only. It does not reserve inventory or assign a driver.</FieldHelp>
 </div>;
}
export function StepSchedule({draft,patch}:Pick<Props,"draft"|"patch">){
 return <div className="space-y-5">
  <div className="grid gap-4 sm:grid-cols-2">
   <label><span className={field}>Start date *</span><input type="date" className={input} value={draft.startDate} max={draft.endDate||undefined} onChange={e=>patch({startDate:e.target.value,agreed:false})}/></label>
   <label><span className={field}>End date *</span><input type="date" className={input} value={draft.endDate} min={draft.startDate||undefined} onChange={e=>patch({endDate:e.target.value,agreed:false})}/></label>
  </div>
  <fieldset><legend className={field}>Delivery days *</legend><div className="flex flex-wrap gap-2">{weekdays.map((w,i)=><label key={w} className={"flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold "+(draft.weekdays.includes(i)?"border-brand-blue bg-[#eaf3ff] text-brand-blue":"border-[#d6e5f7] bg-white text-brand-navy")}>
   <input type="checkbox" checked={draft.weekdays.includes(i)} onChange={e=>patch({weekdays:e.target.checked?[...draft.weekdays,i].sort():draft.weekdays.filter(v=>v!==i),agreed:false})} className="size-4 accent-[#0866ff]"/>{w}
  </label>)}</div></fieldset>
  <div className="grid gap-4 sm:grid-cols-2">
   <label><span className={field}>Daily start *</span><input type="time" className={input} value={draft.startTime} onChange={e=>patch({startTime:e.target.value,agreed:false})}/></label>
   <label><span className={field}>Daily end *</span><input type="time" className={input} value={draft.endTime} onChange={e=>patch({endTime:e.target.value,agreed:false})}/></label>
  </div>
  <label className="block"><span className={field}>Requested plays per day</span><input type="number" min={1} max={500} step={1} className={input} value={draft.playsPerDay} onChange={e=>patch({playsPerDay:Number(e.target.value),agreed:false})}/><FieldHelp>This is a requested target, not a delivery guarantee. Demonstration pricing is per selected active screen-day.</FieldHelp></label>
  <div className="rounded-xl border border-[#d2e4f9] bg-[#f0f6ff] px-4 py-3 text-sm text-[#436087]">Date validation rechecks screen conflicts, pricing-rule validity and the selected days before allowing the final review.</div>
 </div>;
}
export function QuoteTable({quote,db}: {quote:Quote;db:DemoDatabase}){
 return <div className="overflow-x-auto rounded-xl border border-[#dce8f8]" role="region" tabIndex={0} aria-label="Campaign estimate breakdown">
  <table className="w-full min-w-[450px] text-left text-sm"><thead className="bg-[#eff5ff] text-[#405e86]"><tr><th className="p-3">Screen</th><th className="p-3">Active days</th><th className="p-3">Rate/day</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{quote.lines.map(line=><tr key={line.screenId} className="border-t border-[#e3ecfa]">
   <td className="p-3 font-semibold">{db.locations.find(l=>l.id===db.screens.find(s=>s.id===line.screenId)?.locationId)?.name??line.screenId}<span className="block text-xs font-normal text-muted-foreground">{line.screenId}</span></td>
   <td className="p-3">{line.days}</td><td className="p-3">{moneyINR(line.rateRupeesPerDay*100)}</td><td className="p-3 text-right font-semibold">{moneyINR(line.amountPaise)}</td>
  </tr>)}</tbody></table>
 </div>;
}
export function StepReview({draft,patch,db,owner}:Props){
 const quote=React.useMemo(()=>{
  try{return {value:wizardQuote(draft,db),error:""};}
  catch(e){return {value:null,error:e instanceof Error?e.message:"Quote unavailable"};}
 },[draft,db]);
 const ownCreative=db.creatives.find(c=>c.id===draft.creativeId&&c.advertiserId===owner);
 return <div className="space-y-5">
  <div className="grid gap-3 sm:grid-cols-2">{[
   ["Campaign",draft.title||"Not entered"],["Brand",draft.business||"Not entered"],
   ["Placement",draft.placement?placementLabels[draft.placement]:"Not selected"],
   ["Creative",draft.creativeMode==="existing"?ownCreative?.title??"Not selected":draft.creativeTitle||"Preview not selected"],
   ["Dates",draft.startDate&&draft.endDate?draft.startDate+" to "+draft.endDate:"Not selected"],
   ["Daily hours",draft.startTime+" – "+draft.endTime],
   ["Frequency",draft.playsPerDay+" requested plays/day"],["Demo screens",String(draft.selectedScreenIds.length)]
  ].map(([name,value])=><div className="rounded-xl bg-[#f4f8fe] p-3" key={name}><p className="text-xs text-muted-foreground">{name}</p><p className="mt-1 break-words text-sm font-semibold text-brand-navy">{value}</p></div>)}</div>
  {quote.value?<><QuoteTable quote={quote.value} db={db}/><div className="rounded-2xl bg-[linear-gradient(130deg,#061a3c,#08529b)] p-5 text-white"><p className="text-sm text-[#d1e4ff]">Indicative campaign total</p><p className="mt-1 text-3xl font-extrabold text-[#ff8534]">{moneyINR(quote.value.totalPaise)}</p>
   <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt>Subtotal</dt><dd>{moneyINR(quote.value.subtotalPaise)}</dd></div><div className="flex justify-between gap-2"><dt>Illustrative GST (18%)</dt><dd>{moneyINR(quote.value.taxPaise)}</dd></div></dl></div>
  </>:<p role="alert" className="rounded-xl border border-[#ffd8bd] bg-[#fff6ed] p-4 text-sm text-[#955119]">Quote unavailable: {quote.error}. Check your previous steps.</p>}
  <label><span className={field}>Optional maximum budget (₹)</span><input type="number" min={1} step="0.01" className={input} value={draft.budgetCapRupees} onChange={e=>patch({budgetCapRupees:e.target.value,agreed:false})} placeholder="Leave blank if no limit"/><FieldHelp>Submission is blocked if this example estimate exceeds your limit.</FieldHelp></label>
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d5e6f9] bg-[#f2f7ff] p-4 text-sm leading-6 text-[#395476]"><input type="checkbox" checked={draft.agreed} onChange={e=>patch({agreed:e.target.checked})} className="mt-1 size-5 shrink-0 accent-[#0866ff]"/>I understand this is a fictional frontend estimate. Submitting sends the demo campaign to Admin review only. It will not charge Cashfree, reserve screens, send my file, or launch advertising.</label>
 </div>;
}
