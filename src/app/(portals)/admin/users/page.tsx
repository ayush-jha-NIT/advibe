import type {Metadata} from "next";
import {AdminUsers} from "@/features/admin/part21-reports";
export const metadata:Metadata={title:"users | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminUsers/>;}
