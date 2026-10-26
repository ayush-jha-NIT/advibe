import { HttpError } from "../../lib/http-error.js";
export type RemoteTransfer={
 reference:string;amountPaise:bigint;currency:"INR";state:"PENDING"|"SUCCESS"|"FAILED";
};
export interface PayoutGateway {
 verifyBeneficiary(token:string,driverUserId:string):Promise<{
  token:string;driverUserId:string;verified:boolean;provider:"cashfree"}>;
 createTransfer(input:{reference:string;beneficiaryToken:string;
  amountPaise:bigint;currency:"INR"}):Promise<RemoteTransfer>;
 getTransfer(reference:string):Promise<RemoteTransfer>;
}
/** Never infer provider verification from browser responses. Real merchant credentials
 * and compliant onboarding MUST be integrated before switching from fail-closed mode.
 * CI injects a deterministic contract-level fake gateway, not a live bank.
 */
export function configuredPayoutGateway():PayoutGateway {
 throw new HttpError(503,"PAYOUT_PROVIDER_UNAVAILABLE",
  "Verified payout gateway is not configured");
}
export function validTransfer(t:RemoteTransfer,reference:string,amount:bigint){
 if(t.reference!==reference||t.amountPaise!==amount||t.currency!=="INR"||
  !["PENDING","SUCCESS","FAILED"].includes(t.state))
  throw new HttpError(503,"PAYOUT_PROVIDER_MISMATCH","Independent transfer evidence mismatch");
 return t;
}
export function financePolicy(env:NodeJS.ProcessEnv=process.env,production=false):string {
 const version=env.B18_EARNING_POLICY_VERSION;
 if(!version||!/^[A-Za-z0-9._-]{3,80}$/.test(version))
  throw new HttpError(503,"EARNING_POLICY_UNAVAILABLE","Earning policy is not configured");
 if(production&&(env.B18_D05_APPROVED!=="true"||env.B18_D07_APPROVED!=="true"||
    env.B18_PAYOUTS_ENABLED!=="true"))
  throw new HttpError(503,"PAYOUT_POLICY_UNAPPROVED","Finance and provider approvals required");
 return version;
}
