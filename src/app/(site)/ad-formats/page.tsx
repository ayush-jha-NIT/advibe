import type {Metadata} from "next";
import {BadgeCheck, MonitorPlay, Target} from "lucide-react";
import {PageHero,Section,Heading,CTA,Benefits} from "@/components/public/marketing-blocks";
import {FormatCatalogue} from "@/components/public/format-catalogue";
import {FAQList} from "@/components/public/faq-list";
import {publicFAQs} from "@/components/public/faq-data";
export const metadata:Metadata={title:"Ad Formats | Digital Vehicle Advertising",description:"Compare bike, auto-rickshaw and car advertising placements, screen formats, creative concepts and example specifications."};
export default function Page(){return <>
 <PageHero eyebrow="Advertising Formats" title="Your Brand on" accent="Every Vehicle" description="Choose a vehicle advertising placement that suits your campaign goals. Compare digital formats and discover the next steps for creative preparation."
  actions={[{label:"Estimate Your Campaign",href:"/pricing"},{label:"How It Works",href:"/for-advertisers",secondary:true}]}
  points={[{text:"Multiple vehicles",icon:MonitorPlay},{text:"Location targeting",icon:Target},{text:"Creative review",icon:BadgeCheck}]}/>
 <Section><Heading title="Explore Advertising Formats" description="Select a card to inspect the proposed creative placement. Actual hardware is subject to verification."/><FormatCatalogue/></Section>
 <Section muted><Heading title="Choosing the Right Format" description="Match visibility, placement and creative requirements to your objective."/><Benefits items={[
  {title:"Placement & Sightlines",text:"Consider whether drivers, passengers or following traffic will view the ad.",icon:Target},
  {title:"File Compatibility",text:"Prepare media in the format and aspect ratio specified by the selected device.",icon:MonitorPlay},
  {title:"Review & Compliance",text:"Ads must pass content policy checks before being scheduled for delivery.",icon:BadgeCheck},
  {title:"Measure Results",text:"Compare campaign reports once reliable delivery records are available.",icon:MonitorPlay}
 ]}/></Section>
 <Section><Heading title="Ad Format Questions" action={{label:"Help Center",href:"/help-center"}}/><FAQList items={publicFAQs.filter(x=>x.category==="Technical"||x.question.includes("types of vehicle"))}/></Section>
 <CTA title="Create a Campaign in the Right Format" text="Choose your placement, then plan creative content and screen targeting." label="Start Advertising" href="/signup?role=advertiser"/>
 </>;}
