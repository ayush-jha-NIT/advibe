import Link from "next/link";
import { ArrowRight, BadgeCheck, CarFront, LayoutDashboard, Megaphone, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/brand-logo";

const portals = [
  { href: "/advertiser", title: "Advertiser Portal", description: "Campaign creation, formats, location selection and analytics.", icon: Megaphone, tint: "bg-[#e9f1ff] text-brand-blue" },
  { href: "/driver", title: "Driver Partner Portal", description: "Onboarding, vehicles, assigned advertisements and earnings.", icon: CarFront, tint: "bg-[#e7f9f0] text-[#069653]" },
  { href: "/admin", title: "Admin Portal", description: "Campaign reviews, verification, inventory and platform control.", icon: ShieldCheck, tint: "bg-[#eee6ff] text-brand-purple" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_83%_30%,#124a93,#061b3b_58%,#031326)] text-white">
        <div className="absolute -right-20 top-5 size-[300px] rounded-full bg-brand-blue/15 blur-[80px] sm:size-[450px]" aria-hidden/>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-22 lg:grid-cols-[1.3fr_.7fr] lg:items-center lg:py-27">
          <div className="max-w-2xl">
            <Badge tone="orange" shape="pill">Part 2 · Responsive navigation foundation</Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">Your Brand. <span className="text-[#ff7913]">Everywhere.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#c2d5ef] sm:text-lg">AdVibe connects brands with real people across everyday journeys. The public website and portal navigation are ready for the complete client-approved experience.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/for-advertisers" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-orange px-6 text-sm font-bold text-white hover:bg-[#df5900]">For Advertisers <ArrowRight className="size-4" aria-hidden/></Link>
              <Link href="/for-drivers" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/50 px-6 text-sm font-bold text-white hover:bg-white/10">For Drivers <ArrowRight className="size-4" aria-hidden/></Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/8 p-5 backdrop-blur-xl sm:p-8">
            <BrandLogo href="" width={355} className="mx-auto w-full max-w-[340px]"/>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {[["4", "Portal experiences"],["59","Approved references"],["3","Role dashboards"],["1","Shared system"]].map(([value,label])=>
                <div key={label} className="rounded-xl border border-white/10 bg-white/8 px-3 py-4 text-center"><p className="text-2xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-[#bfcee9]">{label}</p></div>)}
            </div>
            <p className="mt-4 text-center text-xs text-[#a8bfdd]">Illustrative frontend progress counts, not platform statistics</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 sm:py-16">
        <div><p className="text-xs font-bold uppercase tracking-[.17em] text-brand-blue">Navigation test</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Explore the three portal shells</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">These destinations are frontend layout previews, not authenticated dashboards. Real workflows and shared data are implemented in later parts.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {portals.map(portal=><Link key={portal.href} href={portal.href}
            className="group flex min-h-52 flex-col justify-between rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] transition-[border-color,transform] hover:-translate-y-1 hover:border-[#a8c7f9]">
            <div className={"flex size-13 items-center justify-center rounded-xl "+portal.tint}><portal.icon className="size-6" aria-hidden/></div>
            <div><h3 className="mt-5 text-lg font-bold">{portal.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{portal.description}</p></div>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">Open shell <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden/></span>
          </Link>)}
        </div>
      </section>
      <section className="border-t border-line bg-[#eef6ff]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
          <div className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-blue"><LayoutDashboard className="size-5" aria-hidden/></span>
            <div><p className="font-bold">Shared component design system</p><p className="mt-1 text-sm text-muted-foreground">Preview color tokens, controls, modals and responsive primitives.</p></div></div>
          <Link href="/design-system" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white hover:bg-[#0051dc]">Open design preview <ArrowRight className="size-4" aria-hidden/></Link>
        </div>
      </section>
    </>
  );
}
