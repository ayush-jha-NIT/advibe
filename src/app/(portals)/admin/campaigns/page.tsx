import type {Metadata} from "next";
import {AdminCampaigns} from "@/features/admin/part18-pages";
export const metadata:Metadata={title:"Campaign Operations | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminCampaigns/>;}
