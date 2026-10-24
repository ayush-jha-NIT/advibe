import type {Metadata} from "next";
import {AdminApprovals} from "@/features/admin/part18-pages";
export const metadata:Metadata={title:"Campaign and Creative Approvals | AdVibe",robots:{index:false,follow:false}};
export default function Page(){return <AdminApprovals/>;}
