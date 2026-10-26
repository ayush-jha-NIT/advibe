import { type PrismaClient,type PaymentOrder } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { lockScreens } from "../reservations/core.js";
import type { CashfreeVerifiedPayment } from "./provider.js";
import { assertVerifiedPayment } from "./verify.js";

/** Confirm only on verified provider SUCCESS and capacity still HELD (never extend expiry). */
export async function settlePayment(db:PrismaClient,orderId:string,
  payment:CashfreeVerifiedPayment,event?:{hash:string;type:string}):Promise<PaymentOrder>{
  const preliminary=await db.paymentOrder.findUnique({where:{id:orderId},
    include:{hold:{include:{items:{select:{screenId:true}}}}}});
  if(!preliminary)throw new HttpError(404,"NOT_FOUND","Payment order not found");
  assertVerifiedPayment(payment,preliminary,payment.providerPaymentId);
  return serializableTransaction(db,async tx=>{
    await lockScreens(tx,preliminary.hold.items.map(x=>x.screenId));
    const o=await tx.paymentOrder.findUniqueOrThrow({where:{id:orderId},
      include:{hold:{include:{items:true}},campaign:true,quote:true}});
    assertVerifiedPayment(payment,o,payment.providerPaymentId);
    if(event){
      const prior=await tx.paymentWebhookEvent.findUnique({where:{eventHash:event.hash}});
      if(prior){
        if(prior.paymentOrderId!==orderId)
          throw new HttpError(409,"WEBHOOK_REPLAY_CONFLICT","Webhook hash reused");
        return o;
      }
      await tx.paymentWebhookEvent.create({data:{
        paymentOrderId:o.id,eventHash:event.hash,eventType:event.type}});
    }
    const existing=await tx.paymentAttempt.findUnique({where:{
      providerPaymentId:payment.providerPaymentId}});
    if(existing){
      if(existing.paymentOrderId!==o.id||existing.amountPaise!==payment.amountPaise||
         existing.status!==payment.status)
        throw new HttpError(409,"PAYMENT_REPLAY_CONFLICT","Payment identity already assigned");
    }else{
      await tx.paymentAttempt.create({data:{paymentOrderId:o.id,
        providerPaymentId:payment.providerPaymentId,status:payment.status,
        amountPaise:payment.amountPaise,currency:"INR"}});
    }
    if(payment.status!=="SUCCESS")return o;
    if(o.state==="PAID_UNALLOCATED")return o;
    if(o.state==="PAID"){
      if(!existing){
        await tx.paymentOrder.update({where:{id:o.id},data:{requiresResolution:true}});
        await tx.auditEvent.create({data:{actorUserId:null,
          action:"payment.duplicate_success",resourceType:"payment_order",resourceId:o.id}});
        await tx.outboxEvent.create({data:{aggregateType:"payment_order",aggregateId:o.id,
          eventType:"payment.duplicate_success",payload:{orderId:o.id}}});
      }
      return tx.paymentOrder.findUniqueOrThrow({where:{id:o.id}});
    }
    const now=new Date();
    const valid=o.hold.state==="HELD"&&o.hold.expiresAt>now&&
      o.hold.campaignId===o.campaignId&&o.hold.quoteId===o.quoteId&&
      o.hold.businessId===o.businessId&&o.campaign.status==="APPROVED"&&
      o.quote.totalPaise===o.amountPaise&&
      o.hold.items.length>0;
    const allocated=valid?await tx.inventorySlot.count({where:{holdId:o.hold.id}}):0;
    if(valid&&allocated===o.hold.items.length){
      const moved=await tx.reservationHold.updateMany({where:{
        id:o.hold.id,state:"HELD",expiresAt:{gt:now}},
        data:{state:"CONFIRMED",confirmedAt:now}});
      if(moved.count!==1)throw new HttpError(409,"HOLD_STATE_CONFLICT","Reservation changed");
      await tx.paymentOrder.update({where:{id:o.id},data:{state:"PAID",paidAt:now}});
      await tx.auditEvent.create({data:{actorUserId:null,
        action:"payment.booking_confirmed",resourceType:"payment_order",resourceId:o.id}});
      await tx.outboxEvent.create({data:{aggregateType:"payment_order",aggregateId:o.id,
        eventType:"payment.booking_confirmed",payload:{orderId:o.id,
          holdId:o.hold.id,campaignId:o.campaignId}}});
    }else{
      // Provider may debit after expiry; never resurrect or steal a slot.
      await tx.paymentOrder.update({where:{id:o.id},data:{
        state:"PAID_UNALLOCATED",paidAt:now,requiresResolution:true}});
      await tx.auditEvent.create({data:{actorUserId:null,
        action:"payment.paid_unallocated",resourceType:"payment_order",resourceId:o.id}});
      await tx.outboxEvent.create({data:{aggregateType:"payment_order",aggregateId:o.id,
        eventType:"payment.paid_unallocated",payload:{orderId:o.id,
          campaignId:o.campaignId,requiresOperatorResolution:true}}});
    }
    return tx.paymentOrder.findUniqueOrThrow({where:{id:o.id}});
  });
}
