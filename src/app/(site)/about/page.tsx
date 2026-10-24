import type {Metadata} from "next";
import {Eye, Handshake, HeartHandshake, Megaphone, ShieldCheck, Target, UsersRound, Wallet} from "lucide-react";
import {PageHero,Section,Heading,Benefits,Steps,CTA,advertiserSteps} from "@/components/public/marketing-blocks";
export const metadata:Metadata={title:"About AdVibe | Vision & Mission",description:"Learn about AdVibe's vision for connecting brands and driver partners through mobile outdoor advertising."};
export default function Page(){return <>
 <PageHero eyebrow="About AdVibe" title="Turning Commutes into" accent="Brand Experiences" description="AdVibe is designed to help brands communicate on everyday journeys while creating a new opportunity for verified vehicle partners."
 actions={[{label:"Our Story",href:"#our-story"},{label:"Explore Campaigns",href:"/for-advertisers",secondary:true}]}
 points={[{text:"Brands",icon:Megaphone},{text:"Driver partners",icon:UsersRound},{text:"Responsible advertising",icon:ShieldCheck}]}/>
 <Section id="our-story"><div className="grid gap-8 lg:grid-cols-[.95fr_1.05fr]"><div className="overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#08254e,#6f357a,#f58856)] p-5 sm:p-7"><div className="mx-auto grid aspect-[1.35] max-w-sm place-items-center rounded-xl border border-white/30 bg-[#071c3d]/40"><div className="text-center"><Megaphone className="mx-auto size-20 text-white"/><p className="mt-3 text-3xl font-black text-white">Ad<span className="text-brand-orange">Vibe</span></p><p className="mt-1 text-xs font-semibold tracking-widest text-[#e4eaff]">BRANDS ON THE MOVE</p></div></div></div>
  <div><Heading eyebrow="Our Story" title="Built for Streets. Designed for People."/><p className="text-sm leading-7 text-[#4b6080]">The AdVibe concept brings outdoor advertising onto vehicle-mounted displays. Advertisers can plan campaigns by format, location and duration, while driver partners can participate after verification and installation.</p>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
    {icon:Target,title:"Our Mission",text:"Make location-based outdoor advertising approachable for businesses."},
    {icon:Eye,title:"Our Vision",text:"Connect useful advertising to the places people move through."},
    {icon:Handshake,title:"Our Values",text:"Clarity, safety, responsible technology and transparency."}
   ].map(({icon:Icon,title,text})=><div key={title} className="rounded-xl border border-[#dce8f9] p-4"><Icon className="size-8 text-brand-blue"/><h3 className="mt-2 font-extrabold text-brand-navy">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>)}</div>
  </div></div></Section>
 <Section muted><Heading eyebrow="Why AdVibe" title="A Win for Every Side" description="The platform design serves three groups, with workflows tailored to each role."/><Benefits items={[
  {title:"For Brands",text:"More location-based formats and a guided campaign creation flow.",icon:Megaphone},
  {title:"For Drivers",text:"A potential additional income channel tied to verified campaigns.",icon:Wallet},
  {title:"For Communities",text:"A new way to see messages and local business offers during everyday journeys.",icon:UsersRound},
  {title:"For Trust",text:"Identity checks, creative approval and device monitoring form part of the product plan.",icon:HeartHandshake}
 ]}/></Section>
 <Section><Heading eyebrow="How It Works" title="From Brand to Real People in Four Steps"/><Steps items={advertiserSteps}/></Section>
 <CTA title="Building a More Connected Advertising Network" text="Explore AdVibe's advertiser and driver partner experiences and the opportunities they aim to create." label="Be Part of Our Journey" href="/signup"/>
 </>;}
