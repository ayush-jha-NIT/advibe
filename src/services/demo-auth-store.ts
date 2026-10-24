"use client";
import {create} from "zustand";
import {createJSONStorage,persist} from "zustand/middleware";
import {authHome,DEMO_MAX_ATTEMPTS,DEMO_USERS,makePending,normalizeEmail,parsePublicRole,resendAllowed,verifyPending,validDemoLogin,type AuthRole,type DemoIdentity,type PendingVerification,type PublicAuthRole,type VerificationPurpose} from "@/lib/demo-auth";

interface AuthDemoState {
 session:DemoIdentity|null;
 pending:PendingVerification|null;
 recoveryVerified:boolean;
 demoLogin:(role:AuthRole,email:string,password:string)=>void;
 beginVerification:(input:{purpose:VerificationPurpose;role:PublicAuthRole;email:string;displayName:string})=>void;
 verifyCode:(code:string)=>VerificationPurpose;
 resend:()=>void;
 finishRecovery:()=>void;
 logout:()=>void;
}
type Saved={session:DemoIdentity|null;pending:PendingVerification|null;recoveryVerified:boolean};
// Session-only storage: no passwords, full phone, OTP or KYC details.
export const useDemoAuth=create<AuthDemoState>()(persist<AuthDemoState,[],[],Saved>((set,get)=>({
 session:null,pending:null,recoveryVerified:false,
 demoLogin:(role,email,password)=>{
  if(!validDemoLogin(email,password,role))throw Error("Demo credentials do not match the selected role.");
  const user=DEMO_USERS.find(u=>u.role===role)!;
  set({session:user,pending:null,recoveryVerified:false});
 },
 beginVerification:(input)=>{
  if(input.role==="admin")throw Error("Admin accounts cannot be registered publicly.");
  const pending=makePending(input,Date.now());
  set({pending,recoveryVerified:false});
 },
 verifyCode:(code)=>{
  const pending=get().pending;
  const result=verifyPending(pending,code,Date.now());
  if(result!=="ok"){
   if(pending&&result==="invalid")set({pending:{...pending,attempts:Math.min(DEMO_MAX_ATTEMPTS,pending.attempts+1)}});
   throw Error({missing:"Start signup or recovery first.",expired:"Demo code expired. Request a new code.",locked:"Too many attempts. Request a new code.",invalid:"Incorrect demo code. Use 123456."}[result]);
  }
  if(!pending)throw Error("Verification session not found.");
  if(pending.purpose==="signup"){
   set({session:{role:pending.role,displayName:pending.displayName,email:pending.email},pending:null,recoveryVerified:false});
  }else{
   set({recoveryVerified:true,pending:null});
  }
  return pending.purpose;
 },
 resend:()=>{
  const pending=get().pending;
  if(!pending)throw Error("No pending demo verification.");
  if(!resendAllowed(pending,Date.now()))throw Error("Resend is available after 30 seconds.");
  set({pending:{...pending,issuedAt:Date.now(),attempts:0}});
 },
 finishRecovery:()=>{
  if(!get().recoveryVerified)throw Error("Complete demo verification first.");
  set({recoveryVerified:false,pending:null});
 },
 logout:()=>set({session:null,pending:null,recoveryVerified:false}),
}),{
 name:"advibe:auth-demo:v1",version:1,storage:createJSONStorage(()=>sessionStorage),skipHydration:true,
 partialize:({session,pending,recoveryVerified})=>({session,pending,recoveryVerified}),
 migrate:()=>({session:null,pending:null,recoveryVerified:false}),
}));
export function demoLabel(role:AuthRole):string{
 return role==="admin"?"Admin":role==="driver"?"Driver Partner":"Advertiser";
}
export {authHome,normalizeEmail,parsePublicRole};
