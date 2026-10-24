import type {Metadata} from "next";
import {CreativeLibrary} from "@/features/advertiser/creative-library";
export const metadata:Metadata={title:"Creative Library | AdVibe Advertiser",robots:{index:false,follow:false}};
export default function Page(){return <CreativeLibrary/>;}
