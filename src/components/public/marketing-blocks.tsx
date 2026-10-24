import Link from "next/link";
import {ArrowRight, BadgeCheck, BarChart3, CarFront, Check, Clock3, Headphones, MapPin, Megaphone, MonitorPlay, ShieldCheck, Target, UsersRound, Wallet, Wrench, Zap} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {HeroScene} from "@/components/landing/hero-scene";
import {FormatPreviewArt} from "@/components/landing/format-preview-art";
import type {Placement} from "@/types/domain";

export const primaryButton="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ff6a00] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_22px_#ff6a0033] transition hover:bg-[#e95e00] focus-visible:outline-offset-4";
export const secondaryButton="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#aac7f2] bg-white/90 px-6 py-3 text-sm font-bold text-[#075bea] transition hover:bg-[#e8f1ff]";
export const formatCards:{title:string;type:Placement;description:string;spec:string;best:string;icon:LucideIcon}[]=[
 {title:"Bike Mounted LED Screens",type:"bike_rear",description:"Compact digital placements built for mobile visibility.",spec:"10–12 inch design example",best:"Local offers and awareness",icon:Megaphone},
 {title:"Auto Rickshaw Screens",type:"auto_rear",description:"Reach audiences along neighborhood travel corridors.",spec:"10–12 inch design example",best:"Retail and local businesses",icon:CarFront},
 {title:"Car Interior LED Screens",type:"car_interior",description:"In-vehicle brand presence during longer journeys.",spec:"10–15 inch design example",best:"Premium and city campaigns",icon:MonitorPlay},
 {title:"Helmet Advertising",type:"helmet",description:"A distinctive non-screen brand placement concept.",spec:"Custom printed wrap",best:"Short-term promotions",icon:ShieldCheck},
];

