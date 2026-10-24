import type {Metadata} from "next";
import {DriverSupport} from "@/features/driver/support-page";
export const metadata:Metadata={title:"Driver Support | AdVibe Driver",robots:{index:false,follow:false}};
export default function Page(){return <DriverSupport/>;}
