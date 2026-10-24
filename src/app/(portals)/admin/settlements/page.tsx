import type {Metadata} from "next";
import {AdminSettlements} from "@/features/admin/part20-pages";
export const metadata:Metadata={title:"Settlements | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminSettlements/>;}
