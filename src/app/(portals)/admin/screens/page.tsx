import type {Metadata} from "next";
import {AdminScreens} from "@/features/admin/part19-pages";
export const metadata:Metadata={title:"Screens and Devices | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminScreens/>;}
