import { z } from "zod";
import { selectedDays } from "../pricing/money.js";
import { atUtc } from "../pricing/schemas.js";
export const uuid=z.uuid();
const iso=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{
 const d=atUtc(s);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
},"Invalid calendar date");
const hhmm=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const window=z.strictObject({start:hhmm,end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/)});
const fields={title:z.string().trim().min(1).max(180),creativeId:uuid,
 startDate:iso,endDate:iso,
 weekdays:z.array(z.int().min(0).max(6)).min(1).max(7)
  .refine(x=>new Set(x).size===x.length,"Weekdays must not repeat"),
 timeWindow:window.optional(),
};
export const createCampaignInput=z.strictObject({businessId:uuid,...fields})
 .refine(v=>v.startDate<=v.endDate,{message:"End must follow start"});
export const updateCampaignInput=z.strictObject({
 expectedRevision:z.int().min(1),title:fields.title.optional(),
 creativeId:fields.creativeId.optional(),startDate:iso.optional(),endDate:iso.optional(),
 weekdays:fields.weekdays.optional(),timeWindow:window.optional(),
}).refine(v=>Object.keys(v).length>1,"At least one campaign field must change");
export const decisionInput=z.strictObject({decision:z.enum(["approved","rejected","changes_requested"]),
 reason:z.string().trim().min(10).max(1000),expectedRevision:z.int().min(1)});
export function minutes(raw:string):number{
 const [h,m]=raw.split(":").map(Number);return h!*60+m!;
}
export function windowMinutes(input?:{start:string;end:string}):{startMinute:number;endMinute:number}{
 const startMinute=minutes(input?.start??"00:00"),endMinute=minutes(input?.end??"24:00");
 if(endMinute<=startMinute)throw new Error("Invalid time window");
 return {startMinute,endMinute};
}
export function formatMinute(v:number):string {
 return String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0");
}
export function validateSchedule(start:string,end:string,weekdays:number[],submission=false){
 if(start>end)throw new Error("End before start");
 const span=Math.round((atUtc(end).getTime()-atUtc(start).getTime())/86400000)+1;
 if(span<1||span>60)throw new Error("Campaign duration must be 1–60 days");
 if(submission){
  const today=new Date().toISOString().slice(0,10);
  const delta=Math.round((atUtc(start).getTime()-atUtc(today).getTime())/86400000);
  if(delta<0||delta>180)throw new Error("Campaign start must be within 180 days");
 }
 selectedDays(start,end,weekdays);
}
