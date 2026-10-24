import type {Metadata} from "next";
import {DriverVehiclePage} from "@/features/driver/vehicle-page";
export const metadata:Metadata={title:"My Vehicle & Screens | AdVibe Partner",robots:{index:false,follow:false}};
export default function Page(){return <DriverVehiclePage/>;}
