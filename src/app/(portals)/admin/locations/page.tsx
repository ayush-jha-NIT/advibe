import type {Metadata} from "next";
import {AdminLocations} from "@/features/admin/part19-pages";
export const metadata:Metadata={title:"Locations and Zones | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminLocations/>;}
