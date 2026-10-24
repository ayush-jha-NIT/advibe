import type {Metadata} from "next";
import {AdminSettings} from "@/features/admin/part21-operations";
export const metadata:Metadata={title:"settings | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminSettings/>;}
