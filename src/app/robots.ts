import type {MetadataRoute} from "next";

/** Search indexing is opt-in only after legal, factual, and operational release review. */
export default function robots():MetadataRoute.Robots{
 const enabled=process.env.SITE_INDEXING_ENABLED==="true";
 return {
  rules:enabled
   ?[{userAgent:"*",allow:"/",disallow:["/admin/","/advertiser/","/driver/","/login","/signup","/verify","/forgot-password","/reset-password","/design-system","/api/"]}]
   :[{userAgent:"*",disallow:"/"}]
 };
}
