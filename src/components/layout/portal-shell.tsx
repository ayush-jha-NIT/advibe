"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Bell, ChevronDown, ChevronRight, CircleHelp,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import {useDemoAuth} from "@/services/demo-auth-store";
import {useDemoStore} from "@/services/demo-store";
import {DEMO_USERS} from "@/lib/demo-auth";
import {trapOverlayTab} from "@/lib/overlay-focus";
import { cn } from "@/lib/utils";
import { activePortalItem, portalNavigation, portalNames, portalPeople,
  type PortalRole, type NavItem } from "@/config/navigation";

const GROUPS = [
  { value: "main", label: "Workspace" }, { value: "management", label: "Management" },
  { value: "account", label: "Account" },
] as const;

function SidebarNavigation({ role, collapsed, onNavigate }: {
  role: PortalRole; collapsed: boolean; onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={portalNames[role] + " navigation"} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 pb-4 pt-3">
      {GROUPS.map(({ value, label }) => {
        const items = portalNavigation[role].filter(item => (item.group ?? "main") === value);
        if (!items.length) return null;
        return <div key={value}>
          <p className={cn("px-3 pb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#8ea8d2]", collapsed && "sr-only")}>{label}</p>
          <div className="space-y-0.5">
            {items.map(item => {
              const selected = pathname === item.href || (item.href !== "/" + role && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/86 transition-colors duration-150",
                    "focus-visible:outline-offset-[-3px] hover:bg-[#123969] hover:text-white",
                    selected && "bg-[var(--portal-accent)] font-semibold text-white shadow-sm hover:bg-[var(--portal-accent-hover)]",
                    collapsed && "justify-center px-1.5",
                  )}
                >
                  <Icon className="size-[19px] shrink-0" strokeWidth={selected ? 2.4 : 1.9} aria-hidden />
                  {!collapsed && <span className="min-w-0 flex-1 break-words">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>;
      })}
    </nav>
  );
}

function Sidebar({role, collapsed, onToggle, onNavigate, mobile=false}:{
  role:PortalRole;collapsed:boolean;onToggle?:()=>void;onNavigate?:()=>void;mobile?:boolean;
}) {
  const promo = role === "admin"
    ? ["Brands Move Further", "Explore Campaigns", "/admin/campaigns"]
    : role === "advertiser"
      ? ["Turn Every Ride Into Brand Growth", "Create Campaign", "/advertiser/create-campaign"]
      : ["Drive. Earn. Grow.", "View Schedule", "/driver/assigned-ads"];
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(160deg,#03152e,#062650_58%,#03152e)] text-white">
      <div className={cn("flex h-[76px] min-h-[76px] items-center border-b border-white/10 px-4", collapsed && "justify-center px-2")}>
        {collapsed ? <Link href={"/"+role} className="flex size-11 items-center justify-center rounded-lg bg-[#12366d]" aria-label={portalNames[role]+" home"}><Image src="/icon.png" alt="" width={36} height={36} className="size-9 object-contain"/></Link>
          : <BrandLogo href={"/"+role} width={183} className="w-[174px]" priority />}
      </div>
      <SidebarNavigation role={role} collapsed={collapsed} onNavigate={onNavigate}/>
      {!collapsed && (
        <Link href={promo[2]} onClick={onNavigate}
          className="group mx-3 mb-3 shrink-0 rounded-xl border border-[#2862ad]/45 bg-[radial-gradient(circle_at_90%_20%,#147bff69,transparent_55%),linear-gradient(140deg,#102c62,#041b3d)] p-4 shadow-inner transition-transform hover:-translate-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8ab8ff]">AdVibe</p>
          <p className="mt-2 max-w-44 text-lg font-bold leading-6">{promo[0]} <span className="text-brand-orange">with AdVibe</span></p>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#b5d7ff]">{promo[1]} <ArrowRight className="size-4" aria-hidden/></span>
        </Link>
      )}
      {!mobile && (
        <button type="button" className="hidden min-h-11 items-center justify-center gap-2 border-t border-white/10 px-3 text-xs text-[#abc5e9] hover:text-white lg:flex"
          onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden/> : <PanelLeftClose className="size-5" aria-hidden/>}
          {!collapsed && "Collapse sidebar"}
        </button>
      )}
    </div>
  );
}

function NavSearch({role}:{role:PortalRole}) {
  const router = useRouter();
  const resultsId=React.useId();
  const [query,setQuery] = React.useState("");
  const [open,setOpen] = React.useState(false);
  const [focusedIndex,setFocusedIndex] = React.useState(-1);
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return portalNavigation[role].filter(item =>
      [item.label,item.description,...(item.keywords??[])].some(v=>v.toLowerCase().includes(q))
    ).slice(0,6);
  },[query,role]);

  React.useEffect(() => {
    function outside(e:PointerEvent) { if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown",outside);
    return () => document.removeEventListener("pointerdown",outside);
  },[]);

  function go(item:NavItem) { setOpen(false);setQuery("");router.push(item.href); }
  function submit(e:React.FormEvent) {e.preventDefault();const candidate=results[focusedIndex]??results[0];if(candidate)go(candidate);}
  return (
    <div ref={ref} className="relative w-full min-w-0 max-w-xl">
      <form onSubmit={submit} role="search" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#4373b8]" aria-hidden/>
        <input ref={inputRef} type="search" value={query}
          aria-label={"Search "+portalNames[role]+" pages"}
          aria-controls={open&&query.trim()?resultsId:undefined} aria-expanded={Boolean(open&&query.trim())}
          aria-autocomplete="list" aria-activedescendant={open&&focusedIndex>=0&&results[focusedIndex]?resultsId+"-item-"+focusedIndex:undefined}
          role="combobox" autoComplete="off" placeholder="Search pages, tools and settings..."
          className="min-h-11 w-full rounded-xl border border-line bg-[#f7faff] py-2.5 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-[#7b8dac] focus-visible:border-[var(--ring)]"
          onChange={e=>{setQuery(e.target.value);setOpen(true);setFocusedIndex(-1);}}
          onFocus={()=>setOpen(true)}
          onKeyDown={e=>{
            if(e.key==="Escape") {setOpen(false);inputRef.current?.blur();}
            if(e.key==="ArrowDown") {e.preventDefault();setOpen(true);setFocusedIndex(v=>Math.min(v+1,results.length-1));}
            if(e.key==="ArrowUp") {e.preventDefault();setFocusedIndex(v=>Math.max(-1,v-1));}
          }}
        />
      </form>
      {open && query.trim() && (
        <div id={resultsId} role="listbox" aria-label="Navigation search results"
          className="absolute left-0 right-0 top-[calc(100%+5px)] z-[70] overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-[0_20px_60px_#041b3d30]">
          {results.length===0
            ? <p className="px-3 py-4 text-sm text-muted-foreground">No matching pages. Try a module name.</p>
            : results.map((item,i)=>{
              const Icon=item.icon;
              return <button id={resultsId+"-item-"+i} type="button" role="option" aria-selected={i===focusedIndex}
                key={item.href} onClick={()=>go(item)}
                onMouseEnter={()=>setFocusedIndex(i)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  i===focusedIndex?"bg-[#eaf2ff]":"hover:bg-[#f3f7fe]")}>
                <Icon className="size-4 shrink-0 text-brand-blue" aria-hidden />
                <span className="min-w-0 flex-1"><span className="block font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span></span>
                <ChevronRight className="size-4 shrink-0 text-[#95aacb]" aria-hidden />
              </button>;
            })}
        </div>
      )}
    </div>
  );
}

