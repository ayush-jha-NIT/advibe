import {Suspense} from "react";
import type {Metadata} from "next";
import {CampaignWizard} from "@/features/advertiser/wizard";
export const metadata:Metadata={title:"Create Campaign | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){
 return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Loading campaign wizard…</p>}><CampaignWizard/></Suspense>;
}
