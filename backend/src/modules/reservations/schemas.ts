import { z } from "zod";
import { atUtc,dateString } from "../pricing/schemas.js";
import { HttpError } from "../../lib/http-error.js";

export const uuid=z.uuid();
export const holdInput=z.strictObject({
  campaignId:uuid,quoteId:uuid,
  screenIds:z.array(uuid).min(1).max(100).refine(x=>new Set(x).size===x.length,
    "Screen IDs must be unique"),
});
export function equalSets<T extends string|number>(left:T[],right:T[]):boolean{
  return left.length===right.length&&
    new Set(left).size===left.length&&
    new Set(right).size===right.length&&
    left.every(x=>right.includes(x));
}
export function selectedServiceDates(start:Date,end:Date,weekdays:number[]):Date[]{
  const first=atUtc(dateString(start)).getTime(),last=atUtc(dateString(end)).getTime();
  const length=Math.round((last-first)/86400000)+1;
  if(length<1||length>60||weekdays.length<1||weekdays.length>7||
    new Set(weekdays).size!==weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))
    throw new HttpError(422,"INVALID_RESERVATION_DATES","Invalid campaign calendar");
  const daySet=new Set(weekdays);
  const dates:Date[]=[];
  for(let i=0;i<length;i++){
    const day=new Date(first+i*86400000);
    if(daySet.has(day.getUTCDay()))dates.push(day);
  }
  if(dates.length===0)throw new HttpError(422,"NO_SELECTED_DAYS","No chosen dates");
  return dates;
}
