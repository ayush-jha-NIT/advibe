"use client";
import * as React from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowRight,Building2,Check,Truck} from "lucide-react";
import {isEmail,parsePublicRole,passwordIssues,type PublicAuthRole} from "@/lib/demo-auth";
import {useDemoAuth} from "@/services/demo-auth-store";
import {AuthPanel,control,label,DemoWarning,Feedback,PasswordControl,submitClass} from "./form-elements";

export function SignupScreen(){
 const router=useRouter(),params=useSearchParams();
 const [role,setRole]=React.useState<PublicAuthRole>(()=>parsePublicRole(params.get("role")));
 const [name,setName]=React.useState(""),[email,setEmail]=React.useState(""),[phone,setPhone]=React.useState("");
 const [business,setBusiness]=React.useState(""),[vehicle,setVehicle]=React.useState("bike");
 const [password,setPassword]=React.useState(""),[confirm,setConfirm]=React.useState("");
 const [terms,setTerms]=React.useState(false),[error,setError]=React.useState("");
 const begin=useDemoAuth(s=>s.beginVerification);
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(name.trim().length<2){setError("Enter your name (at least 2 characters).");return;}
  if(!isEmail(email)){setError("Enter a valid email address.");return;}
  if(!/^[6-9]\d{9}$/.test(phone)){setError("Enter a valid 10-digit mobile number.");return;}
  if(role==="advertiser"&&business.trim().length<2){setError("Enter your business name.");return;}
  const issues=passwordIssues(password);
  if(issues.length){setError(issues.join(" "));return;}
  if(password!==confirm){setError("Password confirmation does not match.");return;}
  if(!terms){setError("Please acknowledge the demo terms.");return;}
  try{begin({purpose:"signup",role,email,displayName:name});router.push("/verify");}
  catch(e){setError(e instanceof Error?e.message:"Unable to start demo signup.");}
 }
 return <AuthPanel heading="Create Your Account" description="Select your role and complete the local demo registration.">
  <fieldset className="mb-5"><legend className={label}>Register as</legend><div className="grid grid-cols-2 gap-3">{[
   {value:"advertiser" as const,title:"Advertiser",sub:"Create and manage campaigns",icon:Building2},
   {value:"driver" as const,title:"Driver Partner",sub:"Onboard vehicle and earnings",icon:Truck},
  ].map(({value,title,sub,icon:Icon})=><button type="button" key={value} aria-pressed={role===value} onClick={()=>{setRole(value);setError("");}} className={"flex min-h-28 flex-col items-start gap-2 rounded-xl border p-3 text-left "+(role===value?"border-brand-blue bg-[#edf5ff] ring-1 ring-brand-blue":"border-[#dce7f6] bg-white hover:border-brand-blue")}><span className="flex items-center gap-1.5 text-sm font-bold text-brand-navy"><Icon className="size-5 text-brand-blue"/>{title}</span><span className="text-xs leading-5 text-[#637a9a]">{sub}</span>{role===value&&<Check className="ml-auto size-4 text-brand-blue" aria-hidden/>}</button>)}</div></fieldset>
  <form onSubmit={submit} noValidate className="space-y-3">
   <div><label htmlFor="register-name" className={label}>Full name *</label><input id="register-name" className={control} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required maxLength={80} placeholder="Your name"/></div>
   <div className="grid gap-3 sm:grid-cols-2">
    <div><label htmlFor="register-email" className={label}>Email *</label><input id="register-email" className={control} autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="you@example.com"/></div>
    <div><label htmlFor="register-phone" className={label}>Phone *</label><input id="register-phone" className={control} inputMode="numeric" autoComplete="tel-national" type="tel" pattern="[6-9][0-9]{9}" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} required placeholder="10-digit mobile"/></div>
   </div>
   {role==="advertiser"?<div><label htmlFor="register-business" className={label}>Business / brand name *</label><input id="register-business" className={control} value={business} onChange={e=>setBusiness(e.target.value)} required maxLength={100} placeholder="Your business"/></div>
    :<div><label htmlFor="register-vehicle" className={label}>Vehicle type *</label><select id="register-vehicle" className={control} value={vehicle} onChange={e=>setVehicle(e.target.value)}><option value="bike">Bike</option><option value="auto">Auto Rickshaw</option><option value="car">Car</option></select></div>}
   <div><label htmlFor="register-password" className={label}>Create password *</label><PasswordControl id="register-password" value={password} onChange={setPassword} placeholder="Case, number and symbol; 8+ characters"/></div>
   <div><label htmlFor="register-confirm" className={label}>Confirm password *</label><PasswordControl id="register-confirm" value={confirm} onChange={setConfirm} placeholder="Confirm password"/></div>
   <div className="flex items-start gap-2"><input id="signup-consent" type="checkbox" className="mt-1 size-4 shrink-0 accent-[#0866ff]" checked={terms} onChange={e=>setTerms(e.target.checked)}/><label htmlFor="signup-consent" className="text-xs leading-5 text-[#435b7d]">I understand this creates a temporary demo identity, not a real account. I have reviewed the <Link href="/terms" target="_blank" className="font-bold text-brand-blue underline">terms preview</Link> and <Link href="/privacy" target="_blank" className="font-bold text-brand-blue underline">privacy notice</Link>.</label></div>
   <button type="submit" className={submitClass}>Continue to demo verification <ArrowRight className="size-4"/></button>
  </form><Feedback error={error}/>
  <p className="mt-4 text-center text-sm text-[#647b9c]">Already have an account? <Link href={"/login?role="+role} className="font-bold text-brand-blue hover:underline">Login</Link></p>
  <div className="mt-5"><DemoWarning/></div>
 </AuthPanel>;
}
