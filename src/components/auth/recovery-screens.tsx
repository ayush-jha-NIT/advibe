"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,Check,ChevronLeft,LockKeyhole} from "lucide-react";
import {isEmail,parsePublicRole,passwordIssues,type PublicAuthRole} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {AuthPanel,control,label,DemoWarning,Feedback,PasswordControl,submitClass} from "./form-elements";

export function ForgotPasswordScreen(){
 const router=useRouter();
 const [email,setEmail]=React.useState(""),[role,setRole]=React.useState<PublicAuthRole>("advertiser"),[error,setError]=React.useState("");
 const begin=useDemoAuth(s=>s.beginVerification);
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(!isEmail(email)){setError("Enter a valid email address.");return;}
  try{begin({purpose:"recovery",role,email,displayName:"Demo Account"});router.push("/verify");}
  catch(e){setError(e instanceof Error?e.message:"Recovery unavailable.");}
 }
 return <AuthPanel heading="Forgot Password?" description="Test recovery in this local-only demo. No real message is sent or password changed.">
  <div className="mb-5 grid size-12 place-items-center rounded-xl bg-[#e9f3ff] text-brand-blue"><LockKeyhole className="size-6"/></div>
  <form onSubmit={submit} noValidate className="space-y-4">
   <div><label htmlFor="recover-email" className={label}>Email address</label><input id="recover-email" className={control} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/></div>
   <div><label htmlFor="recover-role" className={label}>Account type</label><select id="recover-role" className={control} value={role} onChange={e=>setRole(parsePublicRole(e.target.value))}><option value="advertiser">Advertiser</option><option value="driver">Driver Partner</option></select></div>
   <button type="submit" className={submitClass}>Continue to demo OTP <ArrowRight className="size-4"/></button>
  </form><Feedback error={error}/>
  <Link href="/login" className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-blue"><ChevronLeft className="size-4"/>Back to login</Link>
  <div className="mt-4"><DemoWarning/></div>
 </AuthPanel>;
}
export function ResetPasswordScreen(){
 const router=useRouter();
 const verified=useDemoAuth(s=>s.recoveryVerified),finish=useDemoAuth(s=>s.finishRecovery);
 const [password,setPassword]=React.useState(""),[confirm,setConfirm]=React.useState(""),[error,setError]=React.useState(""),[success,setSuccess]=React.useState(false);
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  const issues=passwordIssues(password);
  if(issues.length){setError(issues.join(" "));return;}
  if(password!==confirm){setError("Password confirmation does not match.");return;}
  try{finish();setSuccess(true);}catch(e){setError(e instanceof Error?e.message:"Verification required.");}
 }
 if(success)return <AuthPanel heading="Demo Reset Complete" description="Your form passed validation. No real account credentials were changed.">
  <div className="flex items-center gap-2 rounded-xl bg-[#eefaf4] p-4 text-sm text-[#14683c]"><Check className="size-6"/>Demonstration recovery finished.</div>
  <button type="button" onClick={()=>router.replace("/login")} className={submitClass+" mt-5"}>Back to demo login <ArrowRight className="size-4"/></button>
  <div className="mt-4"><DemoWarning/></div>
 </AuthPanel>;
 if(!verified)return <AuthPanel heading="Verification Required" description="Complete a recovery demo OTP before accessing this form."><Link href="/forgot-password" className={submitClass}>Begin demo recovery <ArrowRight className="size-4"/></Link></AuthPanel>;
 return <AuthPanel heading="Reset Password" description="Validate password strength and confirmation. This does not update server credentials.">
  <form onSubmit={submit} noValidate className="space-y-4">
   <div><label htmlFor="new-password" className={label}>New password</label><PasswordControl id="new-password" value={password} onChange={setPassword}/></div>
   <div><label htmlFor="confirm-new-password" className={label}>Confirm new password</label><PasswordControl id="confirm-new-password" value={confirm} onChange={setConfirm}/></div>
   <p className="text-xs text-muted-foreground">8+ characters including upper, lower, number and symbol.</p>
   <button type="submit" className={submitClass}>Validate reset <ArrowRight className="size-4"/></button>
  </form><Feedback error={error}/><div className="mt-4"><DemoWarning/></div>
 </AuthPanel>;
}
