import type {Metadata} from "next";
import {AdminPayments} from "@/features/admin/part20-pages";
export const metadata:Metadata={title:"Payments | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminPayments/>;}
