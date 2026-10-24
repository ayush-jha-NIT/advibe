import type {Metadata} from "next";
import {Suspense} from "react";
import {SignupScreen} from "@/components/auth/signup-screen";
export const metadata:Metadata={title:"Demo Registration",robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p role="status">Loading signup…</p>}><SignupScreen/></Suspense>;}
