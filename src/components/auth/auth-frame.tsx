import Link from "next/link";
import {ArrowLeft, CheckCircle2, ShieldCheck, Smartphone, Sparkles} from "lucide-react";
import {BrandLogo} from "@/components/brand/brand-logo";
import {HeroScene} from "@/components/landing/hero-scene";
export function AuthFrame({children}:{children:React.ReactNode}){
 return <div data-portal="public" className="min-h-dvh bg-[#f2f7ff]">
  <div className="grid min-h-dvh lg:grid-cols-[minmax(300px,.92fr)_minmax(0,1.08fr)]">
   <aside className="relative hidden overflow-hidden bg-[#031a3a] text-white lg:flex lg:flex-col lg:justify-between">
    <HeroScene className="pointer-events-none absolute inset-0 size-full opacity-65" aria-hidden="true"/>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,#031a3af5_0%,#031a3ab0_60%,#031a3a88)]"/>
    <div className="relative z-10 px-9 py-8 xl:px-14"><BrandLogo width={210} priority/><Link href="/" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-[#d5e6ff] hover:text-white"><ArrowLeft className="size-4"/>Back to website</Link></div>
    <div className="relative z-10 px-9 pb-16 xl:px-14"><p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#8ac0ff]">Your Brand. Everywhere.</p><h1 className="max-w-md text-4xl font-black leading-tight tracking-tight xl:text-5xl">One platform. <span className="text-[#ff8327]">Every journey.</span></h1>
     <p className="mt-5 max-w-md text-sm leading-7 text-[#cbddf4]">Create campaigns, work with approved driver partners and explore citywide screen advertising in the AdVibe experience.</p>
     <ul className="mt-7 space-y-3 text-sm text-[#dce9fb]"><li className="flex items-center gap-2"><CheckCircle2 className="size-5 text-[#40c8f9]"/>Responsive account workflows</li><li className="flex items-center gap-2"><Smartphone className="size-5 text-[#40c8f9]"/>Mobile-friendly forms and verification</li><li className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#40c8f9]"/>Production security planned separately</li></ul>
    </div>
   </aside>
   <main className="min-w-0">
    <div className="mx-auto flex min-h-dvh w-full max-w-[750px] flex-col px-4 py-5 sm:px-8 sm:py-8 lg:px-12">
     <div className="mb-5 flex items-center justify-between lg:hidden"><div className="rounded-xl bg-brand-navy px-3 py-2"><BrandLogo width={152} priority/></div><Link href="/" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand-blue"><ArrowLeft className="size-4"/>Home</Link></div>
     <div className="flex flex-1 items-center justify-center"><div className="w-full max-w-[490px]">{children}</div></div>
     <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Sparkles className="size-3.5"/>Frontend demonstration</span><Link href="/privacy" className="hover:text-brand-blue">Privacy</Link><Link href="/terms" className="hover:text-brand-blue">Terms</Link></div>
    </div>
   </main>
  </div>
 </div>;
}
