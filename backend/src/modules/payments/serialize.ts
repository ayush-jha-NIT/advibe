import type { PaymentOrder,PaymentAttempt } from "@prisma/client";
export function orderView(o:PaymentOrder){
 return {id:o.id,businessId:o.businessId,campaignId:o.campaignId,quoteId:o.quoteId,
  reservationHoldId:o.reservationHoldId,amountPaise:Number(o.amountPaise),
  currency:o.currency.trim(),status:o.state.toLowerCase(),
  checkoutSession:o.state==="ACTIVE"?o.providerSessionId??undefined:undefined,
  needsResolution:o.requiresResolution,createdAt:o.createdAt.toISOString(),
  paidAt:o.paidAt?.toISOString()??null};
}
export function paymentView(p:PaymentAttempt){
 return {id:p.id,orderId:p.paymentOrderId,amountPaise:Number(p.amountPaise),
  status:p.status==="SUCCESS"?"paid":p.status==="FAILED"?"failed":"pending",
  verifiedAt:p.verifiedAt.toISOString()};
}
