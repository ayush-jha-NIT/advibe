import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, Check, MapPinned, Megaphone, CarFront,
 MonitorPlay, Target, MapPin, TrendingUp, ShieldCheck, UsersRound,
 UploadCloud, BarChart3, CalendarDays, CheckCircle2, Sparkles} from "lucide-react";
import {HeroScene} from "@/components/landing/hero-scene";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import {CoverageExplorer} from "@/components/landing/coverage-explorer";
import type {Placement} from "@/types/domain";

export const metadata:Metadata={
 title:"Outdoor & Mobile Advertising on Every Journey",
 description:"Explore AdVibe vehicle-screen advertising for brands and an earning opportunity for driver partners. Choose locations, ad formats and launch targeted campaigns.",
 openGraph:{title:"AdVibe | Your Brand. Their Journey. Everywhere.",description:"Mobile outdoor advertising for brands and driver partners across everyday journeys.",type:"website"},
};

const adFormats:{
 title:string;type:Placement;description:string;detail:string;color:string;
}[]=[
 {title:"Bike Mounted LED Screens",type:"bike_rear",description:"High-visibility advertising on daily routes.",detail:"Compact mobile reach",color:"text-brand-blue"},
 {title:"Car Interior LED Screens",type:"car_interior",description:"Reach people during their journeys.",detail:"In-vehicle audience",color:"text-[#7954e8]"},
 {title:"Auto Rickshaw Screens",type:"auto_rear",description:"Neighborhood visibility on busy streets.",detail:"Hyperlocal targeting",color:"text-[#08a866]"},
 {title:"Helmet Advertising",type:"helmet",description:"A distinctive option for brand awareness.",detail:"Creative brand visibility",color:"text-brand-blue"},
];
const steps=[
 {title:"Create Account",subtitle:"Sign up as an advertiser and set up your brand.",icon:UsersRound},
 {title:"Upload Your Ad",subtitle:"Prepare campaign visuals that meet screen specifications.",icon:UploadCloud},
 {title:"Select Locations & Screens",subtitle:"Choose your preferred cities, areas and placements.",icon:MapPin},
 {title:"Launch & Track",subtitle:"Submit for review and monitor campaign performance.",icon:BarChart3},
];
const heroAdvantages=[
 {label:"Location-focused",sub:"City & area selection",icon:MapPinned},
 {label:"Multiple formats",sub:"Bike, auto and car",icon:MonitorPlay},
 {label:"Campaign insights",sub:"Review performance",icon:TrendingUp},
 {label:"Clear planning",sub:"Transparent estimates",icon:ShieldCheck},
];
const visualPill="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-[transform,background-color,border-color] hover:-translate-y-0.5";
const orangeCTA=visualPill+" bg-brand-orange text-brand-navy shadow-[0_9px_22px_#ff6a0033] hover:bg-[#e95d00]";

