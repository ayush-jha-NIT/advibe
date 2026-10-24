import type {Metadata} from "next";
import {DriverAssignedAds} from "@/features/driver/assigned-ads-page";
export const metadata:Metadata={title:"Assigned Ads & Daily Schedule | AdVibe Partner",robots:{index:false,follow:false}};
export default function Page(){return <DriverAssignedAds/>;}
