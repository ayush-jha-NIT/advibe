import type {Metadata} from "next";
import {ResetPasswordScreen} from "@/components/auth/recovery-screens";
export const metadata:Metadata={title:"Demo Password Reset",robots:{index:false,follow:false}};
export default function Page(){return <ResetPasswordScreen/>;}
