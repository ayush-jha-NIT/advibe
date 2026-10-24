import type {Metadata} from "next";
import {AdminAdvertisers} from "@/features/admin/part21-reports";
export const metadata:Metadata={title:"advertisers | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminAdvertisers/>;}
