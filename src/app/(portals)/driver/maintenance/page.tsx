import type {Metadata} from "next";
import {DriverMaintenance} from "@/features/driver/maintenance-page";
export const metadata:Metadata={title:"Maintenance & Issues | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverMaintenance/>;}
