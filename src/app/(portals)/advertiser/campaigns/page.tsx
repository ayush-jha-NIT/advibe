import {Suspense} from "react";
import {AdvertiserCampaignList} from "@/features/advertiser/campaign-list";
export default function Page(){return <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading campaigns…</p>}><AdvertiserCampaignList/></Suspense>;}
