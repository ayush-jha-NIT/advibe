import type {Metadata} from "next";
import {DriverPayouts} from "@/features/driver/payouts-page";
export const metadata:Metadata={title:"Payout History | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverPayouts/>;}
