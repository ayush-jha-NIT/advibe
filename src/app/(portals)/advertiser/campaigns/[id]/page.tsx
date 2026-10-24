import type {Metadata} from "next";
import {CampaignDetailsPage} from "@/features/advertiser/campaign-details";
export const metadata:Metadata={title:"Campaign Details | AdVibe Advertiser",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <CampaignDetailsPage campaignId={id}/>;
}
