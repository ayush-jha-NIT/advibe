import { HttpError } from "../../lib/http-error.js";
import type { AppConfig } from "../../config/env.js";
export function approved(config:AppConfig,kind:"invoice"|"refund"){
 if(config.nodeEnv==="production"){
  if(process.env.B19_FINANCE_APPROVED!=="true"||
   process.env.PRICING_TAX_POLICY_APPROVED!=="true"||
   (kind==="invoice"?process.env.B19_TAX_INVOICES_ENABLED!=="true":
    process.env.B19_REFUND_POLICY_APPROVED!=="true"||
    process.env.B19_REFUNDS_ENABLED!=="true"))
   throw new HttpError(503,"FINANCE_APPROVAL_REQUIRED","Finance and legal approval required");
 }
}
export interface Issuer {
 name:string;address:string;gstin:string;stateCode:string;sacCode:string;
}
export function issuer(config:AppConfig):Issuer{
 approved(config,"invoice");
 const name=process.env.B19_SELLER_NAME??"";
 const address=process.env.B19_SELLER_ADDRESS??"";
 const gstin=process.env.B19_SELLER_GSTIN??"";
 const stateCode=process.env.B19_SELLER_STATE_CODE??"";
 const sacCode=process.env.B19_SERVICE_SAC??"";
 if(name.length<3||name.length>220||address.length<8||address.length>500||
  !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)||
  !/^[0-9]{2}$/.test(stateCode)||gstin.slice(0,2)!==stateCode||
  !/^[0-9]{4,12}$/.test(sacCode))
  throw new HttpError(503,"INVOICE_ISSUER_INCOMPLETE","Registered supplier and SAC settings required");
 return {name,address,gstin,stateCode,sacCode};
}
/** April-March financial year for India. Invoice serials <= 16 chars including prefix. */
export function fiscal(now:Date):string{
 const year=now.getUTCFullYear()-(now.getUTCMonth()<3?1:0);
 return String(year%100).padStart(2,"0")+String((year+1)%100).padStart(2,"0");
}
export function splitTax(tax:bigint,intra:boolean){
 const cgst=intra?tax/2n:0n;
 return {cgstPaise:cgst,sgstPaise:intra?tax-cgst:0n,igstPaise:intra?0n:tax};
}
