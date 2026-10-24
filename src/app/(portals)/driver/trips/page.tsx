import type {Metadata} from "next";
import {DriverActivity} from "@/features/driver/activity-page";
export const metadata:Metadata={title:"Trips & Exposure | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverActivity mode="trips"/>;}
