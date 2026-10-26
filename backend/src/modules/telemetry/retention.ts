import type { PrismaClient } from "@prisma/client";
import { serializableTransaction } from "../../db/transaction.js";
/** Delete raw GPS coordinates after 24 hours, without touching aggregate counts.
 * Execute from a separately controlled trusted scheduler.
 */
export async function purgeExpiredGps(db:PrismaClient,now=new Date()){
 return serializableTransaction(db,async tx=>{
  const end=new Date(now.getTime()-24*3600000);
  const closed=await tx.tripSession.updateMany({where:{endedAt:null,
   OR:[{startedAt:{lte:new Date(now.getTime()-12*3600000)}},
    {consent:{OR:[{revokedAt:{not:null}},{expiresAt:{lte:now}}]}}]},
   data:{endedAt:now}});
  const erased=await tx.gpsSample.deleteMany({where:{
   OR:[{createdAt:{lt:end}},{trip:{consent:{revokedAt:{not:null}}}}]}});
  return {closedTrips:closed.count,erasedGpsSamples:erased.count};
 });
}
