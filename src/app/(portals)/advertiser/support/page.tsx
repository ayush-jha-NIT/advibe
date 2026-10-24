import type {Metadata} from "next";
import {AdvertiserSupport} from "@/features/advertiser/support-page";
export const metadata:Metadata={title:"Help & Support | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserSupport/>;}
