import { createHash,createHmac,timingSafeEqual } from "node:crypto";
import { HttpError } from "../../lib/http-error.js";
import type { CashfreeVerifiedPayment } from "./provider.js";

export function verifyWebhook(raw:Buffer,signature:string|undefined,
 timestamp:string|undefined,secret:string,now=Date.now()):string{
 if(raw.length===0||raw.length>64*1024||!timestamp||!/^\d{10}$/.test(timestamp)||
   Math.abs(now-Number(timestamp)*1000)>10*60*1000||
   !signature||!/^[A-Za-z0-9+/]{43}=$/.test(signature)||secret.length<8)
  throw new HttpError(401,"CASHFREE_SIGNATURE_INVALID","Invalid Cashfree webhook");
 const expected=createHmac("sha256",secret).update(timestamp).update(raw).digest();
 const supplied=Buffer.from(signature,"base64");
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))
  throw new HttpError(401,"CASHFREE_SIGNATURE_INVALID","Invalid Cashfree webhook");
 return createHash("sha256").update(raw).digest("hex");
}
export function assertVerifiedPayment(p:CashfreeVerifiedPayment,order:{
 providerOrderId:string;amountPaise:bigint;currency:string},providedPaymentId:string){
 if(p.providerOrderId!==order.providerOrderId||p.providerPaymentId!==providedPaymentId||
    p.amountPaise!==order.amountPaise||p.currency!=="INR"||order.currency.trim()!=="INR"||
    !["SUCCESS","FAILED","PENDING","USER_DROPPED"].includes(p.status))
  throw new HttpError(422,"PAYMENT_PROVIDER_MISMATCH","Provider payment does not match order");
}
