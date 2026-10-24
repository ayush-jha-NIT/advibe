"use client";
import * as React from "react";
import {useDemoAuth} from "@/services/demo-auth-store";
export function AuthHydration({children}:{children:React.ReactNode}){
 const [ready,setReady]=React.useState(false);
 React.useEffect(()=>{
  let mounted=true;
  void useDemoAuth.persist.rehydrate().then(()=>{if(mounted)setReady(true);});
  return ()=>{mounted=false;};
 },[]);
 if(!ready)return <div role="status" className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Loading demo account…</div>;
 return <>{children}</>;
}
