import type {Metadata} from "next";
import {AdvertiserBilling} from "@/features/advertiser/billing-page";
export const metadata:Metadata={title:"Billing & Payments | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserBilling/>;}
