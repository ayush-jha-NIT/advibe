/** B23 deployment admission: no production HTTP listener until operational reviews are explicit.
 * Flags are assertions supplied by accountable operators, not evidence that review happened.
 * The B23 staging tier must never imply a payout/provider approval.
 */
type Env=Record<string,string|undefined>;
const yes=(env:Env,key:string)=>env[key]==="true";
const disabledByDefault=[
 "PAYMENTS_ENABLED","B18_PAYOUTS_ENABLED","B19_REFUNDS_ENABLED",
 "B19_TAX_INVOICES_ENABLED","DEVICE_PLAYBACK_ENABLED",
 "BOOKING_HOLDS_ENABLED","CREATIVE_WORKER_ENABLED",
];
export function releaseGate(env:Env){
 if(env.NODE_ENV!=="production")return {mode:"development" as const};
 const stage=env.B23_RELEASE_STAGE;
 if(stage!=="staging"&&stage!=="production")
  throw new Error("B23_RELEASE_STAGE must be staging or production");
 if(env.TRUST_PROXY!=="true")
  throw new Error("B23 production deployments require explicit trusted reverse proxy configuration");
 if(env.B23_STAGING_APPROVED!=="true")
  throw new Error("B23_STAGING_APPROVED is required before public deployment");
 if(!env.AUTH_WEB_ORIGIN||!env.CORS_ORIGINS?.split(",").map(x=>x.trim()).includes(env.AUTH_WEB_ORIGIN))
  throw new Error("B23 frontend origin must match AUTH_WEB_ORIGIN and CORS_ORIGINS");
 if(stage==="staging"){
  const accidentallyEnabled=disabledByDefault.filter(flag=>yes(env,flag));
  if(accidentallyEnabled.length)
   throw new Error("B23 staging may not enable financial or physical-device production switches: "+accidentallyEnabled.join(","));
  return {mode:"staging" as const};
 }
 const signoffs=[
  "B23_RELEASE_APPROVED","B23_SECURITY_REVIEW_APPROVED","B23_LEGAL_REVIEW_APPROVED",
  "B23_RESTORE_DRILL_VERIFIED","B23_STAGING_E2E_VERIFIED",
  "B23_MONITORING_VERIFIED","B23_ROLLBACK_PLAN_VERIFIED",
 ];
 const missing=signoffs.filter(flag=>!yes(env,flag));
 if(missing.length)throw new Error("B23 production release signoff missing: "+missing.join(","));
 if(env.B23_RELEASE_SHA===undefined||!/^[a-f0-9]{40}$/i.test(env.B23_RELEASE_SHA))
  throw new Error("B23_RELEASE_SHA must pin an approved 40-character commit");
 if(env.B23_APPROVED_SHA!==env.B23_RELEASE_SHA)
  throw new Error("B23 release commit does not match approved commit");
 return {mode:"production" as const,sha:env.B23_RELEASE_SHA};
}
