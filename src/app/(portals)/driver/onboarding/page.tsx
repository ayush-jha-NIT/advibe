import type {Metadata} from "next";
import {DriverOnboarding} from "@/features/driver/onboarding-page";
export const metadata:Metadata={title:"Driver Onboarding | AdVibe Partner",robots:{index:false,follow:false}};
export default function Page(){return <DriverOnboarding/>;}
