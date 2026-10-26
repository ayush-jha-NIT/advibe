import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
export function gpsPolicy(config:AppConfig){
 const version=process.env.GPS_CONSENT_POLICY_VERSION;
 if(!version||!/^[A-Za-z0-9._-]{3,100}$/.test(version))
  throw new HttpError(503,"GPS_POLICY_UNAVAILABLE","Purpose-specific GPS policy not configured");
 if(config.nodeEnv==="production"&&(
  process.env.GPS_COLLECTION_ENABLED!=="true"||
  process.env.GPS_PRIVACY_APPROVED!=="true"||
  !process.env.GPS_RETENTION_REVIEWED_AT))
  throw new HttpError(503,"GPS_PRIVACY_APPROVAL_REQUIRED",
   "Production consent and retention approvals required");
 return version;
}
