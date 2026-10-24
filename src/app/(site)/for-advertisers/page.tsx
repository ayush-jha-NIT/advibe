import type {Metadata} from "next";
import {BarChart3, MapPinned, MonitorPlay, ShieldCheck} from "lucide-react";
import {Benefits,CTA,FormatsGrid,Heading,PageHero,Section,Steps,advertiserBenefits,advertiserSteps} from "@/components/public/marketing-blocks";
import {CoverageExplorer} from "@/components/landing/coverage-explorer";
import {FAQList} from "@/components/public/faq-list";
import {publicFAQs} from "@/components/public/faq-data";
export const metadata:Metadata={title:"For Advertisers | Vehicle Screen Campaigns",description:"Explore vehicle-mounted outdoor advertising formats, location-based campaign planning and advertiser onboarding with AdVibe."};
export default function Page(){return <>
 <PageHero eyebrow="For Advertisers" title="Take Your Brand On" accent="Every Ride" description="Reach audiences on everyday routes with campaigns designed for bikes, auto rickshaws and cars. Explore formats, plan locations and prepare creative content."
  actions={[{label:"Create Your Campaign",href:"/signup?role=advertiser"},{label:"View Ad Formats",href:"/ad-formats",secondary:true}]}
  points={[{text:"Location-first planning",icon:MapPinned},{text:"Multiple placements",icon:MonitorPlay},{text:"Performance reporting",icon:BarChart3},{text:"Creative review",icon:ShieldCheck}]}/>
 <Section><Heading title="Why Advertise on Vehicle Screens?" description="Make outdoor advertising part of the daily city journey."/><Benefits items={advertiserBenefits}/></Section>
 <Section muted><Heading title="Our Ad Formats" description="Pick a screen format that fits your creative and audience." action={{label:"Compare Formats",href:"/ad-formats"}}/><FormatsGrid/></Section>
 <CoverageExplorer/>
 <Section><Heading title="From Brand to Real People in Four Steps" description="One guided campaign workflow from setup to delivery."/><Steps items={advertiserSteps}/></Section>
 <Section muted><Heading title="Frequently Asked Questions" action={{label:"All FAQs",href:"/help-center"}}/><div className="grid gap-5 lg:grid-cols-2"><FAQList items={publicFAQs.filter(f=>f.category==="Advertisers"||f.category==="Payments")}/><div className="rounded-2xl bg-[linear-gradient(140deg,#061a3d,#1763a4)] p-7 text-white"><h3 className="text-2xl font-extrabold">Plan before you publish</h3><p className="mt-3 text-sm leading-7 text-[#e3ebfa]">Choose compatible formats and locations, prepare a compliant creative and understand the booking process before making a commitment.</p><div className="mt-5 rounded-xl border border-white/25 bg-white/10 p-4 text-sm">No live campaign inventory or payment is performed on this public page.</div></div></div></Section>
 <CTA title="Ready to Take Your Brand on the Move?" text="Explore campaign options and prepare your first AdVibe advertiser account." label="Create Your Campaign" href="/signup?role=advertiser"/>
 </>;}
