import { HttpError } from "../../lib/http-error.js";

export type CashfreeVerifiedPayment={
  providerOrderId:string;providerPaymentId:string;status:"SUCCESS"|"FAILED"|"PENDING"|"USER_DROPPED";
  currency:string;amountPaise:bigint;
};
export interface CashfreeGateway {
  createOrder(input:{providerOrderId:string;amountPaise:bigint;customerId:string;
    customerPhone:string;customerEmail:string;expiresAt:Date}):Promise<{
      providerOrderId:string;paymentSessionId:string;orderAmountPaise:bigint;currency:string}>;
  getOrder(providerOrderId:string):Promise<{providerOrderId:string;status:string;
    amountPaise:bigint;currency:string}>;
  getPayment(providerOrderId:string,providerPaymentId:string):Promise<CashfreeVerifiedPayment>;
  listPayments(providerOrderId:string):Promise<CashfreeVerifiedPayment[]>;
}
export function decimalPaise(v:unknown):bigint {
 const s=typeof v==="string"?v:typeof v==="number"?String(v):"";
 if(!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(s))
  throw new HttpError(422,"CASHFREE_AMOUNT_INVALID","Invalid provider amount");
 const [whole,part=""]=s.split(".");
 return BigInt(whole!)*100n+BigInt(part.padEnd(2,"0"));
}
const amount=(v:bigint):number=>{
 if(v<100n||v>100000000000n)
  throw new HttpError(422,"PAYMENT_AMOUNT_UNSUPPORTED","Payment amount outside gateway limits");
 return Number(v)/100;
};
export function createCashfreeGateway(env:NodeJS.ProcessEnv=process.env):CashfreeGateway {
 const sandbox=env.CASHFREE_ENV==="sandbox";
 if(!sandbox&&env.CASHFREE_ENV!=="production")
  throw new Error("Cashfree environment is not configured");
 const id=env.CASHFREE_CLIENT_ID,secret=env.CASHFREE_CLIENT_SECRET;
 if(!id||!secret)throw new Error("Cashfree server credentials not configured");
 const base=sandbox?"https://sandbox.cashfree.com/pg":"https://api.cashfree.com/pg";
 const notify=env.CASHFREE_NOTIFY_URL;
 if(!notify||!/^https:\/\/[^\s]+\/api\/v1\/webhooks\/cashfree\/payments$/.test(notify))
  throw new Error("A controlled HTTPS Cashfree notify URL is required");
 const request=async(method:"POST"|"GET",path:string,body?:unknown,key?:string):Promise<unknown>=>{
  let res:Response;
  try{
   res=await fetch(base+path,{method,signal:AbortSignal.timeout(8000),headers:{
    "Content-Type":"application/json","x-api-version":"2025-01-01",
    "x-client-id":id,"x-client-secret":secret,...(key?{"x-idempotency-key":key}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  }catch{throw new HttpError(503,"CASHFREE_UNAVAILABLE","Payment provider unavailable");}
  if(!res.ok)throw new HttpError(503,"CASHFREE_UNAVAILABLE","Provider did not accept request");
  return await res.json() as unknown;
 };
 return {
  async createOrder(input){
   const result=await request("POST","/orders",{
    order_id:input.providerOrderId,order_amount:amount(input.amountPaise),order_currency:"INR",
    customer_details:{customer_id:input.customerId,customer_phone:input.customerPhone,
     customer_email:input.customerEmail},
    order_expiry_time:input.expiresAt.toISOString(),
    order_meta:{notify_url:notify},
   },input.providerOrderId);
   const response=result as Record<string,unknown>;
   if(typeof response.order_id!=="string"||typeof response.payment_session_id!=="string")
    throw new HttpError(503,"CASHFREE_RESPONSE_INVALID","Invalid Cashfree checkout response");
   return {providerOrderId:response.order_id,paymentSessionId:response.payment_session_id,
    orderAmountPaise:decimalPaise(response.order_amount),currency:String(response.order_currency)};
  },
  async getOrder(providerOrderId){
   const result=await request("GET","/orders/"+encodeURIComponent(providerOrderId));
   const response=result as Record<string,unknown>;
   return {providerOrderId:String(response.order_id),status:String(response.order_status),
    currency:String(response.order_currency),amountPaise:decimalPaise(response.order_amount)};
  },
  async listPayments(orderId){
   const rows=await request("GET","/orders/"+encodeURIComponent(orderId)+"/payments");
   if(!Array.isArray(rows))throw new HttpError(503,"CASHFREE_RESPONSE_INVALID","Expected payment list");
   return rows.slice(0,100).map((v:unknown)=>{
    const x=v as Record<string,unknown>;
    return {providerOrderId:String(x.order_id),providerPaymentId:String(x.cf_payment_id),
      status:String(x.payment_status) as CashfreeVerifiedPayment["status"],
      currency:String(x.payment_currency),amountPaise:decimalPaise(x.payment_amount)};
   });
  },
  async getPayment(orderId,paymentId){
   const value=await request("GET","/orders/"+encodeURIComponent(orderId)+"/payments/"+
     encodeURIComponent(paymentId));
   const response=value as Record<string,unknown>;
   return {providerOrderId:String(response.order_id),providerPaymentId:String(response.cf_payment_id),
    status:String(response.payment_status) as CashfreeVerifiedPayment["status"],
    currency:String(response.payment_currency),amountPaise:decimalPaise(response.payment_amount)};
  },
 };
}
