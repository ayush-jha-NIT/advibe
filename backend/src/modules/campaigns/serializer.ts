import type { Campaign } from "@prisma/client";
import { dateString } from "../pricing/schemas.js";
import { formatMinute } from "./schemas.js";
export function campaignResponse(c:Campaign){
 return {id:c.id,ownerBusinessId:c.ownerBusinessId,title:c.title,
  creativeId:c.creativeId,startDate:dateString(c.startDate),endDate:dateString(c.endDate),
  weekdays:c.weekdays,timeWindow:{start:formatMinute(c.startMinute),end:formatMinute(c.endMinute)},
  status:c.status.toLowerCase(),paymentStatus:"unpaid",inventoryStatus:"NOT_BOOKED",
  revision:c.revision,submissionNumber:c.submissionNumber,
  submittedAt:c.submittedAt?.toISOString()??null,
  reviewedAt:c.reviewedAt?.toISOString()??null,
  reviewReason:c.reviewReason,createdAt:c.createdAt.toISOString(),updatedAt:c.updatedAt.toISOString()};
}
