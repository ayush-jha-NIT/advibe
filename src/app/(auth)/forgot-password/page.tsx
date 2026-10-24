import type {Metadata} from "next";
import {ForgotPasswordScreen} from "@/components/auth/recovery-screens";
export const metadata:Metadata={title:"Demo Account Recovery",robots:{index:false,follow:false}};
export default function Page(){return <ForgotPasswordScreen/>;}
