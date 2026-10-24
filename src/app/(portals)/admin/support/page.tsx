import type {Metadata} from "next";
import {AdminSupport} from "@/features/admin/part21-operations";
export const metadata:Metadata={title:"support | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminSupport/>;}
