import {NextResponse} from "next/server";

/** Frontend-only readiness: it does not verify any external service or backend. */
export function GET(){
 return NextResponse.json({
  service:"advibe-frontend",
  status:"ok",
  mode:"demo",
  productionIntegrationsReady:false,
  note:"This health endpoint validates Next.js route availability only. Payments, KYC, auth and physical devices are not connected."
 },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
