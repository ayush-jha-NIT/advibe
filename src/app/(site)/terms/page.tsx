import type {Metadata} from "next";
import Link from "next/link";
import {FileCheck2,Info} from "lucide-react";
export const metadata:Metadata={title:"Terms & Conditions | Legal Review Pending",description:"AdVibe public frontend terms information preview pending commercial and legal approval."};
export default function Page(){return <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6"><span className="inline-flex items-center gap-2 rounded-full bg-[#fff1e6] px-4 py-2 text-sm font-semibold text-[#9a4d00]"><Info className="size-4"/> Legal approval pending</span>
 <h1 className="mt-5 text-3xl font-black text-brand-navy sm:text-4xl">Terms & Conditions</h1>
 <p className="mt-4 text-base leading-7 text-muted-foreground">Final advertiser and driver partner terms have not yet been supplied or approved. This page is a frontend preview, not an operative agreement or an offer of guaranteed availability, revenue or earnings.</p>
 <div className="mt-8 space-y-5 rounded-2xl border border-[#dce8f8] bg-white p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><FileCheck2 className="size-6 text-brand-blue"/> Commercial terms awaiting confirmation</h2>
 <p className="text-sm leading-7 text-[#435b7f]">Before production, the platform needs approved conditions for campaign bookings and cancellation, content approval, pricing and taxes, installation, partner participation, settlements, support and disputes.</p>
 <p className="text-sm leading-7 text-[#435b7f]">Public pricing and location tools contain demonstration assumptions. Account creation and Cashfree payment processing are not active in this frontend phase.</p></div>
 <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center font-bold text-brand-blue hover:underline">Contact about terms →</Link></div>;}
