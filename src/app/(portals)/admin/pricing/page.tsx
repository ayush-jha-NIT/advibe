import type {Metadata} from "next";
import {AdminPricing} from "@/features/admin/part20-pages";
export const metadata:Metadata={title:"Pricing | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminPricing/>;}
