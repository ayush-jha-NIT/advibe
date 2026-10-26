import {ApiAuthScreen} from "@/components/auth/api-auth-screen";
import type {Metadata} from "next";
import {Suspense} from "react";
import {LoginScreen} from "@/components/auth/login-screen";
export const metadata:Metadata={title:"Demo Login",robots:{index:false,follow:false}};
export default function Page(){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiAuthScreen mode="login"/>;return <Suspense fallback={<p role="status">Loading login…</p>}><LoginScreen/></Suspense>;}
