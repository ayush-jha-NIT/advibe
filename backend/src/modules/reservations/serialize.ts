import type { ReservationHold,ReservationHoldItem } from "@prisma/client";
import { dateString } from "../pricing/schemas.js";
export function effectiveState(x:ReservationHold,now=new Date()):"held"|"released"|"expired"|"confirmed"{
  if(x.state==="HELD"&&x.expiresAt<=now)return "expired";
  return x.state.toLowerCase() as "held"|"released"|"expired"|"confirmed";
}
export function holdView(h:ReservationHold&{items:ReservationHoldItem[]}){
  return {id:h.id,campaignId:h.campaignId,quoteId:h.quoteId,businessId:h.businessId,
    expiresAt:h.expiresAt.toISOString(),state:effectiveState(h),
    createdAt:h.createdAt.toISOString(),paymentStatus:"unpaid",
    allocationPolicy:"EXCLUSIVE_SCREEN_DAY",
    items:h.items.map(i=>({screenId:i.screenId,serviceDate:dateString(i.serviceDate)}))};
}
