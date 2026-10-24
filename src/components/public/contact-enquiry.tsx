"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, CheckCircle2, Mail, MapPin, Send} from "lucide-react";
import {FAQList} from "./faq-list";
import {publicFAQs} from "./faq-data";
const officeOptions=["Delhi","Mumbai","Bengaluru","Hyderabad","Prayagraj"];
const subjects=["Campaign enquiry","Driver partnership","Screen availability","Pricing request","Technical support","Other"];
export function ContactEnquiry(){
 const [selectedCity,setSelectedCity]=React.useState("Delhi");
 const [feedback,setFeedback]=React.useState("");
 const [message,setMessage]=React.useState("");
 function handleSubmit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const name=String(data.get("name")??"").trim(),email=String(data.get("email")??"").trim(),
   phone=String(data.get("phone")??"").trim(),role=String(data.get("role")??""),
   subject=String(data.get("subject")??"");
  if(!name||!email||!/^\d{10}$/.test(phone)||!subject||!message.trim()){setFeedback("Complete the required fields. Phone number must have 10 digits.");return;}
  const body=["Name: "+name,"Email: "+email,"Phone: +91 "+phone,"Type: "+role,"",message].join("\n");
  setFeedback("Your email application will open with this enquiry. Send it there to complete the request; nothing has been submitted from this website.");
  window.location.href="mailto:support@advibe.in?subject="+encodeURIComponent("[AdVibe] "+subject)+"&body="+encodeURIComponent(body);
 }
 return <div className="space-y-10">
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   {[
    {title:"Email Us",value:"support@advibe.in",description:"Address shown in client UI reference",href:"mailto:support@advibe.in",icon:Mail},
    {title:"Request a Callback",value:"Prepare an enquiry",description:"Use the form to request contact",href:"#enquiry",icon:Send},
    {title:"Help Center",value:"Browse FAQs",description:"Questions about the platform",href:"/help-center",icon:CheckCircle2},
    {title:"Locations",value:"Explore Cities",description:"Preview example locations",href:"/locations",icon:MapPin}
   ].map(({title,value,description,href,icon:Icon})=><Link key={title} href={href} className="rounded-xl border border-[#dbe8f9] bg-white p-5 shadow-sm hover:border-brand-blue"><Icon className="size-9 text-brand-blue"/><h2 className="mt-3 font-extrabold text-brand-navy">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p><span className="mt-3 inline-flex min-h-9 items-center gap-1.5 break-all text-sm font-bold text-brand-blue">{value} <ArrowRight className="size-4 shrink-0"/></span></Link>)}
  </div>
  <div className="grid gap-5 lg:grid-cols-2">
   <form id="enquiry" onSubmit={handleSubmit} className="rounded-2xl border border-[#dce9f8] bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-2xl font-extrabold text-brand-navy">Send Us a Message</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Fill the details below to prepare an enquiry using your email application.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Full name *<input name="name" autoComplete="name" required maxLength={100} className="min-h-11 rounded-lg border border-[#cadcf5] px-3 text-sm" placeholder="Enter your name"/></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Email address *<input name="email" type="email" autoComplete="email" required maxLength={254} className="min-h-11 rounded-lg border border-[#cadcf5] px-3 text-sm" placeholder="Enter your email"/></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">Phone number *<div className="flex min-h-11 items-center rounded-lg border border-[#cadcf5]"><span className="border-r border-[#cadcf5] px-3 text-xs">+91</span><input name="phone" inputMode="numeric" pattern="[0-9]{10}" title="Enter a 10-digit Indian number" required maxLength={10} className="w-full min-w-0 px-3 text-sm outline-none" placeholder="10-digit phone"/></div></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy">I am *<select name="role" required className="min-h-11 rounded-lg border border-[#cadcf5] bg-white px-3 text-sm"><option>Advertiser / Business</option><option>Driver Partner</option><option>Other Enquirer</option></select></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy sm:col-span-2">Subject *<select name="subject" required defaultValue="" className="min-h-11 rounded-lg border border-[#cadcf5] bg-white px-3 text-sm"><option value="" disabled>Choose a subject</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label>
     <label className="grid gap-2 text-sm font-semibold text-brand-navy sm:col-span-2">Message *<textarea required rows={5} minLength={10} maxLength={500} value={message} onChange={e=>setMessage(e.target.value)} className="w-full resize-y rounded-lg border border-[#cadcf5] p-3 text-sm" placeholder="Tell us how we can help"/></label>
    </div>
    <p className="mt-2 text-right text-xs text-muted-foreground">{message.length}/500</p>
    <button type="submit" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-5 text-sm font-bold text-white hover:bg-[#e95e00]"><Send className="size-4"/> Prepare Email <ArrowRight className="size-4"/></button>
    {feedback&&<p role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#eaf4ff] p-3 text-sm leading-6 text-[#254875]">{feedback}</p>}
    <p className="mt-3 text-xs leading-5 text-muted-foreground">No message is stored or sent by AdVibe from this form. Confirm the support email address with the operator before production deployment.</p>
   </form>
   <div className="rounded-2xl border border-[#dce9f8] bg-white p-5 sm:p-6">
    <h2 className="text-2xl font-extrabold text-brand-navy">City & Coverage Enquiries</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Select a city to plan your enquiry. The reference designs list these cities, but actual offices and operating locations are not verified.</p>
    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Select enquiry city">{officeOptions.map(c=><button key={c} onClick={()=>setSelectedCity(c)} aria-pressed={selectedCity===c} className={"min-h-10 rounded-full border px-4 text-xs font-bold "+(selectedCity===c?"border-brand-blue bg-brand-blue text-white":"border-[#d9e7fa] bg-white text-brand-navy")}>{c}</button>)}</div>
    <div className="relative mt-5 min-h-[260px] overflow-hidden rounded-xl bg-[#e7f2e9]"><svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true"><rect width="600" height="320" fill="#ecf4e7"/><path d="M-30 220 Q240 30 630 260" fill="none" stroke="#acd9f7" strokeWidth="55"/>{Array.from({length:10},(_,i)=><path key={i} d={"M"+(i*75-60)+" 0 "+(i*75+40)+" 320"} stroke="white" strokeWidth="6"/>)}</svg><div className="absolute inset-0 grid place-items-center"><div className="rounded-xl border border-white bg-white/95 px-6 py-4 text-center shadow-lg"><MapPin className="mx-auto size-8 text-brand-blue"/><p className="mt-1 text-lg font-extrabold text-brand-navy">{selectedCity}</p><p className="text-xs text-muted-foreground">Illustrative city view · not a mapped office</p></div></div></div>
    <div className="mt-4 rounded-lg border border-[#d6e4f7] bg-[#f3f8ff] p-4 text-sm leading-6 text-[#405779]">To request verified office details, service coverage or installation options in {selectedCity}, use the enquiry form.</div>
   </div>
  </div>
  <div><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-extrabold text-brand-navy">Common Questions</h2><Link href="/help-center" className="text-sm font-bold text-brand-blue hover:underline">View all FAQs →</Link></div><FAQList items={publicFAQs.slice(1,7)}/></div>
 </div>;
}
