import type {Metadata} from "next";
import {AdvertiserNotifications} from "@/features/advertiser/notifications-page";
export const metadata:Metadata={title:"Notifications | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <AdvertiserNotifications/>;}
