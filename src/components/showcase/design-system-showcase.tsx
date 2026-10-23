"use client";

import * as React from "react";
import {
  ArrowRight, Bell, CheckCircle2, ChevronRight, CircleAlert, CreditCard,
  LayoutDashboard, MapPin, Megaphone, MonitorPlay, Settings2,
  ShieldCheck, Sparkles, Users, Wallet, XCircle,
} from "lucide-react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, Field, Input, Select, Skeleton, Switch, Tabs, Textarea } from "@/components/ui";
import { palette, PORTALS, portalDisplayName, type Portal } from "@/lib/theme";

const demoSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters."),
  email: z.email("Enter a valid email address."),
});

const chips = [
  ["Navy", palette.navy], ["Blue", palette.blue], ["Orange", palette.orange],
  ["Purple", palette.purple], ["Green", palette.green], ["Amber", palette.amber],
  ["Red", palette.red],
] as const;

const roleIcons = {
  public: Megaphone,
  admin: ShieldCheck,
  advertiser: LayoutDashboard,
  driver: MonitorPlay,
};

export function DesignSystemShowcase() {
  const [portal, setPortal] = React.useState<Portal>("public");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [updates, setUpdates] = React.useState(true);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [goal, setGoal] = React.useState("awareness");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string; email?: string }>({});
  const [feedback, setFeedback] = React.useState("");
  const RoleIcon = roleIcons[portal];

  function validate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = demoSchema.safeParse({ name, email });
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      setErrors({ name: issues.name?.[0], email: issues.email?.[0] });
      setFeedback("");
      return;
    }
    setErrors({});
    setFeedback("Form validated locally. No campaign has been created.");
  }

  return (
    <div data-portal={portal} className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-brand-navy text-white">
        <div className="mx-auto flex min-h-19 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo priority width={185} className="w-[150px] sm:w-[185px]" />
          <div className="hidden items-center gap-3 md:flex">
            <Badge tone="info" shape="pill">Part 1 · Design foundation</Badge>
            <span className="text-xs text-white/70">59 approved references · 4 portals</span>
          </div>
          <Button variant="brand" size="sm" onClick={() => setDialogOpen(true)}>
            Component demo <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="grid items-center gap-7 rounded-3xl bg-[linear-gradient(125deg,#041b3d,#0a3577)] px-5 py-8 text-white shadow-xl sm:px-9 sm:py-12 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9ec7ff]">AdVibe · UI Foundation</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              One design language. <span className="text-[#ff821e]">Four experiences.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              A mobile-first component specimen for the approved AdVibe designs. Portal pages and functional business flows follow in subsequent parts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="brand" onClick={() => setDialogOpen(true)}>Preview a dialog <ArrowRight className="size-4" aria-hidden /></Button>
              <Button variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => document.getElementById("components")?.scrollIntoView({ behavior: "smooth" })}>
                Explore components
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/15"><RoleIcon className="size-6 text-white" aria-hidden /></div>
                <div><p className="text-xs text-white/65">Selected environment</p><p className="font-semibold">{portalDisplayName[portal]}</p></div>
              </div>
              <span className="size-3 rounded-full bg-[#18cc78]" aria-hidden />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[["Navigation", "Responsive"], ["Buttons", "Accessible"], ["Theme", "Role-aware"], ["Forms", "Validated"]].map(([title, value]) => (
                <div key={title} className="min-w-0 rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs text-white/60">{title}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Portal theme selector" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="text-xl font-bold tracking-tight sm:text-2xl">Portal color system</h2><p className="mt-1 text-sm text-muted-foreground">Change portal context to test the primary action color.</p></div>
            <Badge tone="success"><CheckCircle2 className="size-3.5" aria-hidden /> Interactive</Badge>
          </div>
          <Tabs label="Choose portal theme" tabs={PORTALS.map((value) => ({ value, label: portalDisplayName[value] }))} value={portal} onValueChange={(value) => setPortal(value as Portal)} />
          <div className="flex flex-wrap gap-2">
            {chips.map(([label, hex]) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium">
                <span className="size-6 rounded-md border border-black/5" style={{ background: hex }} aria-hidden />
                <span>{label}</span><span className="text-muted-foreground">{hex}</span>
              </div>
            ))}
          </div>
        </section>

        <div id="components" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Buttons and status</CardTitle><CardDescription>Semantic variants, keyboard focus, loading and disabled states.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setFeedback("Primary action activated.")}>Primary <ArrowRight className="size-4" aria-hidden /></Button>
                <Button variant="brand" onClick={() => setFeedback("Orange brand action activated.")}>Brand CTA</Button>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>Outline</Button>
                <Button variant="secondary" onClick={() => setFeedback("Secondary action activated.")}>Secondary</Button>
                <Button variant="ghost" onClick={() => setFeedback("Ghost action activated.")}>Ghost</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary">Compact</Button>
                <Button variant="destructive" size="sm" onClick={() => setFeedback("This is a demo action, no record was deleted.")}>Destructive</Button>
                <Button variant="primary" size="sm" loading>Loading</Button>
                <Button variant="primary" size="sm" disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success" shape="pill">Active</Badge>
                <Badge tone="warning" shape="pill">Pending</Badge>
                <Badge tone="danger" shape="pill">Rejected</Badge>
                <Badge tone="info" shape="pill">Under review</Badge>
                <Badge tone="purple" shape="pill">Admin</Badge>
                <Badge tone="orange" shape="pill">Campaign</Badge>
              </div>
              {feedback ? <p role="status" className="rounded-lg bg-[#edf7ff] px-3 py-2 text-sm text-[#124b90]">{feedback}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Form primitives</CardTitle><CardDescription>Real client-side validation for this demo form; no data is sent.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={validate} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field htmlFor="demo-name" label="Business name" required error={errors.name}>
                    <Input id="demo-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your business" invalid={!!errors.name} aria-describedby={errors.name ? "demo-name-error" : undefined} />
                  </Field>
                  <Field htmlFor="demo-email" label="Email address" required error={errors.email}>
                    <Input id="demo-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" invalid={!!errors.email} aria-describedby={errors.email ? "demo-email-error" : undefined} />
                  </Field>
                </div>
                <Field htmlFor="demo-goal" label="Campaign objective">
                  <Select id="demo-goal" value={goal} onChange={(event) => setGoal(event.target.value)}>
                    <option value="awareness">Brand awareness</option><option value="traffic">Store visits</option><option value="offers">Promote an offer</option>
                  </Select>
                </Field>
                <Field htmlFor="demo-notes" label="Notes" description="Optional. Stored only in this preview's temporary state.">
                  <Textarea id="demo-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Campaign notes..." />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch aria-label="Demo notifications" checked={updates} onCheckedChange={setUpdates} />
                    <span className="text-sm">Email updates {updates ? "on" : "off"}</span>
                  </div>
                  <Button type="submit">Validate form <ChevronRight className="size-4" aria-hidden /></Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
          <Card>
            <CardHeader><CardTitle>Dashboard primitives</CardTitle><CardDescription>Data-card visual patterns for the upcoming portal shells.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {icon: Megaphone,title:"Campaigns",value:"24",change:"+12%",color:"bg-[#eaf1ff] text-brand-blue"},
                  {icon: Users,title:"Estimated reach",value:"50K+",change:"+18%",color:"bg-[#e9f9f0] text-[#079c52]"},
                  {icon: Wallet,title:"Demo revenue",value:"₹48,750",change:"+8%",color:"bg-[#fff0e2] text-brand-orange"},
                ].map((metric) => (
                  <div key={metric.title} className="min-w-0 rounded-xl border border-line p-4">
                    <div className={"inline-flex size-10 items-center justify-center rounded-xl " + metric.color}><metric.icon className="size-5" aria-hidden /></div>
                    <p className="mt-3 text-xs text-muted-foreground">{metric.title}</p>
                    <p className="mt-1 text-xl font-bold">{metric.value}</p>
                    <Badge tone="success" className="mt-2">{metric.change} sample</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[{icon: MapPin,name:"Locations"},{icon: Settings2,name:"Settings"},{icon: CreditCard,name:"Billing"},{icon: Bell,name:"Alerts"}].map((tile) => (
                  <div key={tile.name} className="flex min-h-21 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-[#fbfdff] text-sm font-medium">
                    <tile.icon className="size-5 text-brand-blue" aria-hidden />{tile.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Loading and feedback</CardTitle><CardDescription>Consistent skeleton and message styles.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3"><Skeleton className="size-11 rounded-full"/><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3"/><Skeleton className="h-3 w-1/2"/></div></div>
              <Skeleton className="h-15 w-full"/>
              <div className="flex gap-2 rounded-xl border border-[#bee7d2] bg-[#f0fbf5] p-3 text-sm text-[#087342]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> Shared components are ready for portal integration.
              </div>
              <div className="flex gap-2 rounded-xl border border-[#f4d4b1] bg-[#fff8ee] p-3 text-sm text-[#965300]">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Charts and totals in this specimen are illustrative.
              </div>
              <div className="flex gap-2 rounded-xl border border-[#f5bdc8] bg-[#fff2f4] p-3 text-sm text-[#b52238]">
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> Production services are not connected.
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t border-line pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>AdVibe · Part 1 design system preview</p>
          <p>Mobile-first · Accessible controls · Cashfree planned for a later part</p>
        </footer>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Reusable modal component" description="This native dialog demonstrates mobile width, focus management and Escape-to-close behavior."
        footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => { setDialogOpen(false); setFeedback("Dialog confirmed successfully."); }}>Confirm <Sparkles className="size-4" aria-hidden /></Button></>}>
        <div className="flex items-center gap-3 rounded-xl bg-surface-alt p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e1edff]"><ShieldCheck className="size-6 text-brand-blue" aria-hidden /></span>
          <p className="text-sm leading-6 text-muted-foreground">The same dialog API can power campaign confirmations, driver verification reviews and admin decisions in later phases.</p>
        </div>
      </Dialog>
    </div>
  );
}
