import type { PrismaClient } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
import { lockScreens } from "./core.js";

/** One bounded sweep. Schedule externally in production, with advisory leader election. */
export async function expireReservationHolds(db:PrismaClient,limit=100):Promise<number>{
  const now=new Date();
  const expired=await db.reservationHold.findMany({where:{
    state:"HELD",expiresAt:{lte:now}},
    orderBy:[{expiresAt:"asc"},{id:"asc"}],take:Math.max(1,Math.min(limit,100))});
  let finished=0;
  for(const candidate of expired){
    const ok=await serializableTransaction(db,async tx=>{
      const items=await tx.reservationHoldItem.findMany({where:{holdId:candidate.id},
        select:{screenId:true}});
      await lockScreens(tx,items.map(x=>x.screenId));
      const h=await tx.reservationHold.findUnique({where:{id:candidate.id}});
      if(!h||h.state!=="HELD"||h.expiresAt>new Date())return false;
      await tx.inventorySlot.deleteMany({where:{holdId:h.id}});
      const changed=await tx.reservationHold.updateMany({where:{id:h.id,
        state:"HELD",expiresAt:{lte:new Date()}},data:{state:"EXPIRED"}});
      if(changed.count!==1)return false;
      await tx.auditEvent.create({data:{actorUserId:null,
        action:"inventory.hold_expired",resourceType:"reservation_hold",resourceId:h.id}});
      await tx.outboxEvent.create({data:{aggregateType:"reservation_hold",aggregateId:h.id,
        eventType:"inventory.hold_expired",payload:{holdId:h.id,campaignId:h.campaignId}}});
      return true;
    });
    if(ok)finished++;
  }
  return finished;
}
