import { Prisma,type PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import { selectedServiceDates,equalSets } from "./schemas.js";
import { dateString } from "../pricing/schemas.js";

export const HOLD_TTL_MS=10*60*1000;
type DbTx=Prisma.TransactionClient;

/** Lock screens in stable lexical order before allocating/releasing individual days. */
export async function lockScreens(tx:DbTx,screenIds:string[]):Promise<void>{
  for(const id of [...new Set(screenIds)].sort())
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Screen" WHERE "id"=${id}::uuid FOR UPDATE`);
}
/** Removes ONLY expired/non-booked active rows. Historical items remain append-only. */
export async function reclaimExpired(tx:DbTx,screenIds:string[],dates:Date[],now:Date){
  const occupants=await tx.inventorySlot.findMany({where:{
    screenId:{in:screenIds},serviceDate:{in:dates}},
    include:{hold:true}});
  const expired=[...new Set(occupants.filter(x=>x.hold.state==="EXPIRED"||
    x.hold.state==="RELEASED"||
    (x.hold.state==="HELD"&&x.hold.expiresAt<=now)).map(x=>x.holdId))];
  if(expired.length){
    await tx.inventorySlot.deleteMany({where:{screenId:{in:screenIds},
      serviceDate:{in:dates},holdId:{in:expired}}});
    await tx.reservationHold.updateMany({where:{id:{in:expired},state:"HELD",
      expiresAt:{lte:now}},data:{state:"EXPIRED"}});
  }
  if(occupants.some(x=>!expired.includes(x.holdId)))
    throw new HttpError(409,"SCREEN_CAPACITY_CONFLICT",
      "One or more screens are already held or confirmed on those dates");
}
export async function assertReservationEligible(
  tx:DbTx,campaignId:string,quoteId:string,screenIds:string[],now:Date,
){
  const c=await tx.campaign.findUnique({where:{id:campaignId},
    include:{business:true,creative:{include:{asset:true}}}});
  if(!c||c.business.archivedAt||c.status!=="APPROVED"||
    !c.reviewedAt||c.submissionNumber<1)
    throw new HttpError(409,"CAMPAIGN_NOT_APPROVED","Approved active campaign required");
  const decision=await tx.campaignReview.findUnique({where:{campaignId_submissionNumber:{
    campaignId:c.id,submissionNumber:c.submissionNumber}}});
  if(!decision||decision.decision!=="APPROVED")
    throw new HttpError(409,"CAMPAIGN_EVIDENCE_MISSING","Approved review evidence required");
  if(c.creative.approval!=="APPROVED"||c.creative.asset.state!=="READY"||
    !c.creative.asset.processedSha256)
    throw new HttpError(422,"CREATIVE_NOT_APPROVED","Verified approved creative required");
  const q=await tx.priceQuote.findUnique({where:{id:quoteId}});
  if(!q||q.businessId!==c.ownerBusinessId||q.campaignId!==c.id||
     q.expiresAt<=now||q.createdAt<c.reviewedAt||
     !equalSets(q.screenIds,screenIds)||
     !equalSets(q.selectedWeekdays,c.weekdays)||
     dateString(q.startDate)!==dateString(c.startDate)||
     dateString(q.endDate)!==dateString(c.endDate))
    throw new HttpError(422,"QUOTE_NOT_ELIGIBLE",
      "Matching unexpired post-approval quotation required");
  const dates=selectedServiceDates(c.startDate,c.endDate,c.weekdays);
  const screens=await tx.screen.findMany({where:{id:{in:screenIds}},
    include:{vehicle:true,credential:true,
      location:{include:{zone:{include:{city:true}}}}}});
  if(screens.length!==screenIds.length)
    throw new HttpError(422,"SCREEN_UNAVAILABLE","All candidate screens must exist");
  for(const s of screens){
    const location=s.location;
    if(s.state!=="PAIRED"||!s.credential||s.credential.revokedAt||
       s.vehicle.verification!=="APPROVED"||
       !location||location.state!=="PUBLISHED"||
       location.zone.state!=="PUBLISHED"||location.zone.city.state!=="PUBLISHED")
      throw new HttpError(422,"SCREEN_NOT_VERIFIED",
        "Verified paired screen at a published site required");
    const driverApproved=await tx.driverApplication.count({where:{
      vehicleId:s.vehicleId,driverUserId:s.vehicle.driverUserId,state:"APPROVED"}});
    if(!driverApproved)
      throw new HttpError(422,"DRIVER_NOT_APPROVED","Approved driver required");
  }
  return {campaign:c,quote:q,dates};
}
