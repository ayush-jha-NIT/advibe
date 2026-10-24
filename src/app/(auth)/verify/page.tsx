import type {Metadata} from "next";
import {VerifyScreen} from "@/components/auth/verify-screen";
export const metadata:Metadata={title:"Demo Verification",robots:{index:false,follow:false}};
export default function Page(){return <VerifyScreen/>;}
