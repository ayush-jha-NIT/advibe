"use client";
import * as React from "react";
import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
export type AdvertiserPreferences={showDashboardNotices:boolean;campaignPageSize:5|10|20};
export const defaultAdvertiserPreferences:AdvertiserPreferences={showDashboardNotices:true,campaignPageSize:5};
type State={values:Record<string,AdvertiserPreferences>;update:(accountId:string,patch:Partial<AdvertiserPreferences>)=>void;reset:(accountId:string)=>void};
type Saved={values:Record<string,AdvertiserPreferences>};
export const useAdvertiserPreferences=create<State>()(persist<State,[],[],Saved>((set)=>({
 values:{},
 update:(accountId,patch)=>set(s=>({values:{...s.values,[accountId]:{...defaultAdvertiserPreferences,...s.values[accountId],...patch}}})),
 reset:(accountId)=>set(s=>{const values={...s.values};delete values[accountId];return {values};}),
}),{name:"advibe:advertiser-preferences:v1",version:1,storage:createJSONStorage(()=>localStorage),
 skipHydration:true,partialize:s=>({values:s.values}),migrate:()=>({values:{}})}));
export function useAdvertiserPrefs(accountId:string){
 const values=useAdvertiserPreferences(s=>s.values[accountId]??defaultAdvertiserPreferences);
 React.useEffect(()=>{void Promise.resolve(useAdvertiserPreferences.persist.rehydrate());},[]);
 return values;
}
