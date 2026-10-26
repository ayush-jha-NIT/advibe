
import { HttpError } from "../../lib/http-error.js";
export function localMinuteToUtc(day:string,minute:number,zone:string):Date {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(minute)||minute<0||minute>1440)
  throw new HttpError(422,"DELIVERY_TIME_INVALID","Invalid local delivery time");
 const dayMs=Date.parse(day+"T00:00:00.000Z");
 if(!Number.isFinite(dayMs)||new Date(dayMs).toISOString().slice(0,10)!==day)
  throw new HttpError(422,"DELIVERY_TIME_INVALID","Invalid calendar date");
 let fmt:Intl.DateTimeFormat;
 try{fmt=new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",
  month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});}
 catch{throw new HttpError(422,"DELIVERY_ZONE_INVALID","Invalid city time zone");}
 const parts=(ms:number)=>{
  const p=Object.fromEntries(fmt.formatToParts(new Date(ms))
   .filter(x=>["year","month","day","hour","minute"].includes(x.type))
   .map(x=>[x.type,Number(x.value)]));
  return Date.UTC(p.year!,p.month!-1,p.day!,p.hour!,p.minute!);
 };
 const target=dayMs+minute*60000,offsets=new Set<number>();
 for(let h=-36;h<=36;h+=3){const ms=target+h*3600000;offsets.add(parts(ms)-ms);}
 const solutions=new Set<number>();
 for(const offset of offsets){
  const utc=target-offset;
  if(parts(utc)===target)solutions.add(utc);
 }
 if(solutions.size!==1)throw new HttpError(422,"DELIVERY_TIME_AMBIGUOUS",
  "Missing or ambiguous local time in city time zone");
 return new Date([...solutions][0]!);
}
