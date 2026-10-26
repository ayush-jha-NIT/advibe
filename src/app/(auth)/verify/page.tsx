import {ApiAuthScreen} from "@/components/auth/api-auth-screen";
import type {Metadata} from "next";
import {VerifyScreen} from "@/components/auth/verify-screen";
export const metadata:Metadata={title:"Demo Verification",robots:{index:false,follow:false}};
export default function Page(){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiAuthScreen mode="verify"/>;return <VerifyScreen/>;}
