import type {Metadata} from "next";
import {DriverDashboard} from "@/features/driver/driver-dashboard";
export const metadata:Metadata={title:"Driver Dashboard | AdVibe Partner",robots:{index:false,follow:false}};
export default function Page(){return <DriverDashboard/>;}
