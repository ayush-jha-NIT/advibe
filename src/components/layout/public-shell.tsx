"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, MapPin, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { publicNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function PublicShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=React.useState(false);
  const mobileClose=React.useRef<HTMLButtonElement>(null);
  const mobilePanel=React.useRef<HTMLDivElement>(null);
  const openButton=React.useRef<HTMLButtonElement>(null);

  React.useEffect(()=>{
    if(!mobileOpen)return;
    const before=document.body.style.overflow;
    document.body.style.overflow="hidden";
    mobileClose.current?.focus();
    function key(e:KeyboardEvent){
      if(e.key==="Escape"){
        e.preventDefault();
        setMobileOpen(false);
        openButton.current?.focus();
        return;
      }
      if(e.key!=="Tab"||!mobilePanel.current)return;
      const focusable=Array.from(mobilePanel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(el=>el.getClientRects().length>0);
      if(!focusable.length){e.preventDefault();return;}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&(document.activeElement===first||!mobilePanel.current.contains(document.activeElement))){
        e.preventDefault();last.focus();
      }else if(!e.shiftKey&&(document.activeElement===last||!mobilePanel.current.contains(document.activeElement))){
        e.preventDefault();first.focus();
      }
    }
    document.addEventListener("keydown",key);
    return ()=>{document.body.style.overflow=before;document.removeEventListener("keydown",key);};
  },[mobileOpen]);

  const nav=publicNavigation.map(item=>{
    const isActive=pathname===item.href;
    return (
      <div key={item.href} className="group relative">
        {"children" in item
          ? <details className="group/drop relative">
            <summary className={cn("flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-white/85 marker:content-none hover:bg-white/10 hover:text-white",
              isActive && "text-white underline decoration-brand-blue decoration-2 underline-offset-8")}>
              {item.label}<ChevronDown className="size-3.5" aria-hidden/>
            </summary>
            <div className="absolute left-0 top-[calc(100%+4px)] z-[70] min-w-52 rounded-xl border border-[#244a79] bg-brand-navy p-2 shadow-2xl">
              {item.children.map(child=><Link href={child.href} key={child.href} className="flex min-h-10 items-center rounded-lg px-3 text-xs text-white/90 hover:bg-[#153b70]">{child.label}</Link>)}
            </div>
          </details>
          : <Link href={item.href} aria-current={isActive?"page":undefined}
            className={cn("flex min-h-11 items-center rounded-lg px-2.5 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white",
              isActive && "text-white underline decoration-brand-blue decoration-2 underline-offset-8")}>{item.label}</Link>}
      </div>
    );
  });

  return (
    <div data-portal="public" className="min-h-screen bg-background">
      <a href="#public-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">Skip to main content</a>
      <header className="sticky top-0 z-50 bg-brand-navy text-white shadow-[0_3px_16px_#00000018]">
        <div className="mx-auto flex min-h-[72px] max-w-[1560px] items-center justify-between gap-3 px-4 sm:px-6 xl:gap-4 xl:px-8">
          <BrandLogo priority className="w-[153px] sm:w-[170px]" width={183}/>
          <nav aria-label="Public website" className="hidden flex-1 items-center justify-center gap-0.5 xl:flex">{nav}</nav>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#9baccf] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10">Login</Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-[#e95d00]">Sign Up</Link>
          </div>
          <button ref={openButton} type="button" aria-expanded={mobileOpen} aria-controls="advibe-public-navigation" aria-label="Open public navigation" onClick={()=>setMobileOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-white/15 hover:bg-white/10 xl:hidden"><Menu className="size-6" aria-hidden/></button>
        </div>
      </header>
      <main id="public-main" tabIndex={-1} className="min-h-[55dvh] outline-none">{children}</main>
      <footer className="bg-brand-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-14">
          <div className="space-y-4">
            <BrandLogo width={200} className="w-[180px]"/>
            <p className="max-w-xs text-sm leading-6 text-[#b6c8e4]">Your Brand. Everywhere. Mobile outdoor advertising that connects businesses, drivers and communities.</p>
            <p className="flex items-center gap-2 text-xs text-[#9cb8e2]"><MapPin className="size-4" aria-hidden/>Built for cities across India</p>
          </div>
          <div><h2 className="mb-3 text-sm font-bold">Explore</h2><FooterLinks links={publicNavigation.filter(i=>!["Home","Help Center"].includes(i.label))}/></div>
          <div><h2 className="mb-3 text-sm font-bold">Platforms</h2><FooterLinks links={[
            {label:"Advertiser Portal",href:"/advertiser"},{label:"Driver Partner Portal",href:"/driver"},
            {label:"Admin Portal (Demo)",href:"/admin"},{label:"UI Components",href:"/design-system"},
          ]}/></div>
          <div><h2 className="mb-3 text-sm font-bold">Support & Legal</h2><FooterLinks links={[
            {label:"Help Center",href:"/help-center"},{label:"Contact Us",href:"/contact"},
            {label:"Privacy Policy",href:"/privacy"},{label:"Terms & Conditions",href:"/terms"},
          ]}/></div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-[#a8c0e1] sm:px-6">
            <span>© 2026 AdVibe. Frontend demonstration.</span><span>Designed mobile-first · India</span>
          </div>
        </div>
      </footer>

      {mobileOpen&&<div className="fixed inset-0 z-[90] xl:hidden">
        <button type="button" onClick={()=>{setMobileOpen(false);openButton.current?.focus();}} aria-label="Close navigation overlay" className="absolute inset-0 w-full bg-[#02152bcb]"/>
        <div id="advibe-public-navigation" ref={mobilePanel} role="dialog" aria-modal="true" aria-label="Public navigation menu" className="absolute inset-y-0 right-0 flex w-[min(90vw,360px)] flex-col overflow-hidden bg-brand-navy text-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
            <BrandLogo className="w-[156px]" width={174}/>
            <button ref={mobileClose} type="button" onClick={()=>{setMobileOpen(false);openButton.current?.focus();}} aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-xl border border-white/15"><X className="size-6" aria-hidden/></button>
          </div>
          <nav aria-label="Mobile public pages" className="flex-1 overflow-y-auto px-3 py-4">
            {publicNavigation.map(item=><div key={item.href}>
              <Link href={item.href} onClick={()=>setMobileOpen(false)}
                aria-current={pathname===item.href?"page":undefined}
                className={cn("flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-semibold text-white/85 hover:bg-[#153b70]",pathname===item.href&&"bg-[#153b70] text-white")}>
                {item.label}<ArrowRight className="size-4" aria-hidden/>
              </Link>
              {"children" in item&&<div className="ml-3 border-l border-white/15 pl-3">
                {item.children.map(child=><Link key={child.href} href={child.href} onClick={()=>setMobileOpen(false)}
                  className="flex min-h-10 items-center rounded-lg px-2 text-xs text-[#b9d1ee] hover:bg-white/10">{child.label}</Link>)}
              </div>}
            </div>)}
          </nav>
          <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/10 p-4">
            <Link href="/login" onClick={()=>setMobileOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl border border-white/30 text-sm font-semibold">Login</Link>
            <Link href="/signup" onClick={()=>setMobileOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl bg-brand-orange text-sm font-semibold">Sign Up</Link>
          </div>
        </div>
      </div>}
    </div>
  );
}

function FooterLinks({links}:{links:ReadonlyArray<{label:string;href:string}>}) {
  return <ul className="space-y-2">{links.map(link=><li key={link.href}><Link href={link.href} className="inline-flex min-h-7 items-center text-sm text-[#b6c8e4] hover:text-white hover:underline">{link.label}</Link></li>)}</ul>;
}
