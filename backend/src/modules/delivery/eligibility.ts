
import { Prisma } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";
import { dateString } from "../pricing/schemas.js";
import { selectedServiceDates } from "../reservations/schemas.js";
import { localMinuteToUtc } from "./time.js";
type Tx=Prisma.TransactionClient;

export async function deliveryEvidence(tx:Tx,holdId:string,now=new Date()){
 const hold=await tx.reservationHold.findUnique({where:{id:holdId},include:{
  items:true,quote:true,campaign:{include:{creative:{include:{asset:true}}}},
  paymentOrder:{include:{payments:true}},business:true}});
 if(!hold)throw new HttpError(404,"NOT_FOUND","Booking unavailable");
 const c=hold.campaign,o=hold.paymentOrder,q=hold.quote;
 if(hold.state!=="CONFIRMED"||!hold.confirmedAt||hold.business.archivedAt||
    c.status!=="APPROVED"||!c.reviewedAt||c.ownerBusinessId!==hold.businessId||
    !o||o.state!=="PAID"||o.requiresResolution||!o.paidAt||
    o.reservationHoldId!==hold.id||o.campaignId!==c.id||
    o.businessId!==hold.businessId||o.quoteId!==q.id||
    o.currency!=="INR"||o.amountPaise!==q.totalPaise||
    !o.payments.some(p=>p.status==="SUCCESS"&&p.amountPaise===o.amountPaise&&p.currency==="INR"))
  throw new HttpError(409,"DELIVERY_PAYMENT_EVIDENCE_REQUIRED","Confirmed verified payment required");
 const review=await tx.campaignReview.findUnique({where:{campaignId_submissionNumber:{
  campaignId:c.id,submissionNumber:c.submissionNumber}}});
 if(!review||review.decision!=="APPROVED"||
    c.creative.approval!=="APPROVED"||c.creative.asset.state!=="READY"||
    !c.creative.asset.processedSha256||!c.creative.asset.processedVersionId)
  throw new HttpError(409,"DELIVERY_APPROVAL_REQUIRED","Approved campaign and processed creative required");
 const days=selectedServiceDates(c.startDate,c.endDate,c.weekdays);
 const ids=[...new Set(hold.items.map(i=>i.screenId))];
 const expected=new Set(ids.flatMap(id=>days.map(d=>id+":"+dateString(d))));
 if(!ids.length||hold.items.length!==expected.size||
    hold.items.some(i=>!expected.has(i.screenId+":"+dateString(i.serviceDate)))||
    q.screenIds.length!==ids.length||!ids.every(id=>q.screenIds.includes(id))||
    q.startDate.getTime()!==c.startDate.getTime()||
    q.endDate.getTime()!==c.endDate.getTime()||
    q.selectedWeekdays.length!==c.weekdays.length||
    !c.weekdays.every(d=>q.selectedWeekdays.includes(d)))
  throw new HttpError(409,"DELIVERY_BOOKING_MISMATCH","Booking does not match campaign calendar");
 const slots=await tx.inventorySlot.findMany({where:{holdId}});
 if(slots.length!==expected.size||slots.some(s=>!expected.has(s.screenId+":"+dateString(s.serviceDate))))
  throw new HttpError(409,"DELIVERY_CAPACITY_MISSING","Confirmed screen-day inventory missing");
 const screens=await tx.screen.findMany({where:{id:{in:ids}},include:{
  credential:true,vehicle:true,location:{include:{zone:{include:{city:true}}}}}});
 if(screens.length!==ids.length)throw new HttpError(409,"DELIVERY_SCREEN_MISSING","Booked screen missing");
 const byId=new Map(screens.map(s=>[s.id,s]));
 for(const s of screens){
  if(s.state!=="PAIRED"||!s.credential||s.credential.revokedAt||
    s.vehicle.verification!=="APPROVED"||s.placement!==c.creative.placement||
    !s.location||s.location.state!=="PUBLISHED"||
    s.location.zone.state!=="PUBLISHED"||s.location.zone.city.state!=="PUBLISHED"||
    !(await tx.driverApplication.count({where:{vehicleId:s.vehicleId,
      driverUserId:s.vehicle.driverUserId,state:"APPROVED"}})))
    throw new HttpError(409,"DELIVERY_SCREEN_NOT_READY","Booked screen or driver unverified");
 }
 const windows=hold.items.map(item=>{
  const zone=byId.get(item.screenId)!.location!.zone.city.timeZone;
  const day=dateString(item.serviceDate);
  const startsAt=localMinuteToUtc(day,c.startMinute,zone);
  const endsAt=localMinuteToUtc(day,c.endMinute,zone);
  if(endsAt<=startsAt)throw new HttpError(422,"DELIVERY_WINDOW_INVALID","Invalid playback window");
  return {holdId:hold.id,screenId:item.screenId,serviceDate:item.serviceDate,
   startsAt,endsAt,cityTimeZone:zone};
 });
 if(!windows.some(x=>x.endsAt>now))
  throw new HttpError(409,"DELIVERY_WINDOW_ENDED","Delivery windows have elapsed");
 return {hold,c,o,windows};
}
export function effectiveDeliveryState(windows:Array<{startsAt:Date;endsAt:Date}>,now:Date){
 if(windows.every(w=>w.endsAt<=now))return "COMPLETED" as const;
 return windows.some(w=>w.startsAt<=now&&w.endsAt>now)?"ACTIVE" as const:"SCHEDULED" as const;
}
