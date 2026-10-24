"use client";
import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {driverSeed,sanitizedDriverDraft,type DriverDraft} from "../features/driver/onboarding-model";
type State={
 drafts:Record<string,DriverDraft>;
 patch:(id:string,updates:Partial<DriverDraft>)=>void;
 replace:(id:string,draft:DriverDraft)=>void;
 clear:(id:string)=>void;
};
type Saved={drafts:Record<string,DriverDraft>};
export const useDriverOnboarding=create<State>()(persist<State,[],[],Saved>((set)=>({
 drafts:{},
 patch:(id,updates)=>set(s=>({drafts:{...s.drafts,[id]:sanitizedDriverDraft({...driverSeed,...s.drafts[id],...updates})}})),
 replace:(id,draft)=>set(s=>({drafts:{...s.drafts,[id]:sanitizedDriverDraft(draft)}})),
 clear:id=>set(s=>{const drafts={...s.drafts};delete drafts[id];return {drafts};}),
}),{
 name:"advibe:driver-onboarding-preview:v1",version:1,
 // Onboarding sample data belongs to this tab session only, never localStorage.
 storage:createJSONStorage(()=>sessionStorage),skipHydration:true,
 partialize:s=>({drafts:s.drafts}),migrate:()=>({drafts:{}})
}));
