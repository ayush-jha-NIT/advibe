import type {Metadata} from "next";
import {AdvertiserReports} from "@/features/advertiser/reports-page";
export const metadata:Metadata={title:"Reports & Analytics | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserReports/>;}
