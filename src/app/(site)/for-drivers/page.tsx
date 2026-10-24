import type {Metadata} from "next";
import {BadgeCheck, Clock3, IndianRupee, ShieldCheck} from "lucide-react";
import {Benefits,CTA,Heading,PageHero,Section,Steps,Requirements,driverBenefits,driverSteps} from "@/components/public/marketing-blocks";
import {DriverVehicleTabs} from "@/components/public/driver-vehicle-tabs";
import {FAQList} from "@/components/public/faq-list";
import {publicFAQs} from "@/components/public/faq-data";
export const metadata:Metadata={title:"Become an AdVibe Driver Partner",description:"Learn about the AdVibe driver partnership, supported vehicle formats, verification documents, screen installation and earnings process."};
export default function Page(){return <>
 <PageHero eyebrow="Become a Driver Partner" title="Earn More With" accent="Every Ride" description="Discover an additional earning opportunity by displaying approved advertisements on an eligible vehicle. The process covers registration, verification, screen installation and campaign assignment."
  actions={[{label:"Join as a Driver Partner",href:"/signup?role=driver"},{label:"How It Works",href:"#driver-steps",secondary:true}]}
  points={[{text:"Potential extra income",icon:IndianRupee},{text:"Assisted onboarding",icon:BadgeCheck},{text:"Flexible driving",icon:Clock3},{text:"Verified partner program",icon:ShieldCheck}]}/>
 <Section><Heading title="Why Partner with AdVibe?" description="Your usual journeys can become an advertising opportunity after successful onboarding."/><Benefits items={driverBenefits}/></Section>
 <Section muted><Heading title="Supported Vehicle Types" description="Select a vehicle type to explore possible screen placements and requirements."/><DriverVehicleTabs/></Section>
 <Section id="driver-steps"><Heading title="How to Get Started" description="Four high-level stages. The actual driver portal uses a five-step verification and onboarding flow."/><Steps items={driverSteps}/></Section>
 <Section muted><div className="grid gap-7 lg:grid-cols-2"><div><Heading title="Basic Requirements" description="Requirements may change with the final driver agreement and applicable regulations."/><div className="rounded-2xl border border-[#dae8f8] bg-white p-6"><Requirements/></div></div><div><Heading title="Driver Partner FAQs" action={{label:"View All FAQs",href:"/help-center"}}/><FAQList items={publicFAQs.filter(f=>f.category==="Drivers")}/></div></div></Section>
 <CTA title="Join the AdVibe Driver Community" text="Review the driver partner process and begin registration. Actual earnings and equipment terms depend on approval and the signed agreement." label="Become a Driver Partner" href="/signup?role=driver"/>
 </>;}
