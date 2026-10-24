import type {Metadata} from "next";
import {Suspense} from "react";
import {LoginScreen} from "@/components/auth/login-screen";
export const metadata:Metadata={title:"Demo Login",robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p role="status">Loading login…</p>}><LoginScreen/></Suspense>;}
