import type {Metadata} from "next";
import {DriverProfile} from "@/features/driver/profile-page";
export const metadata:Metadata={title:"Driver Profile | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverProfile/>;}
