import type {Metadata} from "next";
import Link from "next/link";
import {FileText,Info,Mail} from "lucide-react";
export const metadata:Metadata={title:"Privacy Notice | Legal Review Pending",description:"AdVibe public frontend privacy information preview. Final legal policy awaits approval."};
export default function Page(){return <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6"><span className="inline-flex items-center gap-2 rounded-full bg-[#fff1e6] px-4 py-2 text-sm font-semibold text-[#9a4d00]"><Info className="size-4"/> Legal approval pending</span>
 <h1 className="mt-5 text-3xl font-black text-brand-navy sm:text-4xl">Privacy Notice</h1>
 <p className="mt-4 text-base leading-7 text-muted-foreground">This page is an informational preview for the AdVibe frontend. It is not the organization’s final privacy policy. Legal review and verified operating details are required before real customer, driver or payment data is collected.</p>
 <div className="mt-8 space-y-5 rounded-2xl border border-[#dce8f8] bg-white p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><FileText className="size-6 text-brand-blue"/> Current frontend demonstration</h2>
 <p className="text-sm leading-7 text-[#435b7f]">Public pages use illustrative content. The Part 3 dashboards use fictional records persisted in browser storage. The contact form prepares a message in the visitor’s email application, without submitting it to an AdVibe server.</p>
 <p className="text-sm leading-7 text-[#435b7f]">Account registration, KYC, payments, analytics, cookies, data retention, sharing and user rights require a separate legally reviewed policy based on production practices.</p></div>
 <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-brand-blue hover:underline"><Mail className="size-4"/> Contact regarding privacy</Link></div>;}
