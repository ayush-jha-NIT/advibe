import type {Metadata} from "next";
import {AdminDrivers} from "@/features/admin/part19-pages";
export const metadata:Metadata={title:"Driver Verification | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminDrivers/>;}