export function PortalShell({role,children}:{role:PortalRole;children:React.ReactNode}) {
  const pathname=usePathname();
  const router=useRouter();
  const session=useDemoAuth(s=>s.session);
  const logout=useDemoAuth(s=>s.logout);
  const notices=useDemoStore(s=>s.db.notices);
  const [mobileOpen,setMobileOpen] = React.useState(false);
  const [collapsed,setCollapsed] = React.useState(false);
  const [showNotifications,setShowNotifications] = React.useState(false);
  const [showAccount,setShowAccount] = React.useState(false);
  const drawerCloseRef=React.useRef<HTMLButtonElement>(null);
  const drawerRef=React.useRef<HTMLDivElement>(null);
  const menuButtonRef=React.useRef<HTMLButtonElement>(null);
  const notificationRef=React.useRef<HTMLDivElement>(null);
  const accountRef=React.useRef<HTMLDivElement>(null);
  const notificationButtonRef=React.useRef<HTMLButtonElement>(null);
  const accountButtonRef=React.useRef<HTMLButtonElement>(null);
  const previousPath=React.useRef(pathname);
  const demoIdentity=DEMO_USERS.find(u=>u.role===role);
  const accountId=session?.role===role&&session.email===demoIdentity?.email?
    {admin:"adm-1",advertiser:"adv-1",driver:"drv-1"}[role]:null;
  const myNotices=notices.filter(n=>n.recipientId===accountId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const unreadNotices=myNotices.filter(n=>!n.read).length;
  const active=activePortalItem(role,pathname);
  const person=session?.role===role?{name:session.displayName,subtitle:portalPeople[role].subtitle,initials:session.displayName.trim().split(/\s+/).slice(0,2).map(part=>part[0]??"").join("").toUpperCase()}:portalPeople[role];
  function signOut(){logout();setShowAccount(false);router.replace("/login?role="+role);}

  React.useEffect(()=>{
    const frame = window.requestAnimationFrame(() => {
      try { setCollapsed(window.localStorage.getItem("advibe:sidebar:"+role)==="collapsed"); }
      catch { /* Storage unavailable in private browsing. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  },[role]);
  React.useEffect(()=>{
    void Promise.resolve(useDemoStore.persist.rehydrate());
  },[]);
  React.useEffect(()=>{
    if(previousPath.current===pathname)return;
    previousPath.current=pathname;
    const frame=window.requestAnimationFrame(()=>document.getElementById("portal-main")?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[pathname]);
  React.useEffect(()=>{
    if(!mobileOpen)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    drawerCloseRef.current?.focus();
    function onKey(e:KeyboardEvent){
      if(e.key==="Escape"){e.preventDefault();setMobileOpen(false);window.requestAnimationFrame(()=>menuButtonRef.current?.focus());return;}
      trapOverlayTab(drawerRef.current,e);
    }
    document.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",onKey);};
  },[mobileOpen]);
  React.useEffect(()=>{
    function onPointer(e:PointerEvent){
      if(notificationRef.current&&!notificationRef.current.contains(e.target as Node))setShowNotifications(false);
      if(accountRef.current&&!accountRef.current.contains(e.target as Node))setShowAccount(false);
    }
    function onKey(e:KeyboardEvent){
      if(e.key!=="Escape")return;
      if(showNotifications){e.preventDefault();setShowNotifications(false);notificationButtonRef.current?.focus();}
      if(showAccount){e.preventDefault();setShowAccount(false);accountButtonRef.current?.focus();}
    }
    document.addEventListener("pointerdown",onPointer);
    document.addEventListener("keydown",onKey);
    return ()=>{document.removeEventListener("pointerdown",onPointer);document.removeEventListener("keydown",onKey);};
  },[showNotifications,showAccount]);

  function toggleCollapsed() {
    setCollapsed(v=>{const next=!v;try{window.localStorage.setItem("advibe:sidebar:"+role,next?"collapsed":"expanded");}catch{}return next;});
  }

  const notificationHref="/"+role+"/notifications";
  const accountHref=role==="admin"?"/admin/settings":role==="advertiser"?"/advertiser/settings":"/driver/profile";
  return (
    <div data-portal={role} className="min-h-screen bg-background">
      <a href="#portal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-brand-blue">Skip to main content</a>
      <div className="flex min-h-screen" inert={mobileOpen} aria-hidden={mobileOpen?true:undefined}>
        <aside className={cn("sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block",collapsed?"w-[76px]":"w-[246px]")} aria-label="Desktop navigation">
          <Sidebar role={role} collapsed={collapsed} onToggle={toggleCollapsed}/>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-line bg-white/95 shadow-[0_2px_14px_#05275108] backdrop-blur-lg">
            <div className="flex min-h-[68px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 lg:px-7">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button ref={menuButtonRef} type="button" onClick={()=>setMobileOpen(true)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-surface-alt lg:hidden" aria-label="Open navigation menu" aria-expanded={mobileOpen}>
                  <Menu className="size-6" aria-hidden/>
                </button>
                <span className="hidden shrink-0 text-xs font-bold text-muted-foreground sm:block lg:hidden">{portalNames[role]}</span>
                <div className="hidden min-w-0 flex-1 md:block"><NavSearch key={pathname} role={role}/></div>
                <p className="truncate text-sm font-semibold md:hidden">{active.label}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <div ref={notificationRef} className="relative">
                  <button ref={notificationButtonRef} type="button" className="relative inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-alt" aria-label={unreadNotices?"Notifications: "+unreadNotices+" unread":"Notifications"} aria-expanded={showNotifications} aria-controls="portal-notice-preview"
                    onClick={()=>{setShowNotifications(v=>!v);setShowAccount(false);}}>
                    <Bell className="size-5" aria-hidden />
                  </button>
                  {showNotifications && <div id="portal-notice-preview" className="absolute right-0 top-[calc(100%+10px)] z-[65] w-[min(85vw,310px)] rounded-xl border border-line bg-white p-4 shadow-xl" role="region" aria-label="Notification preview">
                    <p className="font-semibold">Demo notifications{unreadNotices?" · "+unreadNotices+" unread":""}</p>
                    {myNotices.length?<ul className="mt-2 space-y-2">{myNotices.slice(0,3).map(n=><li key={n.id} className="rounded-lg bg-[#f4f8ff] p-2 text-xs"><strong className="block text-brand-navy">{n.title}</strong><span className="mt-1 block text-muted-foreground">{n.message}</span></li>)}</ul>
                      :<p className="mt-2 text-xs leading-5 text-muted-foreground">No demo notifications for this account.</p>}
                    <p className="mt-2 text-xs text-muted-foreground">Browser-local records only; no push or external messages.</p>
                    <Link href={notificationHref} onClick={()=>setShowNotifications(false)} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue">Open notifications <ArrowRight className="size-4" aria-hidden/></Link>
                  </div>}
                </div>
                <div ref={accountRef} className="relative border-l border-line pl-2 sm:pl-3">
                  <button ref={accountButtonRef} type="button" aria-label="Open demo account menu" aria-controls="portal-account-panel" aria-expanded={showAccount}
                    onClick={()=>{setShowAccount(v=>!v);setShowNotifications(false);}}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-surface-alt sm:gap-3">
                    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",role==="admin"?"bg-brand-purple":"bg-brand-blue")}>{person.initials}</span>
                    <span className="hidden text-left sm:block"><span className="block text-xs font-semibold">{person.name}</span><span className="block text-[11px] text-muted-foreground">{person.subtitle}</span></span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                  </button>
                  {showAccount && <div id="portal-account-panel" className="absolute right-0 top-[calc(100%+10px)] z-[65] w-[min(84vw,250px)] rounded-xl border border-line bg-white p-2 shadow-xl" role="region" aria-label="Demo account options">
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Demo portal selection</p>
                    {(["admin","advertiser","driver"] as const).map(r=><Link key={r} href={"/"+r} onClick={()=>setShowAccount(false)} className="flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-surface-alt">{portalNames[r]}{r===role?" ✓":""}</Link>)}
                    <div className="my-1 border-t border-line"/>
                    <Link href={accountHref} onClick={()=>setShowAccount(false)} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-alt"><Settings className="size-4"/>Account settings</Link>
                    <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-surface-alt"><LogOut className="size-4"/>Sign out of demo</button>
                  </div>}
                </div>
              </div>
            </div>
            <div className="border-t border-line px-3 py-2 md:hidden sm:px-5"><NavSearch key={pathname} role={role}/></div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start gap-2 border-b border-[#d6e9ff] bg-[#f0f7ff] px-4 py-2.5 text-xs text-[#3d6597] sm:px-6 lg:px-8">
              <CircleHelp className="mt-0.5 size-3.5 shrink-0" aria-hidden/>
              <p><strong>Part 6 demo sessions.</strong> Local role switching and signup/OTP previews do not provide real authentication. Backend identity, payments and device services are still pending.</p>
            </div>
            <main id="portal-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
            <footer className="flex flex-wrap justify-between gap-2 border-t border-line bg-white px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
              <span>AdVibe · {portalNames[role]}</span><Link href="/design-system" className="text-brand-blue hover:underline">UI reference</Link>
            </footer>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-[#02152bc9]" aria-label="Close navigation overlay" onClick={()=>{setMobileOpen(false);window.requestAnimationFrame(()=>menuButtonRef.current?.focus());}}/>
          <div ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 left-0 w-[min(84vw,300px)] shadow-2xl" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <Sidebar role={role} collapsed={false} mobile onNavigate={()=>setMobileOpen(false)}/>
            <button ref={drawerCloseRef} type="button" aria-label="Close menu" onClick={()=>{setMobileOpen(false);window.requestAnimationFrame(()=>menuButtonRef.current?.focus());}}
              className="absolute right-3 top-4 flex size-10 items-center justify-center rounded-lg bg-white/10 text-white"><X className="size-5" aria-hidden/></button>
          </div>
        </div>
      )}
    </div>
  );
}
