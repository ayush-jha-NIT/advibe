import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/shared/section-placeholder";
import { findPortalSection } from "@/config/navigation";
export default async function SectionPage({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 const item=findPortalSection("admin",section);
 if(!item)notFound();
 return <SectionPlaceholder role="admin" item={item}/>;
}
