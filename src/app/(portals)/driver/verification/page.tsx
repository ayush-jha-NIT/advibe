import type {Metadata} from "next";
import {DriverVerification} from "@/features/driver/verification-page";
export const metadata:Metadata={title:"Verification Status | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverVerification/>;}
