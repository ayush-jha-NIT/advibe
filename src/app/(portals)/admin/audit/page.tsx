import type {Metadata} from "next";
import {AdminAudit} from "@/features/admin/part21-operations";
export const metadata:Metadata={title:"audit | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminAudit/>;}
