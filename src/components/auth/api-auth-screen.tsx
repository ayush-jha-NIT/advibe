"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {api,ApiError,type LiveRole} from "@/services/api-client";
import {safeNext} from "@/lib/demo-auth";
type Mode="login"|"signup"|"verify"|"forgot"|"reset";
const field="block w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:border-blue-600 focus:outline-none";
const label="block text-sm font-semibold text-slate-700";
export function ApiAuthScreen({mode}:{mode:Mode}){
 const router=useRouter(),params=useSearchParams();
 const [role,setRole]=React.useState<"advertiser"|"driver">("advertiser");
 const [email,setEmail]=React.useState(""),[password,setPassword]=React.useState("");
 const [displayName,setDisplayName]=React.useState(""),[code,setCode]=React.useState("");
 const [challengeId,setChallengeId]=React.useState(""),[ticket,setTicket]=React.useState("");
 const [loading,setLoading]=React.useState(false),[error,setError]=React.useState("");
 const [notice,setNotice]=React.useState("");
 const [resetToken,setResetToken]=React.useState("");
 React.useEffect(()=>{if(mode==="reset")setResetToken(location.hash.replace(/^#token=/,""));},[mode]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setLoading(true);setError("");setNotice("");
  try{
   if(mode==="login"){
    if(challengeId){
     const result=await api<{userId:string;role:LiveRole}>("/auth/mfa/verify",{
      method:"POST",body:{challengeId,ticket,code}});
     router.replace(safeNext(params.get("next"),result.role));router.refresh();return;
    }
    const result=await api<{challengeId?:string;ticket?:string}>("/auth/login",{
     method:"POST",body:{email:email.trim().toLowerCase(),password}});
    if(result.challengeId&&result.ticket){
     setChallengeId(result.challengeId);setTicket(result.ticket);
     setPassword("");setNotice("Enter your authenticator's 6-digit code.");return;
    }
    const session=await api<{role:LiveRole}>("/auth/session");
    router.replace(safeNext(params.get("next"),session.role));router.refresh();
   }else if(mode==="signup"){
    const result=await api<{challengeId:string}>("/auth/register",{
     method:"POST",body:{role,email:email.trim().toLowerCase(),password,displayName}});
    setChallengeId(result.challengeId);setPassword("");
    setNotice("Verification code sent. Continue below.");
   }else if(mode==="verify"||mode==="signup"){
    await api("/auth/verify",{method:"POST",body:{challengeId,code}});
    router.replace("/login");router.refresh();
   }else if(mode==="forgot"){
    await api("/auth/forgot-password",{method:"POST",body:{email:email.trim().toLowerCase()}});
    setNotice("If the account is eligible, recovery instructions have been sent.");
   }else{
    await api("/auth/reset-password",{method:"POST",body:{resetToken,newPassword:password}});
    setPassword("");setResetToken("");history.replaceState(null,"",location.pathname);
    router.replace("/login");router.refresh();
   }
  }catch(e){setError(e instanceof ApiError?e.message:"Unable to reach the live authentication service");}
  finally{setLoading(false);}
 }
 const verification=mode==="verify"||(mode==="signup"&&challengeId.length>0);
 return <main className="grid min-h-dvh place-items-center bg-[#eff5fc] p-5"><section className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-7 shadow-lg">
  <div className="mb-4 text-xl font-extrabold text-[#06335b]">AdVibe · Secure account</div>
  <h1 className="mb-2 text-2xl font-bold text-[#0b335e]">{mode==="login"?"Sign in":mode==="signup"?"Create account":mode==="verify"?"Verify email":mode==="forgot"?"Reset request":"Set new password"}</h1>
  <p className="mb-5 text-sm text-slate-600">Live backend authentication. Demo credentials do not work here.</p>
  <form className="space-y-4" onSubmit={async e=>{
   if(verification){
    e.preventDefault();setLoading(true);setError("");
    try{await api("/auth/verify",{method:"POST",body:{challengeId,code}});router.replace("/login");}
    catch(err){setError(err instanceof Error?err.message:"Verification failed");}finally{setLoading(false);}
   }else await submit(e);
  }}>
   {mode==="signup"&&!verification&&<><label className={label}>Account type<select className={field} value={role} onChange={e=>setRole(e.target.value as "driver"|"advertiser")}><option value="advertiser">Advertiser</option><option value="driver">Driver</option></select></label><label className={label}>Full name<input className={field} required minLength={1} value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name"/></label></>}
   {verification?<><label className={label}>Challenge ID<input className={field} required value={challengeId} onChange={e=>setChallengeId(e.target.value)}/></label><label className={label}>Email code<input className={field} required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label></>:
    <>{mode!=="reset"&&!challengeId&&<label className={label}>Email<input className={field} type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
     {mode==="login"&&challengeId?<label className={label}>Authenticator code<input className={field} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)}/></label>:
      (mode==="login"||mode==="signup"||mode==="reset")&&<label className={label}>{mode==="reset"?"New password":"Password"}<input className={field} type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="login"?1:12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}</>}
   {mode==="reset"&&!resetToken&&<p role="alert" className="text-sm text-red-700">Open the recovery link from your email to continue.</p>}
   <button type="submit" disabled={loading||(mode==="reset"&&!resetToken)} className="min-h-11 w-full rounded-xl bg-blue-700 p-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50">{loading?"Submitting…":verification?"Verify":challengeId?"Verify authenticator":mode==="login"?"Sign in":mode==="signup"?"Register":mode==="forgot"?"Send recovery email":"Reset password"}</button>
  </form>
  {notice&&<p role="status" className="mt-4 text-sm text-green-800">{notice}</p>}
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-blue-800"><Link href="/login">Sign in</Link><Link href="/signup">Register</Link><Link href="/forgot-password">Forgot password</Link><Link href="/">Home</Link></div>
 </section></main>;
}
