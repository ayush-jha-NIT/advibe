import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function PublicPlaceholder({title,description,phase}:{title:string;description:string;phase:"public"|"auth"}) {
  return <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-10 sm:px-6 sm:py-16">
    <div className="max-w-2xl space-y-4">
      <Badge tone="orange">Route scaffold · {phase==="auth"?"Part 6 authentication pending":"Part 5 content pending"}</Badge>
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">{title}</h1>
      <p className="text-base leading-7 text-muted-foreground">{description}</p>
    </div>
    <Card><CardContent className="grid gap-5 pt-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#e9f1ff] text-brand-blue">
        {phase==="auth"?<ClipboardList className="size-7" aria-hidden/>:<Sparkles className="size-7" aria-hidden/>}
      </div>
      <div>
        <h2 className="text-lg font-semibold">Layout and navigation are ready</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">This is a route placeholder, not a completed page. Approved artwork, forms and final interactions will be added in their scheduled implementation part.</p>
      </div>
    </CardContent></Card>
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-brand-blue hover:underline">Back to home <ArrowRight className="size-4" aria-hidden/></Link>
  </div>;
}
