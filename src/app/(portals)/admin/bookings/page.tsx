import type {Metadata} from "next";
import {AdminBookings} from "@/features/admin/part20-pages";
export const metadata:Metadata={title:"Bookings | AdVibe Admin",robots:{index:false,follow:false}};
export default function Page(){return <AdminBookings/>;}
