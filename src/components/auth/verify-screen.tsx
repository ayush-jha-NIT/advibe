"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,ChevronLeft,Clock3,Mail} from "lucide-react";
import {DEMO_CODE,DEMO_CODE_TTL_MS,DEMO_RESEND_DELAY_MS} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {AuthPanel,DemoWarning,Feedback,label,submitClass} from "./form-elements";
export function VerifyScreen(){
 const router=useRouter();
 const pending=useDemoAuth(s=>s.pending),verify=useDemoAuth(s=>s.verifyCode),resend=useDemoAuth(s=>s.resend);
 const [digits,setDigits]=React.useState(["","","","","",""]),[error,setError]=React.useState(""),[notice,setNotice]=React.useState("");
 const [now,setNow]=React.useState(()=>Date.now());
 const refs=React.useRef<Array<HTMLInputElement|null>>([]);
 React.useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return ()=>window.clearInterval(id);},[]);
 const remaining=Math.max(0,Math.ceil(((pending?.issuedAt??0)+DEMO_CODE_TTL_MS-now)/1000));
 const cooldown=Math.max(0,Math.ceil(((pending?.issuedAt??0)+DEMO_RESEND_DELAY_MS-now)/1000));
 function edit(index:number,value:string){
  const cleaned=value.replace(/\D/g,"");
  const next=[...digits];
  if(cleaned.length>1){cleaned.slice(0,6-index).split("").forEach((v,k)=>next[index+k]=v);}
  else next[index]=cleaned.slice(-1);
  setDigits(next);
  if(cleaned)refs.current[Math.min(index+cleaned.length,5)]?.focus();
 }
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setNotice("");
  try{
   const purpose=verify(digits.join(""));
   router.replace(purpose==="signup"?"/"+pending?.role:"/reset-password");
  }catch(e){setError(e instanceof Error?e.message:"Invalid verification.");}
 }
 function doResend(){
  try{resend();setDigits(["","","","","",""]);setNow(Date.now());setNotice("Demo code refreshed. The code remains 123456.");setError("");}
  catch(e){setError(e instanceof Error?e.message:"Unable to request a new code.");}
 }
 if(!pending)return <AuthPanel heading="No Verification Pending" description="Start registration or account recovery before opening verification."><DemoWarning/><Link href="/signup" className={submitClass+" mt-5"}>Start signup <ArrowRight className="size-4"/></Link><Link href="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-brand-blue">Try recovery</Link></AuthPanel>;
 return <AuthPanel heading="Verify Your Account" description={"Enter the six-digit demo code for "+pending.email+". Nothing was actually sent."}>
  <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#f0f6ff] p-3"><Mail className="size-6 text-brand-blue"/><div className="min-w-0"><p className="text-xs text-muted-foreground">{pending.purpose==="signup"?"Registration":"Account recovery"} verification</p><p className="break-all text-sm font-bold text-brand-navy">{pending.email}</p></div></div>
  <form onSubmit={submit}>
   <label htmlFor="otp-0" className={label}>6-digit demo OTP</label>
   <div className="flex gap-1.5 sm:gap-3">{digits.map((digit,i)=><input key={i} id={"otp-"+i} ref={el=>{refs.current[i]=el;}} type="text" inputMode="numeric" autoComplete={i===0?"one-time-code":"off"} aria-label={"Verification digit "+(i+1)} maxLength={6} value={digit}
    onChange={e=>edit(i,e.target.value)} onPaste={e=>{e.preventDefault();edit(i,e.clipboardData.getData("text"));}}
    onKeyDown={e=>{if(e.key==="Backspace"&&!digits[i]&&i>0)refs.current[i-1]?.focus();if(e.key==="ArrowLeft"&&i>0)refs.current[i-1]?.focus();if(e.key==="ArrowRight"&&i<5)refs.current[i+1]?.focus();}}
    className="aspect-square min-w-0 w-full max-w-16 rounded-xl border border-[#cadcf4] text-center text-lg font-bold text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-[#bddbff]"/>)}</div>
   <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4"/>Code expires in {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}.</p>
   <p className="mt-2 rounded-lg bg-[#eff6ff] px-3 py-2 text-sm">Your visible demo code: <strong className="tracking-widest text-brand-blue">{DEMO_CODE}</strong></p>
   <button type="submit" disabled={digits.join("").length!==6} className={submitClass+" mt-5"}>Verify demo code <ArrowRight className="size-4"/></button>
  </form>
  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">No code received?</span><button type="button" disabled={cooldown>0} onClick={doResend} className="min-h-11 font-bold text-brand-blue disabled:opacity-50">{cooldown>0?"Resend in "+cooldown+"s":"Resend demo code"}</button></div>
  <Feedback error={error} notice={notice}/>
  <Link href="/signup" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue"><ChevronLeft className="size-4"/>Back to signup</Link>
  <div className="mt-4"><DemoWarning/></div>
 </AuthPanel>;
}
