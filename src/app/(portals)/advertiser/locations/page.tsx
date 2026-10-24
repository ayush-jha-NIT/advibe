import type {Metadata} from "next";
import {Suspense} from "react";
import {AdvertiserLocations} from "@/features/advertiser/locations-page";
export const metadata:Metadata={title:"Locations & Screens | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Loading location filters…</p>}><AdvertiserLocations/></Suspense>;}
