import type {Metadata} from "next";
import {BookOpen, Headphones, Search} from "lucide-react";
import {PageHero,Section,CTA} from "@/components/public/marketing-blocks";
import {HelpSearch} from "@/components/public/help-search";
export const metadata:Metadata={title:"Help Center | AdVibe Support & FAQs",description:"Browse AdVibe frequently asked questions, marketing guides, campaign processes, pricing and driver onboarding information."};
export default function Page(){return <>
 <PageHero eyebrow="Help Center" title="How Can We" accent="Help You?" description="Find practical answers, platform guides and resources for advertisers and driver partners."
 points={[{text:"Search FAQs",icon:Search},{text:"Guides & resources",icon:BookOpen},{text:"Enquiry support",icon:Headphones}]}/>
 <Section><HelpSearch/></Section>
 <CTA title="Have a Question or Need Personal Assistance?" text="Prepare a support enquiry using our public contact page." label="Contact Our Team" href="/contact"/>
 </>;}
