import Link from "next/link";
import { ArrowRight, LayoutTemplate, ShieldAlert } from "lucide-react";
import { Badge, Card, CardContent } from "@/components/ui";
import { type NavItem, type PortalRole, portalNames } from "@/config/navigation";

export function SectionPlaceholder({role,item}:{role:PortalRole;item:NavItem}) {
  const Icon=item.icon;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{portalNames[role]}</span><ArrowRight className="size-3.5" aria-hidden />
        <span className="font-medium text-foreground">{item.label}</span>
      </div>
      <Card><CardContent className="space-y-4 pt-6 sm:pt-8">
        <Badge tone="info">Route ready · Feature pending</Badge>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-brand-blue"><Icon className="size-6" aria-hidden /></span>
          <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{item.label}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{item.description}</p></div>
        </div>
      </CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 font-semibold"><LayoutTemplate className="size-5 text-brand-blue" aria-hidden />Responsive foundation</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sidebar, header, navigation, search and mobile drawer are active. Module-specific controls come in later parts.</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-5 text-[#ff7913]" aria-hidden />No fabricated records</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">This shell does not simulate completed payments, verification or device control. Shared fictional records are available on the three portal dashboard previews; this module remains scheduled for a later part.</p>
        </div>
      </div>
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:underline" href={"/"+role}>
        Return to dashboard <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
