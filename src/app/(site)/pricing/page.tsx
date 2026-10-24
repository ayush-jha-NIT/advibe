import type {Metadata} from "next";
import {BadgeCheck, IndianRupee, ShieldCheck} from "lucide-react";
import {PageHero,Section,Heading,CTA} from "@/components/public/marketing-blocks";
import {PricingPlanner} from "@/components/public/pricing-planner";
import {FAQList} from "@/components/public/faq-list";
import {publicFAQs} from "@/components/public/faq-data";
export const metadata:Metadata={title:"Advertising Pricing & Cost Calculator",description:"Explore AdVibe advertising placement prices with an illustrative calculator. Final rates and availability are subject to confirmed commercial terms."};
export default function Page(){return <>
 <PageHero eyebrow="Pricing & Campaign Planning" title="Transparent Pricing for" accent="Maximum Impact" description="Compare mobile outdoor advertising formats and explore indicative budgets. The calculator is an interactive example, not a binding quotation."
 points={[{text:"Clear assumptions",icon:ShieldCheck},{text:"Multiple placements",icon:BadgeCheck},{text:"Rupee estimates",icon:IndianRupee}]}/>
 <Section><PricingPlanner/></Section>
 <Section muted><Heading title="Frequently Asked Questions" description="Common questions about costs, campaigns and payments." action={{label:"View All FAQs",href:"/help-center"}}/><FAQList items={publicFAQs.filter(f=>f.category==="Payments"||f.question.includes("change or pause"))}/></Section>
 <CTA title="Plan Your Next Advertising Campaign" text="Use this example estimate to explore options. Your confirmed quote will depend on actual inventory and terms." label="Create Your Campaign" href="/signup?role=advertiser"/>
 </>;}
