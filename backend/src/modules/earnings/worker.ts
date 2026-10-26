import { type PrismaClient } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { validTransfer,type PayoutGateway,type RemoteTransfer } from "./provider.js";
export async function applyVerifiedTransfer(db:PrismaClient,payoutId:string,
 remote:RemoteTransfer,event?:{hash:string;type:string}):Promise<boolean>{
 return serializableTransaction(db,async tx=>{
  const payout=await tx.driverPayout.findUnique({where:{id:payoutId},
   include:{settlement:true,beneficiary:true}});
  if(!payout)throw new HttpError(404,"NOT_FOUND","Payout unavailable");
  validTransfer(remote,payout.providerReference,payout.amountPaise);
  if(event){
   const prior=await tx.payoutWebhookEvent.findUnique({where:{eventHash:event.hash}});
   if(prior){
    if(prior.payoutId!==payout.id)
     throw new HttpError(409,"PAYOUT_WEBHOOK_REPLAY","Webhook assigned to another payout");
    return false;
   }
   await tx.payoutWebhookEvent.create({data:{
    payoutId:payout.id,eventHash:event.hash,eventType:event.type}});
  }
  if(payout.state==="PAID")return false;
  if(payout.state==="NEEDS_REVIEW")return false;
  if(remote.state==="PENDING"){
   if(payout.state==="QUEUED"){
    await tx.driverPayout.update({where:{id:payout.id},data:{state:"SUBMITTED"}});
    return true;
   }
   return false;
  }
  if(remote.state==="FAILED"){
   await tx.driverPayout.update({where:{id:payout.id},data:{state:"NEEDS_REVIEW"}});
   await tx.driverSettlement.update({where:{id:payout.settlementId},
    data:{state:"NEEDS_REVIEW"}});
   await tx.auditEvent.create({data:{actorUserId:null,
    action:"payout.provider_failed",resourceType:"driver_payout",resourceId:payout.id}});
   return true;
  }
  if(payout.settlement.state!=="PAYOUT_PENDING"||
    payout.settlement.grossPaise!==payout.amountPaise||
    payout.beneficiary.driverUserId!==payout.settlement.driverUserId)
   throw new HttpError(409,"PAYOUT_LEDGER_MISMATCH","Settlement reconciliation requires review");
  const now=new Date();
  await tx.driverPayout.update({where:{id:payout.id},data:{state:"PAID",paidAt:now}});
  await tx.driverSettlement.update({where:{id:payout.settlementId},
   data:{state:"PAID",paidAt:now}});
  await tx.driverLedgerEntry.create({data:{
   driverUserId:payout.settlement.driverUserId,kind:"PAYOUT",
   amountPaise:payout.amountPaise,payoutId:payout.id}});
  await tx.auditEvent.create({data:{actorUserId:null,action:"payout.provider_confirmed",
   resourceType:"driver_payout",resourceId:payout.id}});
  await tx.outboxEvent.create({data:{aggregateType:"driver_payout",aggregateId:payout.id,
   eventType:"payout.paid",payload:{payoutId:payout.id,settlementId:payout.settlementId}}});
  return true;
 });
}
/** External scheduler only; stable providerReference is used as transfer idempotency key.
 * Uncertain remote status never settles or creates a second bank instruction.
 */
export async function reconcilePayouts(db:PrismaClient,gateway:PayoutGateway,limit=30){
 const queued=await db.driverPayout.findMany({where:{
  state:{in:["QUEUED","SUBMITTED"]}},include:{settlement:true,beneficiary:true},
  orderBy:[{createdAt:"asc"},{id:"asc"}],take:Math.max(1,Math.min(limit,30))});
 let progressed=0;
 for(const payout of queued){
  let remote:RemoteTransfer;
  if(payout.state==="QUEUED"){
   if(payout.beneficiary.state!=="VERIFIED"||
      payout.beneficiary.driverUserId!==payout.settlement.driverUserId)
    throw new HttpError(409,"PAYOUT_BENEFICIARY_INVALID","Beneficiary verification required");
   const check=await gateway.verifyBeneficiary(payout.beneficiary.providerToken,
    payout.settlement.driverUserId);
   if(!check.verified||check.token!==payout.beneficiary.providerToken||
     check.driverUserId!==payout.settlement.driverUserId||check.provider!=="cashfree")
    throw new HttpError(503,"PAYOUT_BENEFICIARY_UNVERIFIED","Provider verification unavailable");
   // This must be an idempotent provider-side operation keyed by providerReference.
   remote=validTransfer(await gateway.createTransfer({
    reference:payout.providerReference,beneficiaryToken:payout.beneficiary.providerToken,
    amountPaise:payout.amountPaise,currency:"INR"}),payout.providerReference,payout.amountPaise);
  }else remote=validTransfer(await gateway.getTransfer(payout.providerReference),
    payout.providerReference,payout.amountPaise);
  // Completion requires an independent provider GET, never creation response alone.
  if(remote.state==="SUCCESS")
   remote=validTransfer(await gateway.getTransfer(payout.providerReference),
    payout.providerReference,payout.amountPaise);
  if(await applyVerifiedTransfer(db,payout.id,remote))progressed++;
 }
 return progressed;
}
