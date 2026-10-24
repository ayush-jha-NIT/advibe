import type {Metadata} from "next";
import {DriverNotifications} from "@/features/driver/notifications-page";
export const metadata:Metadata={title:"Driver Notifications | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverNotifications/>;}
