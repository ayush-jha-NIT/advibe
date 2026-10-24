import type {Metadata} from "next";
import {AdminAdFormats} from "@/features/admin/part20-pages";
export const metadata:Metadata={title:"Ad Formats | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminAdFormats/>;}
