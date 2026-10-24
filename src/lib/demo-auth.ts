/**
 * Only a frontend demonstration. This module must NEVER be used as production
 * authentication, credential storage, identity proof or permission enforcement.
 */
export type AuthRole="admin"|"advertiser"|"driver";
export type PublicAuthRole=Exclude<AuthRole,"admin">;
export type VerificationPurpose="signup"|"recovery";
export interface DemoIdentity {role:AuthRole;displayName:string;email:string}
export interface PendingVerification {
  purpose:VerificationPurpose;email:string;role:PublicAuthRole;
  displayName:string;issuedAt:number;attempts:number;
}
export const DEMO_CODE="123456";
export const DEMO_PASSWORD="AdVibe@123";
export const DEMO_CODE_TTL_MS=5*60*1000;
export const DEMO_RESEND_DELAY_MS=30*1000;
export const DEMO_MAX_ATTEMPTS=5;
export const DEMO_USERS:readonly DemoIdentity[]=[
 {role:"admin",displayName:"Demo Administrator",email:"admin@demo.advibe.test"},
 {role:"advertiser",displayName:"Demo Advertiser",email:"advertiser@demo.advibe.test"},
 {role:"driver",displayName:"Demo Driver",email:"driver@demo.advibe.test"},
];
export const authHome=(role:AuthRole)=>"/"+role;
export function parsePublicRole(value:string|null|undefined):PublicAuthRole{
 return value==="driver"?"driver":"advertiser";
}
export function parseAuthRole(value:string|null|undefined):AuthRole{
 return value==="admin"?"admin":parsePublicRole(value);
}
export function normalizeEmail(value:string):string{return value.trim().toLowerCase();}
export function isEmail(value:string):boolean{return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))&&value.length<=254;}
export function passwordIssues(password:string):string[]{
 return [
  ...(password.length<8?["Use at least 8 characters."]:[]),
  ...(!/[a-z]/.test(password)?["Add a lowercase letter."]:[]),
  ...(!/[A-Z]/.test(password)?["Add an uppercase letter."]:[]),
  ...(!/[0-9]/.test(password)?["Add a number."]:[]),
  ...(!/[^a-zA-Z0-9]/.test(password)?["Add a symbol."]:[]),
 ];
}
export function makePending(input:Omit<PendingVerification,"issuedAt"|"attempts">,now:number):PendingVerification{
 if(!isEmail(input.email))throw Error("Enter a valid email address.");
 if(!input.displayName.trim())throw Error("Enter your name.");
 return {...input,email:normalizeEmail(input.email),displayName:input.displayName.trim().slice(0,80),issuedAt:now,attempts:0};
}
export function verifyPending(pending:PendingVerification|null,code:string,now:number):"ok"|"missing"|"expired"|"locked"|"invalid"{
 if(!pending)return "missing";
 if(now-pending.issuedAt>DEMO_CODE_TTL_MS)return "expired";
 if(pending.attempts>=DEMO_MAX_ATTEMPTS)return "locked";
 return code===DEMO_CODE?"ok":"invalid";
}
export function resendAllowed(pending:PendingVerification|null,now:number):boolean{
 return !!pending&&now-pending.issuedAt>=DEMO_RESEND_DELAY_MS;
}
export function safeNext(value:string|null,role:AuthRole):string{
 const home=authHome(role);
 if(!value||!value.startsWith("/")||value.startsWith("//")||value.includes("\\")||/[\r\n]/.test(value))return home;
 if(value===home||value.startsWith(home+"/"))return value;
 return home;
}
export function validDemoLogin(email:string,password:string,role:AuthRole):boolean{
 return DEMO_USERS.some(user=>user.role===role&&user.email===normalizeEmail(email))&&password===DEMO_PASSWORD;
}
