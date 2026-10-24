import type {Metadata} from "next";
import {Headphones, Mail, ShieldCheck} from "lucide-react";
import {PageHero,Section,CTA} from "@/components/public/marketing-blocks";
import {ContactEnquiry} from "@/components/public/contact-enquiry";
export const metadata:Metadata={title:"Contact AdVibe | Enquiries & Support",description:"Prepare an enquiry about AdVibe advertiser campaigns, driver partnerships and screen locations using a contact form."};
export default function Page(){return <>
 <PageHero eyebrow="Contact Us" title="Let's Create" accent="Bigger Impact Together" description="Questions about advertising, driver partnerships or the AdVibe platform? Browse our contact resources or prepare an email enquiry."
 points={[{text:"General enquiries",icon:Mail},{text:"Support resources",icon:Headphones},{text:"Responsible process",icon:ShieldCheck}]}/>
 <Section><ContactEnquiry/></Section>
 <CTA title="Still Have Questions?" text="Find help articles, onboarding information and platform FAQs." label="Visit Help Center" href="/help-center"/>
 </>;}
