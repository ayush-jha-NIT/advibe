import {ApiAuthScreen} from "@/components/auth/api-auth-screen";
import type {Metadata} from "next";
import {Suspense} from "react";
import {SignupScreen} from "@/components/auth/signup-screen";
export const metadata:Metadata={title:"Demo Registration",robots:{index:false,follow:false}};
export default function Page(){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiAuthScreen mode="signup"/>;return <Suspense fallback={<p role="status">Loading signup…</p>}><SignupScreen/></Suspense>;}
