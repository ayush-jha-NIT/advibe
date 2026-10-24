"use client";
import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {defaultWizardDraft,type WizardDraft} from "../features/advertiser/wizard-model";
type State={
 drafts:Record<string,WizardDraft>;
 update:(accountId:string,patch:Partial<WizardDraft>)=>void;
 replace:(accountId:string,draft:WizardDraft)=>void;
 clear:(accountId:string)=>void;
};
type Saved={drafts:Record<string,WizardDraft>};
export const useWizardStore=create<State>()(persist<State,[],[],Saved>((set)=>({
 drafts:{},
 update:(accountId,patch)=>set(s=>({drafts:{...s.drafts,[accountId]:{...defaultWizardDraft,...s.drafts[accountId],...patch}}})),
 replace:(accountId,draft)=>set(s=>({drafts:{...s.drafts,[accountId]:draft}})),
 clear:(accountId)=>set(s=>{const drafts={...s.drafts};delete drafts[accountId];return {drafts};}),
}),{
 name:"advibe:campaign-wizard:v1",version:1,storage:createJSONStorage(()=>localStorage),skipHydration:true,
 partialize:({drafts})=>({drafts}),
 migrate:()=>({drafts:{}}),
}));
