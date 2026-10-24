"use client";
import * as React from "react";
import {Eye,EyeOff,Info} from "lucide-react";
import {cn} from "@/lib/utils";

export const control="min-h-12 w-full rounded-xl border border-[#d1e0f2] bg-white px-4 text-sm text-[#09234a] placeholder:text-[#90a1bb] outline-none transition focus:border-[#076bfa] focus:ring-2 focus:ring-[#cfe4ff] disabled:bg-[#f4f7fb]";
export const label="mb-1.5 block text-sm font-semibold text-[#18345c]";
export function AuthPanel({heading,description,children}:{heading:string;description:string;children:React.ReactNode}){
 return <section className="rounded-3xl border border-[#e1eaf9] bg-white p-5 shadow-[0_16px_70px_#07346c12] sm:p-8">
  <div className="mb-6"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e9f2ff] px-3 py-1.5 text-xs font-bold text-brand-blue">AdVibe account · Demo</div>
   <h2 className="text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">{heading}</h2>
   <p className="mt-2 text-sm leading-6 text-[#667b9d]">{description}</p></div>
  {children}
 </section>;
}
export function DemoWarning(){
 return <p className="flex items-start gap-2 rounded-xl border border-[#f7deb4] bg-[#fff8eb] p-3 text-xs leading-5 text-[#7d5421]"><Info className="mt-0.5 size-4 shrink-0"/>Demo only: no email, OTP or password is sent or verified by a server. Do not enter a real password, banking information or identification documents.</p>;
}
export function PasswordControl({id,value,onChange,autoComplete="new-password",placeholder="Enter password",required=true}:{id:string;value:string;onChange:(s:string)=>void;autoComplete?:string;placeholder?:string;required?:boolean}){
 const [visible,setVisible]=React.useState(false);
 return <div className="relative"><input id={id} type={visible?"text":"password"} autoComplete={autoComplete} required={required} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={cn(control,"pr-12")}/><button type="button" aria-label={visible?"Hide password":"Show password"} aria-pressed={visible} onClick={()=>setVisible(v=>!v)} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-[#526c96] hover:bg-[#edf4ff]">{visible?<EyeOff className="size-5"/>:<Eye className="size-5"/>}</button></div>;
}
export function Feedback({error,notice}:{error?:string;notice?:string}){
 if(!error&&!notice)return null;
 return <p role={error?"alert":"status"} className={cn("mt-4 rounded-xl border px-4 py-3 text-sm leading-6",error?"border-[#ffcbd0] bg-[#fff0f2] text-[#b32636]":"border-[#bdded3] bg-[#eefaf5] text-[#156044]")}>{error||notice}</p>;
}
export const submitClass="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0052d9] disabled:cursor-not-allowed disabled:opacity-50";
