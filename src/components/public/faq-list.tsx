"use client";
import * as React from "react";
import {ChevronDown} from "lucide-react";
import {publicFAQs,type PublicFAQ} from "./faq-data";
export function FAQList({items=publicFAQs}:{items?:PublicFAQ[]}){
 return <div className="space-y-2">{items.map((faq,i)=><details key={faq.question} className="group rounded-xl border border-[#dce8fa] bg-white px-4 py-3 shadow-sm">
  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-semibold text-brand-navy marker:content-none"><span className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e7f0ff] text-xs text-brand-blue">{i+1}</span>{faq.question}</span><ChevronDown className="size-4 shrink-0 text-brand-blue transition-transform group-open:rotate-180" aria-hidden/></summary>
  <p className="pl-9 pr-5 pt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
 </details>)}</div>;
}
