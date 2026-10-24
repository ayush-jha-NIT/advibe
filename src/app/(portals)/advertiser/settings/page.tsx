import type {Metadata} from "next";
import {AdvertiserSettings} from "@/features/advertiser/settings-page";
export const metadata:Metadata={title:"Profile & Settings | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserSettings/>;}
