import type {Metadata} from "next";
import {AdminDashboard} from "@/features/admin/part18-pages";
export const metadata:Metadata={title:"Admin Dashboard | AdVibe",robots:{index:false,follow:false}};
export default function Page(){return <AdminDashboard/>;}
