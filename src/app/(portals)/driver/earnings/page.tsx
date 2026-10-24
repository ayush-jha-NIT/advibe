import type {Metadata} from "next";
import {DriverEarnings} from "@/features/driver/earnings-page";
export const metadata:Metadata={title:"Earnings | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverEarnings/>;}
