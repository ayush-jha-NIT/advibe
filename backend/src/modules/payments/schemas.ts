import { z } from "zod";
export const uuid=z.uuid();
export const orderInput=z.strictObject({
  campaignId:uuid,quoteId:uuid,reservationHoldId:uuid,
  customerPhone:z.string().regex(/^[6-9][0-9]{9}$/),
});
export const webhookInput=z.object({
 type:z.enum(["PAYMENT_SUCCESS_WEBHOOK","PAYMENT_FAILED_WEBHOOK","PAYMENT_USER_DROPPED_WEBHOOK"]),
 data:z.object({
  order:z.object({order_id:z.string().min(5).max(90)}),
  payment:z.object({cf_payment_id:z.union([z.string(),z.number()])}),
 }),
});
