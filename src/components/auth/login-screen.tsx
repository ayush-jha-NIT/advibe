"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowRight,UserRound} from "lucide-react";
import {DEMO_USERS,DEMO_PASSWORD,isEmail,parseAuthRole,safeNext,type AuthRole} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {AuthPanel,control,label,DemoWarning,Feedback,PasswordControl,submitClass} from "./form-elements";

export function LoginScreen(){
 const router=useRouter(),params=useSearchParams();
 const [role,setRole]=React.useState<AuthRole>(()=>parseAuthRole(params.get("role")));
 const [email,setEmail]=React.useState(""),[password,setPassword]=React.useState(""),[error,setError]=React.useState("");
 const login=useDemoAuth(s=>s.demoLogin);
 const user=DEMO_USERS.find(u=>u.role===role)!;
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(!isEmail(email)){setError("Enter a valid email address.");return;}
  try{login(role,email,password);router.replace(safeNext(params.get("next"),role));}
  catch(e){setError(e instanceof Error?e.message:"Demo sign-in unavailable.");}
 }
 return <AuthPanel heading="Welcome Back" description="Choose a role and continue into the AdVibe demo portal.">
  <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-[#edf3fc] p-1" role="group" aria-label="Demo login account type">
   {(["advertiser","driver","admin"] as const).map(r=><button type="button" key={r} aria-pressed={role===r} onClick={()=>{setRole(r);setEmail("");setPassword("");setError("");}} className={"min-h-11 rounded-lg px-1 text-xs font-bold sm:text-sm "+(role===r?"bg-white text-brand-blue shadow-sm":"text-[#647a9e] hover:text-brand-navy")}>{r==="driver"?"Driver":r==="admin"?"Admin":"Advertiser"}</button>)}
  </div>
  <form onSubmit={submit} noValidate className="space-y-4">
   <div><label htmlFor="login-email" className={label}>Email address</label><input id="login-email" className={control} type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter demo email"/></div>
   <div><div className="flex items-center justify-between gap-2"><label htmlFor="login-password" className={label}>Password</label><Link href="/forgot-password" className="mb-1.5 text-xs font-bold text-brand-blue hover:underline">Forgot password?</Link></div><PasswordControl id="login-password" autoComplete="current-password" value={password} onChange={setPassword} placeholder="Enter demo password"/></div>
   <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#a7c8f6] bg-[#f0f7ff] px-3 text-xs font-bold text-brand-blue hover:bg-[#e0efff]" onClick={()=>{setEmail(user.email);setPassword(DEMO_PASSWORD);setError("");}}><UserRound className="size-4"/>Fill {role} demo credentials</button>
   <button type="submit" className={submitClass}>Sign in to demo <ArrowRight className="size-4"/></button>
  </form>
  <Feedback error={error}/>
  <p className="mt-5 text-center text-sm text-[#647b9c]">New to AdVibe? <Link href="/signup" className="font-bold text-brand-blue hover:underline">Create an account</Link></p>
  <div className="mt-5"><DemoWarning/></div>
 </AuthPanel>;
}
