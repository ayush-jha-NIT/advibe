import { Router,type Request,type Response,type NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import type { CashfreeGateway } from "./provider.js";
import { verifyWebhook,assertVerifiedPayment } from "./verify.js";
import { webhookInput } from "./schemas.js";
import { settlePayment } from "./settle.js";

const safe=(fn:(req:Request,res:Response)=>Promise<void>)=>
 (req:Request,res:Response,next:NextFunction):void=>{void fn(req,res).catch(next);};
export function createPaymentWebhookRouter(db:PrismaClient,
 provider:CashfreeGateway,secret:string):Router {
 const router=Router();
 router.post("/",safe(async(req,res)=>{
  // Must mount express.raw BEFORE express.json. A reconstructed JSON string is unsafe.
  if(!Buffer.isBuffer(req.body)||!req.is("application/json"))
   throw new HttpError(415,"UNSUPPORTED_MEDIA_TYPE","Raw JSON webhook required");
  const hash=verifyWebhook(req.body,req.get("x-webhook-signature"),
    req.get("x-webhook-timestamp"),secret);
  let json:unknown;
  try{json=JSON.parse(req.body.toString("utf8"));}
  catch{throw new HttpError(400,"INVALID_WEBHOOK_JSON","Invalid Cashfree event");}
  const result=webhookInput.safeParse(json);
  if(!result.success){
   // Unknown signed event types are ignored without processing money.
   res.status(200).json({data:{received:true,processed:false}});
   return;
  }
  const event=result.data;
  const order=await db.paymentOrder.findUnique({where:{
    providerOrderId:event.data.order.order_id}});
  if(!order){
   res.status(200).json({data:{received:true,processed:false}});
   return;
  }
  const paymentId=String(event.data.payment.cf_payment_id);
  if(!/^[A-Za-z0-9_-]{1,90}$/.test(paymentId))
   throw new HttpError(422,"WEBHOOK_PAYMENT_INVALID","Invalid payment identifier");
  const verified=await provider.getPayment(order.providerOrderId,paymentId);
  assertVerifiedPayment(verified,order,paymentId);
  if(event.type==="PAYMENT_SUCCESS_WEBHOOK"){
   if(verified.status!=="SUCCESS")
    throw new HttpError(503,"PAYMENT_NOT_VERIFIED","Payment not yet confirmed at provider");
   const remote=await provider.getOrder(order.providerOrderId);
   if(remote.providerOrderId!==order.providerOrderId||
      remote.amountPaise!==order.amountPaise||remote.currency!=="INR"||
      remote.status!=="PAID")
    throw new HttpError(503,"ORDER_NOT_VERIFIED","Cashfree order not marked PAID");
  }else if(event.type==="PAYMENT_FAILED_WEBHOOK"&&verified.status!=="FAILED"||
           event.type==="PAYMENT_USER_DROPPED_WEBHOOK"&&verified.status!=="USER_DROPPED"){
    throw new HttpError(422,"PAYMENT_STATUS_MISMATCH","Provider state differs from webhook");
  }
  await settlePayment(db,order.id,verified,{hash,type:event.type});
  res.status(200).json({data:{received:true,processed:true}});
 }));
 return router;
}
