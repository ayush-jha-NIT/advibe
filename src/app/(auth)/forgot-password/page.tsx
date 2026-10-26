import {ApiAuthScreen} from "@/components/auth/api-auth-screen";
import type {Metadata} from "next";
import {ForgotPasswordScreen} from "@/components/auth/recovery-screens";
export const metadata:Metadata={title:"Demo Account Recovery",robots:{index:false,follow:false}};
export default function Page(){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiAuthScreen mode="forgot"/>;return <ForgotPasswordScreen/>;}
