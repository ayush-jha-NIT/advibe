
import type { PrismaClient } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
import { lockScreens } from "../reservations/core.js";
import { HttpError } from "../../lib/http-error.js";
import { deliveryEvidence,effectiveDeliveryState } from "./eligibility.js";

// Run from a controlled external scheduler; this is not a signed player gateway.
export async function reconcileDeliveryPlans(db:PrismaClient,limit=100):Promise<number>{
 const plans=await db.deliveryPlan.findMany({where:{state:{in:["SCHEDULED","ACTIVE"]}},
  orderBy:[{updatedAt:"asc"},{id:"asc"}],take:Math.max(1,Math.min(limit,100))});
 let changes=0;
 for(const candidate of plans){
  const moved=await serializableTransaction(db,async tx=>{
   const old=await tx.deliveryPlan.findUnique({where:{id:candidate.id},
    include:{windows:true}});
   if(!old||!["SCHEDULED","ACTIVE"].includes(old.state))return false;
   await lockScreens(tx,old.windows.map(w=>w.screenId));
   const now=new Date();
   let next=effectiveDeliveryState(old.windows,now);
   if(next!=="COMPLETED"){
    try{await deliveryEvidence(tx,old.reservationHoldId,now);}
    catch(e){
     if(!(e instanceof HttpError))throw e;
     next="PAUSED";
    }
   }
   if(next===old.state)return false;
   const change=await tx.deliveryPlan.updateMany({where:{id:old.id,
    state:old.state,revision:old.revision},data:{state:next,revision:{increment:1},
    ...(next==="PAUSED"?{pausedAt:now,pauseReason:"Delivery safety evidence is no longer valid"}:{}),
    ...(next==="COMPLETED"?{completedAt:now}:{})}});
   if(change.count!==1)return false;
   await tx.auditEvent.create({data:{actorUserId:null,
    action:"delivery."+next.toLowerCase(),resourceType:"delivery_plan",
    resourceId:old.id}});
   await tx.outboxEvent.create({data:{aggregateType:"delivery_plan",aggregateId:old.id,
    eventType:"delivery."+next.toLowerCase(),payload:{
     planId:old.id,campaignId:old.campaignId,state:next}}});
   return true;
  });
  if(moved)changes++;
 }
 return changes;
}
