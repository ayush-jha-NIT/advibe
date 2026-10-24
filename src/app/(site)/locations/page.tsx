import type {Metadata} from "next";
import {MapPin, MonitorPlay, Target} from "lucide-react";
import {PageHero,Section,Heading,CTA} from "@/components/public/marketing-blocks";
import {LocationSearch} from "@/components/public/location-search";
export const metadata:Metadata={title:"Locations & Coverage Explorer",description:"Explore concept cities and fictional sample screen locations for AdVibe campaign planning; live inventory is not provided."};
export default function Page(){return <>
 <PageHero eyebrow="Locations & Availability" title="Find Locations for" accent="Your Ads" description="Explore areas, screen placements and geographic campaign-planning concepts. Public inventory shown here is fictional demonstration data, not confirmed availability."
 points={[{text:"City selection",icon:MapPin},{text:"Zone targeting",icon:Target},{text:"Screen-format planning",icon:MonitorPlay}]}
 actions={[{label:"Plan a Campaign",href:"/signup?role=advertiser"}]}/>
 <Section><Heading title="Explore Cities, Areas & Screen Concepts" description="Search, filter and inspect illustrative location cards. Real coverage requires confirmation."/><LocationSearch/></Section>
 <CTA title="Reach People in the Right Places" text="Create an advertiser account to plan location-specific campaigns." label="Start Your Campaign" href="/signup?role=advertiser"/>
 </>;}
