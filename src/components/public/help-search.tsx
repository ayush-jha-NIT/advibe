"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight, BookOpen, CircleHelp, Headphones, MapPin, Megaphone, Search, Wallet, Wrench} from "lucide-react";
import {FAQList} from "./faq-list";
import {publicFAQs} from "./faq-data";
const categories=["All Topics","General","Advertisers","Drivers","Payments","Technical"] as const;
const resources=[
 {label:"Create an Advertising Campaign",href:"/for-advertisers",icon:Megaphone,description:"How campaigns are planned"},
 {label:"Select Locations",href:"/locations",icon:MapPin,description:"Explore example cities and areas"},
 {label:"Driver Registration",href:"/for-drivers",icon:Wrench,description:"Understand driver onboarding"},
 {label:"Pricing Calculator",href:"/pricing",icon:Wallet,description:"Explore indicative costs"},
 {label:"Ad Format Guide",href:"/ad-formats",icon:BookOpen,description:"Review formats and specs"},
 {label:"Contact Us",href:"/contact",icon:Headphones,description:"Prepare a support enquiry"},
];
export function HelpSearch(){
 const [text,setText]=React.useState("");
 const [category,setCategory]=React.useState<(typeof categories)[number]>("All Topics");
 const filtered=publicFAQs.filter(x=>(category==="All Topics"||x.category===category)&&(!text.trim()||(x.question+" "+x.answer+" "+x.category).toLowerCase().includes(text.toLowerCase())));
 return <div className="space-y-6">
  <div className="rounded-2xl border border-[#d6e6fc] bg-[linear-gradient(120deg,#e6f1ff,#ffffff)] p-5 sm:p-7">
   <h2 className="text-2xl font-extrabold text-brand-navy">How can we help you today?</h2><p className="mt-2 text-sm text-muted-foreground">Find answers to campaign, payment and driver partner questions.</p>
   <label className="mt-5 flex min-h-12 items-center gap-3 rounded-xl border border-[#b5cff2] bg-white px-4"><Search className="size-5 text-brand-blue" aria-hidden/><span className="sr-only">Search help articles</span><input type="search" value={text} onChange={e=>setText(e.target.value)} placeholder="Search for a question, topic or keyword" className="w-full min-w-0 bg-transparent text-sm text-brand-navy outline-none"/></label>
   <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="text-muted-foreground">Popular:</span>{["campaign","driver","pricing","creative"].map(term=><button type="button" onClick={()=>setText(term)} key={term} className="min-h-9 rounded-full border border-[#d2e3fb] bg-white px-3 font-medium text-brand-blue hover:border-brand-blue">{term}</button>)}</div>
  </div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(250px,.7fr)]">
   <div><div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Help categories">{categories.map(cat=><button key={cat} aria-pressed={category===cat} onClick={()=>setCategory(cat)} className={"min-h-11 rounded-lg border px-3 text-sm font-semibold "+(category===cat?"border-brand-blue bg-brand-blue text-white":"border-[#d3e3f6] bg-white text-brand-navy hover:border-brand-blue")}>{cat}</button>)}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold text-brand-navy">Frequently Asked Questions</h2><span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length===1?"":"s"}</span></div>
    <div className="mt-4">{filtered.length?<FAQList items={filtered}/>:<div className="rounded-xl border border-[#dce8fa] bg-white p-6 text-sm text-muted-foreground">No matching questions. Change the search term or category.</div>}</div>
    <div className="mt-8"><h2 className="text-xl font-extrabold text-brand-navy">Popular Guides & Resources</h2><p className="mt-1 text-sm text-muted-foreground">Guides lead to existing public sections, not fictional downloadable videos.</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">{resources.map(({label,href,icon:Icon,description})=><Link key={href} href={href} className="flex min-h-20 items-center gap-3 rounded-xl border border-[#dae6f6] bg-white p-3 hover:border-brand-blue hover:bg-[#f1f7ff]"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-brand-blue"><Icon className="size-5"/></span><span className="text-sm font-bold text-brand-navy">{label}<span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span></span><ArrowRight className="ml-auto size-4 shrink-0 text-brand-blue"/></Link>)}</div>
    </div>
   </div>
   <aside className="space-y-4"><div className="rounded-xl border border-[#dce8f8] bg-[#edf5ff] p-5"><CircleHelp className="size-9 text-brand-blue"/><h2 className="mt-3 text-lg font-extrabold text-brand-navy">Still Need Help?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">For account, campaign or onboarding questions, prepare a support enquiry.</p><Link href="/contact" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 text-sm font-bold text-white hover:bg-[#e95e00]">Contact Support <ArrowRight className="size-4"/></Link></div>
    <div className="rounded-xl border border-[#dce8f8] bg-white p-5"><h3 className="font-extrabold text-brand-navy">Advertiser Support</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Campaign creation, creative review and pricing questions.</p><Link className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-brand-blue" href="/for-advertisers">Explore advertiser guide <ArrowRight className="size-4"/></Link></div>
    <div className="rounded-xl border border-[#dce8f8] bg-white p-5"><h3 className="font-extrabold text-brand-navy">Driver Support</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Onboarding, verification, vehicle and screen information.</p><Link className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-brand-blue" href="/for-drivers">Explore driver guide <ArrowRight className="size-4"/></Link></div>
   </aside>
  </div>
 </div>;
}