export default function HomePage(){
 return <>
  <section className="relative isolate overflow-hidden bg-[#03172f] text-white" aria-labelledby="hero-title">
   <div className="advibe-hero-sky absolute inset-0" aria-hidden="true">
    <HeroScene className="absolute inset-0 size-full"/>
   </div>
   <div className="advibe-hero-shade absolute inset-0 pointer-events-none" aria-hidden="true"/>
   <div className="relative mx-auto flex min-h-[710px] max-w-[1560px] items-start px-4 pb-[320px] pt-12 sm:px-6 sm:pb-[310px] md:min-h-[555px] md:items-center md:pb-[100px] md:pt-14 lg:min-h-[590px] lg:px-10">
    <div className="max-w-[700px]">
     <p className="text-xs font-bold uppercase tracking-[.17em] text-[#d8e9ff] sm:text-sm">Integrated outdoor & mobile advertising</p>
     <h1 id="hero-title" className="mt-3 max-w-[680px] text-[clamp(2.3rem,5.1vw,4.45rem)] font-extrabold leading-[1.08] tracking-[-.04em]">
       Your Brand. <span className="text-brand-orange">Their Journey.</span> Everywhere.
     </h1>
     <p className="mt-5 max-w-[520px] text-sm leading-7 text-[#e3edf9] sm:text-base md:text-lg">Put your brand on the move with digital screens on everyday vehicles. Choose locations and formats, plan campaigns, and track your impact in one place.</p>
     <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:flex-wrap">
      <Link href="/signup?role=advertiser" className={orangeCTA}>Start Advertising <ArrowRight className="size-4" aria-hidden/></Link>
      <Link href="/signup?role=driver" className={visualPill+" border border-white/65 bg-[#041f43bb] text-white hover:bg-white/15"}>Become a Driver Partner <ArrowRight className="size-4" aria-hidden/></Link>
     </div>
     <div className="mt-8 grid max-w-[570px] grid-cols-2 gap-3 sm:grid-cols-4">
      {heroAdvantages.map(({icon:Icon,label,sub})=><div key={label} className="flex items-start gap-2">
       <Icon className="mt-0.5 size-5 shrink-0 text-[#35aaff]" aria-hidden/><span><span className="block text-[11px] font-bold text-white">{label}</span><span className="mt-0.5 block text-[10px] leading-4 text-[#d1e3f8]">{sub}</span></span>
      </div>)}
     </div>
    </div>
   </div>
   <div className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs font-medium text-[#d5e5fb] md:flex" aria-hidden="true">
    <span className="advibe-loop-indicator size-1.5 rounded-full bg-brand-orange"/> Cinematic city · Vehicle screens · Connected locations
   </div>
  </section>

  <section aria-labelledby="capabilities-title" className="relative z-10 bg-white pb-3 pt-5 sm:pb-6">
   <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <h2 id="capabilities-title" className="sr-only">AdVibe platform capabilities</h2>
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-2xl border border-[#e3ecf7] bg-[linear-gradient(120deg,#f0f7ff,#ffffff)] px-4 py-6 shadow-[0_8px_24px_#0b3e7310] sm:grid-cols-3 lg:grid-cols-5 lg:px-6">
     {[
      {icon:UsersRound,value:"Two-sided",label:"Advertiser & driver platform",color:"text-[#ff6a00]"},
      {icon:MonitorPlay,value:"Flexible",label:"Screen format choices",color:"text-brand-blue"},
      {icon:MapPinned,value:"Location-led",label:"Campaign planning",color:"text-[#11a96b]"},
      {icon:TrendingUp,value:"Trackable",label:"Performance insights",color:"text-[#7a36f3]"},
      {icon:ShieldCheck,value:"Review-first",label:"Creative approval process",color:"text-[#f6a300]"},
     ].map(({icon:Icon,value,label,color})=><div key={label} className="flex items-center gap-2.5 border-r-0 lg:border-r lg:border-[#dbe8f6] last:border-r-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white sm:size-12"><Icon className={"size-5 sm:size-6 "+color} aria-hidden/></div>
      <div><p className="text-[15px] font-extrabold tracking-tight text-brand-navy sm:text-base">{value}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{label}</p></div>
     </div>)}
    </div>
   </div>
  </section>

  <section aria-labelledby="choose-goal" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
   <div className="text-center"><h2 id="choose-goal" className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Choose Your Goal</h2>
    <p className="mt-2 text-sm text-muted-foreground sm:text-base">Whether you want to promote your business or earn by displaying ads, there’s a place for you.</p>
   </div>
   <div className="mt-7 grid gap-4 lg:grid-cols-2">
    <Link href="/for-advertisers" className="group relative isolate min-h-[264px] overflow-hidden rounded-2xl border border-[#dbe9fb] bg-[linear-gradient(120deg,#eaf3ff,#dceafb)] p-6 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg sm:p-7">
     <div className="relative z-10 max-w-[70%] sm:max-w-[65%]">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-blue text-white"><Megaphone className="size-6" aria-hidden/></span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-brand-blue">For businesses</p>
      <h3 className="mt-1 text-xl font-extrabold text-brand-navy sm:text-2xl">I’m an Advertiser</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-[#304b70] sm:text-sm">
       {["Promote a brand, offer or event","Choose formats, places and duration","Review campaign progress"].map(item=><li key={item} className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-blue" aria-hidden/>{item}</li>)}
      </ul>
     </div>
     <div className="advibe-goal-art pointer-events-none absolute -bottom-4 -right-14 w-[53%] max-w-[320px] rotate-[-8deg] overflow-hidden rounded-2xl border-[6px] border-[#09214b] bg-brand-navy shadow-2xl transition-transform group-hover:rotate-[-3deg] sm:right-[-18px]" aria-hidden>
      <div className="h-5 bg-[#112f5c]"/><div className="grid grid-cols-3 gap-1 p-3">
       <div className="col-span-3 h-9 rounded bg-[#153e81]"/><div className="col-span-2 h-20 rounded bg-[#1c6cff]"/><div className="h-20 rounded bg-[#f56b49]"/><div className="col-span-3 h-8 rounded bg-[#322188]"/>
      </div>
     </div>
     <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-brand-blue shadow-sm transition-transform group-hover:translate-x-1"><ArrowRight className="size-5" aria-hidden/></span>
    </Link>
    <Link href="/for-drivers" className="group relative isolate min-h-[264px] overflow-hidden rounded-2xl border border-[#d8f2e4] bg-[linear-gradient(120deg,#e8f8f1,#daefeb)] p-6 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg sm:p-7">
     <div className="relative z-10 max-w-[70%] sm:max-w-[65%]">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#0bb772] text-white"><CarFront className="size-6" aria-hidden/></span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#168b5e]">For drivers</p>
      <h3 className="mt-1 text-xl font-extrabold text-brand-navy sm:text-2xl">I’m a Driver Partner</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-[#304b70] sm:text-sm">
       {["Explore an additional earning opportunity","Display advertisements on your vehicle","Manage assignments and payouts"].map(item=><li key={item} className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-[#13aa69]" aria-hidden/>{item}</li>)}
      </ul>
     </div>
     <div className="advibe-goal-art pointer-events-none absolute -bottom-5 -right-14 w-[62%] max-w-[300px] opacity-90 sm:-right-8" aria-hidden>
      <FormatPreviewArt type="auto_rear"/>
     </div>
     <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-[#0aa869] shadow-sm transition-transform group-hover:translate-x-1"><ArrowRight className="size-5" aria-hidden/></span>
    </Link>
   </div>
  </section>

  <section id="formats" aria-labelledby="formats-heading" className="bg-[#f7fbff] py-12 sm:py-15">
   <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
     <div><h2 id="formats-heading" className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Our Ad Formats</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Choose from vehicle-mounted digital displays and creative brand placements.</p>
     </div>
     <Link href="/ad-formats" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-blue hover:underline">View All Formats <ArrowRight className="size-4" aria-hidden/></Link>
    </div>
    <div className="mt-6 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">
     {adFormats.map(format=><article key={format.title} className="group overflow-hidden rounded-2xl border border-[#e0ebf8] bg-white shadow-[0_6px_20px_#0b3e7309] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-[1.8/1] overflow-hidden bg-[#254772]"><FormatPreviewArt type={format.type}/></div>
      <div className="p-4">
       <div className="flex items-start gap-2"><span className={"mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#eff6ff] "+format.color}>{format.type==="bike_rear"?<Megaphone className="size-5" aria-hidden/>:format.type==="helmet"?<Sparkles className="size-5" aria-hidden/>:<CarFront className="size-5" aria-hidden/>}</span>
        <div><h3 className="text-sm font-extrabold text-brand-navy">{format.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{format.description}</p></div>
       </div>
       <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3"><span className="text-[11px] font-medium text-muted-foreground">{format.detail}</span><Link href="/ad-formats" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#b6d4fa] px-3 text-xs font-bold text-brand-blue hover:bg-[#eef5ff]" aria-label={"View details for "+format.title}>Details <ArrowRight className="size-3" aria-hidden/></Link></div>
      </div>
     </article>)}
    </div>
   </div>
  </section>

  <section aria-labelledby="steps-title" className="mx-auto max-w-7xl px-4 py-13 sm:px-6 sm:py-17">
   <div><h2 id="steps-title" className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">How It Works</h2>
    <p className="mt-2 text-sm text-muted-foreground">Plan your first campaign in four simple stages.</p>
   </div>
   <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {steps.map(({title,subtitle,icon:Icon},i)=><li key={title} className="relative flex items-start gap-3 rounded-xl border border-[#e2ebf7] bg-white p-4 sm:block sm:border-0 sm:p-0">
     <span className="flex shrink-0 items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-brand-blue font-bold text-white ring-4 ring-[#e7f1ff]">{i+1}</span>
      <Icon className="size-7 text-brand-blue sm:size-8" aria-hidden/>
     </span>
     <div className="min-w-0 sm:mt-4"><h3 className="text-sm font-extrabold text-brand-navy">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground sm:max-w-[220px]">{subtitle}</p></div>
     {i<3&&<ArrowRight className="absolute right-0 top-3 hidden size-5 translate-x-1/2 text-[#b4cff6] lg:block" aria-hidden/>}
    </li>)}
   </ol>
  </section>

  <CoverageExplorer/>

  <section aria-label="Start your campaign" className="relative isolate overflow-hidden bg-[#041b3d] text-white">
   <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_35%,#174e9a,transparent_43%),linear-gradient(125deg,#03162f,#0a396c)] opacity-75" aria-hidden/>
   <div className="absolute inset-0 bg-[linear-gradient(90deg,#03152c_8%,#03152cf2_45%,#03152c79)]" aria-hidden/>
   <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6 sm:py-16">
    <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#c5d9f2]">Your next campaign starts here</p>
     <h2 className="mt-2 max-w-lg text-2xl font-extrabold tracking-tight sm:text-3xl">Grow Your Brand Across Every Journey</h2>
     <p className="mt-2 max-w-xl text-sm leading-6 text-[#d4e5f7]">Explore ad formats, select your locations and turn everyday movement into brand experiences.</p>
     <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#bfdcff]">
      <span className="inline-flex items-center gap-1.5"><Target className="size-4" aria-hidden/>Targeted locations</span>
      <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden/>Flexible scheduling</span>
      <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4" aria-hidden/>Creative review</span>
     </div>
    </div>
    <Link href="/signup?role=advertiser" className={orangeCTA+" shrink-0"}>Start Your Campaign <ArrowRight className="size-4" aria-hidden/></Link>
   </div>
  </section>
 </>;
}
