import type {Metadata} from "next";
import {AdminAnalytics} from "@/features/admin/part21-reports";
export const metadata:Metadata={title:"analytics | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminAnalytics/>;}
