import { HttpError } from "../../lib/http-error.js";
import { decimalPaise } from "../payments/provider.js";
export interface RefundObservation {
 orderId:string;refundId:string;amountPaise:bigint;currency:string;
 status:"PENDING"|"SUCCESS"|"FAILED"|"CANCELLED"|"ONHOLD";
}
export interface RefundGateway {
 createRefund(orderId:string,refundId:string,amountPaise:bigint,reason:string):Promise<RefundObservation>;
 getRefund(orderId:string,refundId:string):Promise<RefundObservation>;
 getOrder(orderId:string):Promise<{orderId:string;status:string;amountPaise:bigint;currency:string}>;
 listPayments(orderId:string):Promise<Array<{paymentId:string;status:string;amountPaise:bigint;currency:string}>>;
}
function paiseToDecimal(p:bigint):number{
 if(p<=0n||p>100000000000n)throw new HttpError(422,"REFUND_AMOUNT_INVALID","Invalid refund amount");
 return Number(p)/100;
}
export function verifyRefund(r:RefundObservation,orderId:string,refundId:string,amount:bigint){
 if(r.orderId!==orderId||r.refundId!==refundId||r.currency!=="INR"||
    r.amountPaise!==amount||!["PENDING","SUCCESS","FAILED","CANCELLED","ONHOLD"].includes(r.status))
  throw new HttpError(503,"REFUND_PROVIDER_MISMATCH","Refund status does not match verified provider evidence");
 return r;
}
/** Cashfree PG refund endpoints (not the separately gated Cashfree Payouts service).
 * Stable refund_id and x-idempotency-key make retries safe after unknown network outcomes.
 * Never trust create response to mark money refunded.
 */
export function createRefundGateway(env:NodeJS.ProcessEnv=process.env):RefundGateway {
 if(!["sandbox","production"].includes(env.CASHFREE_ENV??""))
  throw new HttpError(503,"REFUND_GATEWAY_UNAVAILABLE","Cashfree environment missing");
 if(!env.CASHFREE_CLIENT_ID||!env.CASHFREE_CLIENT_SECRET)
  throw new HttpError(503,"REFUND_GATEWAY_UNAVAILABLE","Cashfree credentials missing");
 const base=env.CASHFREE_ENV==="sandbox"?"https://sandbox.cashfree.com/pg":"https://api.cashfree.com/pg";
 const api=async(path:string,method:"GET"|"POST"="GET",body?:object,key?:string):Promise<unknown>=>{
  let response:Response;
  try{
   response=await fetch(base+path,{method,signal:AbortSignal.timeout(8000),
    headers:{"Content-Type":"application/json","x-api-version":"2025-01-01",
     "x-client-id":env.CASHFREE_CLIENT_ID!,"x-client-secret":env.CASHFREE_CLIENT_SECRET!,
     ...(key?{"x-idempotency-key":key}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  }catch{throw new HttpError(503,"REFUND_GATEWAY_UNAVAILABLE","Cashfree request unavailable");}
  if(!response.ok)throw new HttpError(503,"REFUND_GATEWAY_UNAVAILABLE","Cashfree did not confirm request");
  return response.json() as Promise<unknown>;
 };
 const refund=(x:unknown):RefundObservation=>{
  if(!x||typeof x!=="object")throw new HttpError(503,"REFUND_GATEWAY_INVALID","Invalid provider refund");
  const r=x as Record<string,unknown>;
  const status=String(r.refund_status);
  if(!["PENDING","SUCCESS","FAILED","CANCELLED","ONHOLD"].includes(status))
   throw new HttpError(503,"REFUND_GATEWAY_INVALID","Unexpected provider refund status");
  return {orderId:String(r.order_id),refundId:String(r.refund_id),
   amountPaise:decimalPaise(r.refund_amount),currency:String(r.refund_currency),
   status:status as RefundObservation["status"]};
 };
 return {
  async createRefund(orderId,refundId,amount,reason){
   return refund(await api("/orders/"+encodeURIComponent(orderId)+"/refunds","POST",
    {refund_id:refundId,refund_amount:paiseToDecimal(amount),
     refund_note:reason.slice(0,100),refund_speed:"STANDARD"},refundId));
  },
  async getRefund(orderId,refundId){
   return refund(await api("/orders/"+encodeURIComponent(orderId)+"/refunds/"+
    encodeURIComponent(refundId)));
  },
  async getOrder(orderId){
   const x=await api("/orders/"+encodeURIComponent(orderId)) as Record<string,unknown>;
   return {orderId:String(x.order_id),status:String(x.order_status),
    amountPaise:decimalPaise(x.order_amount),currency:String(x.order_currency)};
  },
  async listPayments(orderId){
   const x=await api("/orders/"+encodeURIComponent(orderId)+"/payments");
   if(!Array.isArray(x))throw new HttpError(503,"REFUND_GATEWAY_INVALID","Payment array required");
   return x.slice(0,100).map(v=>{
    const row=v as Record<string,unknown>;
    return {paymentId:String(row.cf_payment_id),status:String(row.payment_status),
     amountPaise:decimalPaise(row.payment_amount),currency:String(row.payment_currency)};
   });
  },
 };
}
