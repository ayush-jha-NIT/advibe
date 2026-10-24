import type {Metadata} from "next";
import {DriverCampaigns} from "@/features/driver/campaigns-page";
export const metadata:Metadata={title:"Assigned Campaigns | AdVibe Partner",robots:{index:false,follow:false}};
export default function Page(){return <DriverCampaigns/>;}
