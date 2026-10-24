import type {Metadata} from "next";
import {AdvertiserAdFormats} from "@/features/advertiser/ad-formats-page";
export const metadata:Metadata={title:"Ad Formats | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserAdFormats/>;}
