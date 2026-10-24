"use client";
import * as React from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ArrowRight,LockKeyhole,ShieldAlert} from "lucide-react";
import {BrandLogo} from "@/components/brand/brand-logo";
import {useDemoAuth} from "@/services/demo-auth-store";
import {DEMO_PASSWORD,DEMO_USERS,type AuthRole} from "@/lib/demo-auth";

export function PortalGate({role,children}:{role:AuthRole;children:React.ReactNode}){
 const pathname=usePathname(),session=useDemoAuth(s=>s.session),login=useDemoAuth(s=>s.demoLogin);
 const [ready,setReady]=React.useState(false);
 React.useEffect(()=>{let mounted=true;void Promise.resolve(useDemoAuth.persist.rehydrate()).then(()=>{if(mounted)setReady(true);});return ()=>{mounted=false;};},[]);
 if(!ready)return <div className="flex min-h-dvh items-center justify-center bg-[#f2f7ff] p-5" role="status"><p className="text-sm font-semibold text-[#516e97]">Loading demo account…</p></div>;
 if(session?.role===role)return <>{children}</>;
 const preset=DEMO_USERS.find(u=>u.role===role)!;
 return <main className="grid min-h-dvh place-items-center bg-[#f3f7ff] px-4 py-10" data-portal={role}><section className="w-full max-w-lg rounded-3xl border border-[#d9e6f8] bg-white p-6 shadow-lg sm:p-9">
  <div className="mb-6 inline-flex rounded-xl bg-brand-navy p-3"><BrandLogo width={180}/></div>
  <span className="mb-3 grid size-12 place-items-center rounded-xl bg-[#edf4ff] text-brand-blue"><LockKeyhole className="size-6"/></span>
  <h1 className="text-2xl font-extrabold text-brand-navy sm:text-3xl">{role==="admin"?"Admin":role==="driver"?"Driver Partner":"Advertiser"} demo access</h1>
  <p className="mt-3 text-sm leading-6 text-muted-foreground">This route uses an in-browser demonstration identity, not actual authentication or server-enforced authorization.</p>
  {session&&<p className="mt-3 rounded-lg bg-[#fff3e6] p-3 text-sm text-[#8a5222]">Currently viewing the {session.role} demo identity. Switch roles to preview this portal.</p>}
  <button type="button" onClick={()=>login(role,preset.email,DEMO_PASSWORD)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-bold text-white hover:bg-[#0050d8]">Continue as demo {role} <ArrowRight className="size-4"/></button>
  <Link href={"/login?role="+role+"&next="+encodeURIComponent(pathname)} className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[#a4c5f3] text-sm font-bold text-brand-blue hover:bg-[#f0f6ff]">Use demo login form</Link>
  <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#647d9e]"><ShieldAlert className="size-4 shrink-0"/>A production backend must authenticate every request, check permissions and verify payments independently.</p>
  <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-blue hover:underline">Return to public website</Link>
 </section></main>;
}