export function PageHero({eyebrow,title,accent,description,actions,points=[]}:{eyebrow:string;title:string;accent:string;description:string;actions?:{label:string;href:string;secondary?:boolean}[];points?:{text:string;icon:LucideIcon}[]}){
 return <section className="relative isolate overflow-hidden bg-[#031a39] text-white">
  <HeroScene className="pointer-events-none absolute inset-0 h-full w-full opacity-75" aria-hidden="true"/>
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#041b3dfd_0%,#041b3df0_35%,#041b3d85_67%,#041b3d35_100%)]"/>
  <div className="relative mx-auto flex min-h-[355px] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[390px]">
   <p className="text-xs font-bold uppercase tracking-[.15em] text-[#a4d0ff]">{eyebrow}</p>
   <h1 className="mt-3 max-w-[730px] text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{title} <span className="text-brand-orange">{accent}</span></h1>
   <p className="mt-5 max-w-[600px] text-sm leading-7 text-[#e1eaf8] sm:text-base">{description}</p>
   {!!points.length&&<ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">{points.map(({text,icon:Icon})=><li key={text} className="inline-flex items-center gap-2 text-xs font-medium text-[#edf5ff]"><Icon className="size-5 text-[#65b0ff]" aria-hidden/>{text}</li>)}</ul>}
   {!!actions?.length&&<div className="mt-7 flex flex-wrap gap-3">{actions.map(action=><Link key={action.label} href={action.href} className={action.secondary?secondaryButton:primaryButton}>{action.label}<ArrowRight className="size-4" aria-hidden/></Link>)}</div>}
  </div>
 </section>;
}

export function Heading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:{label:string;href:string}}){
 return <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
  <div>{eyebrow&&<p className="mb-2 text-xs font-extrabold uppercase tracking-[.13em] text-brand-blue">{eyebrow}</p>}<h2 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">{title}</h2>
   {description&&<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>
  {action&&<Link href={action.href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline">{action.label}<ArrowRight className="size-4" aria-hidden/></Link>}
 </div>;
}
export function Section({children,muted=false,id}:{children:React.ReactNode;muted?:boolean;id?:string}){
 return <section id={id} className={muted?"bg-[#f3f8ff] py-12 sm:py-16":"bg-white py-12 sm:py-16"}><div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div></section>;
}
export function Benefits({items}:{items:{title:string;text:string;icon:LucideIcon;color?:string}[]}){
 return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(({title,text,icon:Icon,color},i)=><article key={title} className="rounded-2xl border border-[#deebfa] bg-white p-5 shadow-[0_7px_24px_#0a2b5010]">
  <div className={"grid size-12 place-items-center rounded-full "+(color??["bg-[#e5f0ff] text-brand-blue","bg-[#e8faf2] text-[#0bab69]","bg-[#fff1e6] text-brand-orange","bg-[#f4eaff] text-[#742de8]"][i%4])}><Icon className="size-6" aria-hidden/></div>
  <h3 className="mt-4 text-base font-extrabold text-brand-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
 </article>)}</div>;
}
export function FormatsGrid({short=false}:{short?:boolean}){
 return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{formatCards.slice(0,short?3:4).map(f=><article key={f.type} className="overflow-hidden rounded-xl border border-[#dce8f8] bg-white shadow-sm">
  <div className="aspect-[1.7] overflow-hidden"><FormatPreviewArt type={f.type}/></div><div className="p-4"><h3 className="font-extrabold text-brand-navy">{f.title}</h3><p className="mt-1 min-h-12 text-xs leading-5 text-muted-foreground">{f.description}</p>
   <p className="mt-3 text-xs text-[#415780]">{f.spec}</p>
   <Link href="/ad-formats" className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#83b4ff] text-sm font-bold text-brand-blue hover:bg-[#ecf5ff]">View Details <ArrowRight className="size-4" aria-hidden/></Link></div>
 </article>)}</div>;
}
export function Steps({items}:{items:{title:string;text:string;icon:LucideIcon}[]}){
 return <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(({title,text,icon:Icon},i)=><li key={title} className="rounded-xl border border-[#e0eaf8] bg-white p-5">
  <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand-blue font-bold text-white">{i+1}</span><Icon className="size-7 text-brand-blue" aria-hidden/></div>
  <h3 className="mt-4 text-sm font-extrabold text-brand-navy">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
 </li>)}</ol>;
}
export function CTA({title,text,label,href}:{title:string;text:string;label:string;href:string}){
 return <section className="bg-[radial-gradient(circle_at_85%_40%,#154981_0%,transparent_40%),linear-gradient(110deg,#031329,#05264c)] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-6 sm:py-14">
  <div><h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#d0e1f8]">{text}</p>
   <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#c5d8f4]">{[BadgeCheck,Clock3,Headphones].map((Icon,i)=><span key={i} className="inline-flex items-center gap-1.5"><Icon className="size-4 text-[#2c9aff]" aria-hidden/>{["Clear process","Flexible planning","Support resources"][i]}</span>)}</div>
  </div><Link href={href} className={primaryButton}>{label}<ArrowRight className="size-4" aria-hidden/></Link>
 </div></section>;
}
export const advertiserBenefits=[
 {title:"High Visibility",text:"Place your campaigns on everyday routes where people travel, shop and commute.",icon:UsersRound},
 {title:"Targeted Locations",text:"Choose your preferred city, area, format and screen placement.",icon:Target},
 {title:"Flexible Campaigns",text:"Plan dates and ad frequency based on your campaign goals.",icon:Wallet},
 {title:"Performance Insights",text:"Review campaign progress and reporting when delivery data is available.",icon:BarChart3}
];
export const driverBenefits=[
 {title:"Additional Income",text:"Explore earning opportunities for displaying advertisements during regular trips.",icon:Wallet},
 {title:"Assisted Setup",text:"The proposed program includes screen installation and onboarding guidance.",icon:CarFront},
 {title:"Flexible Driving",text:"Continue your usual routes while eligible campaigns run.",icon:Clock3},
 {title:"Support & Maintenance",text:"Report device issues and request assistance from the partner portal.",icon:Wrench}
];
export const advertiserSteps=[
 {title:"Create Account",text:"Register an advertiser profile and provide your business details.",icon:UsersRound},
 {title:"Prepare Creative",text:"Choose a format and upload the image or video advertisement.",icon:MonitorPlay},
 {title:"Plan Locations",text:"Select areas, screens and dates, then review estimated costs.",icon:MapPin},
 {title:"Review & Track",text:"Submit for approval and follow the campaign in your dashboard.",icon:BarChart3}
];
export const driverSteps=[
 {title:"Sign Up",text:"Create your driver partner account.",icon:UsersRound},
 {title:"Submit Documents",text:"Provide identification, licence, RC, insurance and vehicle information.",icon:BadgeCheck},
 {title:"Install Screen",text:"Complete the supervised device installation and pairing stage.",icon:MonitorPlay},
 {title:"Start Earning",text:"Begin eligible campaign deliveries after verification and assignment.",icon:Wallet}
];
export function InfoNote({children}:{children:React.ReactNode}){return <p className="mt-4 rounded-xl border border-[#d8e5f8] bg-[#eff6ff] px-4 py-3 text-xs leading-5 text-[#415985]"><ShieldCheck className="mr-2 inline size-4 text-brand-blue" aria-hidden/>{children}</p>;}
export function Requirements(){return <div className="grid gap-3 sm:grid-cols-2">{["Valid driving licence","Vehicle registration certificate","Vehicle insurance and PUC","Eligible vehicle in suitable condition","Bank payout details","Agreement and verification approval"].map(x=><div key={x} className="flex items-start gap-2 text-sm text-[#31496e]"><Check className="mt-0.5 size-4 shrink-0 text-[#00aa64]" aria-hidden/>{x}</div>)}</div>;}
