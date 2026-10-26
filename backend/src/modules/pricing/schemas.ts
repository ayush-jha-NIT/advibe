import { z } from "zod";
const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{
  const d=new Date(v+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
},"Invalid calendar date");
export const uuid=z.uuid();
const placement=z.enum(["bike_rear","auto_rear","auto_side","car_rear","car_interior","helmet"]);
const rateFields={ratePaisePerScreenDay:z.int().min(0).max(1000000000),
  active:z.boolean(),validFrom:isoDate,validTo:isoDate};
export const createRuleInput=z.strictObject({
  cityId:uuid,placement,...rateFields,
}).refine(v=>v.validTo>=v.validFrom,{message:"Invalid period"});
export const updateRuleInput=z.strictObject({
  expectedVersion:z.int().min(1),...rateFields,
}).refine(v=>v.validTo>=v.validFrom,{message:"Invalid period"});
export const taxPolicyInput=z.strictObject({
  version:z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]+$/),
  taxBps:z.int().min(0).max(10000),active:z.boolean(),
  validFrom:isoDate,validTo:isoDate,
  sourceReference:z.string().trim().min(8).max(180),
}).refine(v=>v.validTo>=v.validFrom,{message:"Invalid period"});
export const discountInput=z.strictObject({
  code:z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/),
  expectedVersion:z.int().min(0),
  kind:z.enum(["percent_bps","fixed_paise"]),
  value:z.int().min(0).max(1000000000),
  active:z.boolean(),validFrom:isoDate,validTo:isoDate,
}).refine(v=>v.validTo>=v.validFrom&&
  (v.kind!=="percent_bps"||v.value<=10000),{message:"Invalid discount"});
export const quoteInput=z.strictObject({
  businessId:uuid,campaignId:uuid,
  screenIds:z.array(uuid).min(1).max(100).refine(a=>new Set(a).size===a.length,
    "Screen IDs must be unique"),
  startDate:isoDate,endDate:isoDate,
  weekdays:z.array(z.int().min(0).max(6)).min(1).max(7).refine(a=>new Set(a).size===a.length,
    "Weekdays must be unique"),
  discountCode:z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/).optional(),
}).refine(v=>v.endDate>=v.startDate,{message:"End date before start date"});
export function atUtc(date:string):Date {return new Date(date+"T00:00:00.000Z");}
export function dateString(d:Date):string {return d.toISOString().slice(0,10);}
