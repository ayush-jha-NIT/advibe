import type {MetadataRoute} from "next";

const publicPaths=["/","/for-advertisers","/for-drivers","/ad-formats","/locations","/pricing","/about","/contact","/help-center"];

export default function sitemap():MetadataRoute.Sitemap{
 if(process.env.SITE_INDEXING_ENABLED!=="true")return [];
 const appUrl=process.env.NEXT_PUBLIC_APP_URL;
 if(!appUrl)return [];
 let origin:URL;
 try{origin=new URL(appUrl);}catch{return [];}
 if(origin.protocol!=="https:")return [];
 return publicPaths.map(path=>({url:new URL(path,origin).toString(),changeFrequency:"weekly" as const,priority:path==="/"?1:0.7}));
}
