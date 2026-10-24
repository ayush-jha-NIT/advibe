import type {Metadata} from "next";
import {AdminNotifications} from "@/features/admin/part21-operations";
export const metadata:Metadata={title:"notifications | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminNotifications/>;}
