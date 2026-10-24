"use client";
import * as React from "react";
import {useRouter} from "next/navigation";
import {useWizardStore} from "@/services/wizard-store";
import {defaultWizardDraft} from "./wizard-model";
import type {Placement} from "@/types/domain";

/** Explicit visitor action; never reserves inventory or creates a campaign record. */
export function usePlanNavigation(accountId:string){
 const router=useRouter();
 const [ready,setReady]=React.useState(false);
 React.useEffect(()=>{
  let active=true;
  void Promise.resolve(useWizardStore.persist.rehydrate()).then(()=>{if(active)setReady(true);});
  return ()=>{active=false;};
 },[]);
 function applyToWizard(input:{placement:Placement;screenIds?:string[];startDate?:string;endDate?:string}):boolean{
  if(!ready||accountId==="not-provisioned")return false;
  const original=useWizardStore.getState().drafts[accountId];
  if(original&&(original.title||original.business||original.campaignId||original.selectedScreenIds.length)&&
   !window.confirm("Apply these demo targeting choices to your wizard? Current unsaved format, creative and screen selections will be replaced. Previously saved campaign records remain unchanged."))return false;
  useWizardStore.getState().replace(accountId,{
   ...defaultWizardDraft,...original,campaignId:null,placement:input.placement,
   creativeMode:"existing",creativeId:"",creativeTitle:"",selectedScreenIds:input.screenIds??[],
   ...(input.startDate?{startDate:input.startDate}:{}),...(input.endDate?{endDate:input.endDate}:{}),
   agreed:false,
  });
  router.push("/advertiser/create-campaign?step=1");
  return true;
 }
 return {ready,applyToWizard};
}
