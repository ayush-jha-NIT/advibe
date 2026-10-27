import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export function GET(){
 const mode=process.env.NEXT_PUBLIC_DEMO_MODE==="false"?"api":"demo";
 return NextResponse.json({
  service:"advibe-frontend",status:"ok",mode,productionIntegrationsReady:false,
  note:mode==="demo"
   ?"This health endpoint validates Next.js route availability only. Payments, KYC, auth and physical devices are not connected."
   :"This liveness endpoint verifies the frontend only; no production finance, legal or hardware readiness is implied.",
 },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
