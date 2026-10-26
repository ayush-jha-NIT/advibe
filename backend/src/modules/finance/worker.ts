import { randomUUID } from "node:crypto";
import type { Prisma,PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { RefundGateway,RefundObservation } from "./provider.js";
import { verifyRefund } from "./provider.js";
import { fiscal } from "./policy.js";
type Tx=Prisma.TransactionClient;
async function number(tx:Tx,namespace:"I"|"C",now=new Date()):Promise<string>{
 const fy=fiscal(now);
 const id=namespace+fy;
 const s=await tx.financeInvoiceSequence.upsert({where:{financialYear:id},
  create:{financialYear:id,nextNumber:2},update:{nextNumber:{increment:1}}});
 const serial=s.nextNumber===2?1:s.nextNumber-1;
 if(serial>999999)throw new HttpError(409,"DOCUMENT_SERIES_EXHAUSTED","Document number series exhausted");
 return "AV"+fy+"-"+namespace+"-"+String(serial).padStart(6,"0");
}
export {number as nextFinancialNumber};
export async function commitRefundEvidence(db:PrismaClient,id:string,evidence:RefundObservation){
 return serializableTransaction(db,async tx=>{
  const refund=await tx.paymentRefund.findUnique({where:{id},include:{order:{
   include:{invoice:true}}}});
  if(!refund)throw new HttpError(404,"NOT_FOUND","Refund not found");
  verifyRefund(evidence,refund.order.providerOrderId,refund.providerRefundId,refund.amountPaise);
  if(refund.state==="SUCCEEDED"||refund.state==="NEEDS_REVIEW")return refund;
  if(evidence.status==="FAILED"||evidence.status==="CANCELLED"){
   return tx.paymentRefund.update({where:{id},data:{state:"NEEDS_REVIEW"}});
  }
  if(evidence.status!=="SUCCESS"){
   if(refund.state==="QUEUED")return tx.paymentRefund.update({
    where:{id},data:{state:"SUBMITTED"}});
   return refund;
  }
  const invoice=refund.order.invoice;
  if(!invoice)throw new HttpError(409,"INVOICE_REQUIRED","Paid invoice required before credit note");
  const prior=await tx.financeCreditNote.findMany({where:{invoiceId:invoice.id},
   select:{amountPaise:true,taxablePaise:true,cgstPaise:true,sgstPaise:true,igstPaise:true}});
  const sums=prior.reduce((a,v)=>({amount:a.amount+v.amountPaise,
   taxable:a.taxable+v.taxablePaise,cgst:a.cgst+v.cgstPaise,
   sgst:a.sgst+v.sgstPaise,igst:a.igst+v.igstPaise}),
   {amount:0n,taxable:0n,cgst:0n,sgst:0n,igst:0n});
  if(sums.amount+refund.amountPaise>invoice.totalPaise)
   throw new HttpError(409,"REFUND_OVERPAID","Refund exceeds invoiced amount");
  // Cumulative proportional allocation avoids rounding drift across partial refunds.
  const cumulative=sums.amount+refund.amountPaise;
  const goal=(v:bigint)=>v*cumulative/invoice.totalPaise;
  const cgst=goal(invoice.cgstPaise)-sums.cgst;
  const sgst=goal(invoice.sgstPaise)-sums.sgst;
  const igst=goal(invoice.igstPaise)-sums.igst;
  const taxable=refund.amountPaise-cgst-sgst-igst;
  if(taxable<0n)throw new HttpError(409,"CREDIT_NOTE_ROUNDING","Tax allocation invalid");
  const noteNumber=await number(tx,"C");
  await tx.financeCreditNote.create({data:{invoiceId:invoice.id,refundId:id,
   noteNumber,amountPaise:refund.amountPaise,taxablePaise:taxable,
   cgstPaise:cgst,sgstPaise:sgst,igstPaise:igst}});
  const result=await tx.paymentRefund.update({where:{id},
   data:{state:"SUCCEEDED",succeededAt:new Date()}});
  await tx.auditEvent.create({data:{actorUserId:null,
   action:"refund.provider_verified",resourceType:"payment_refund",resourceId:id}});
  await tx.outboxEvent.create({data:{aggregateType:"payment_refund",aggregateId:id,
   eventType:"refund.succeeded",payload:{refundId:id,orderId:refund.order.id}}});
  return result;
 });
}
/** Do not create a replacement refund ID after timeout. Reconcile by stable ID. */
export async function reconcileRefunds(db:PrismaClient,gateway:RefundGateway,limit=30){
 const rows=await db.paymentRefund.findMany({where:{state:{in:["QUEUED","SUBMITTED"]}},
  include:{order:true},orderBy:[{createdAt:"asc"},{id:"asc"}],
  take:Math.max(1,Math.min(limit,30))});
 let processed=0;
 for(const r of rows){
  if(r.order.currency.trim()!=="INR"||r.order.state!=="PAID"&&r.order.state!=="PAID_UNALLOCATED")
   throw new HttpError(409,"REFUND_ORDER_INVALID","Paid order required");
  const observation=r.state==="QUEUED"?
   await gateway.createRefund(r.order.providerOrderId,r.providerRefundId,
    r.amountPaise,r.reason):
   await gateway.getRefund(r.order.providerOrderId,r.providerRefundId);
  verifyRefund(observation,r.order.providerOrderId,r.providerRefundId,r.amountPaise);
  // CREATE returning SUCCESS is insufficient: confirm with separate GET.
  const verified=observation.status==="SUCCESS"?
   verifyRefund(await gateway.getRefund(r.order.providerOrderId,r.providerRefundId),
    r.order.providerOrderId,r.providerRefundId,r.amountPaise):observation;
  const changed=await commitRefundEvidence(db,r.id,verified);
  if(changed.state==="SUCCEEDED"||changed.state==="NEEDS_REVIEW")processed++;
 }
 return {checked:rows.length,finalized:processed};
}
