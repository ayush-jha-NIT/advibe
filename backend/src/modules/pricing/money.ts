import { HttpError } from "../../lib/http-error.js";
import { atUtc } from "./schemas.js";
const safeMax=BigInt(Number.MAX_SAFE_INTEGER);
export function integerPaise(v:bigint):number {
  if(v<0n||v>safeMax)throw new HttpError(422,"QUOTE_AMOUNT_TOO_LARGE","Quote amount exceeds safe limit");
  return Number(v);
}
/** Always half-up to the nearest paise; never use binary floating point for money. */
export function bpsAmount(amount:bigint,basisPoints:number):bigint {
  if(!Number.isInteger(basisPoints)||basisPoints<0||basisPoints>10000)
    throw new HttpError(422,"POLICY_BPS_INVALID","Invalid rate in basis points");
  return (amount*BigInt(basisPoints)+5000n)/10000n;
}
export function selectedDays(start:string,end:string,days:number[]):number {
  const first=atUtc(start).getTime(),last=atUtc(end).getTime(),day=86400000;
  const count=Math.round((last-first)/day)+1;
  if(count<1||count>60)throw new HttpError(422,"CAMPAIGN_DATE_RANGE","Campaign must span 1 to 60 days");
  const requested=new Set(days);let matched=0;
  for(let i=0;i<count;i++)if(requested.has(new Date(first+i*day).getUTCDay()))matched++;
  if(matched===0)throw new HttpError(422,"NO_SELECTED_DAYS","No campaign days match selected weekdays");
  return matched;
}
export function computeMoney(rates:number[],days:number,taxBps:number,
  discount?:{kind:"PERCENT_BPS"|"FIXED_PAISE";value:number}){
  const subtotal=rates.reduce((sum,rate)=>{
    if(!Number.isInteger(rate)||rate<0||rate>1000000000)
      throw new HttpError(422,"RATE_INVALID","Invalid commercial rule");
    return sum+BigInt(rate)*BigInt(days);
  },0n);
  let reduction=0n;
  if(discount){
    reduction=discount.kind==="PERCENT_BPS"?bpsAmount(subtotal,discount.value):
      BigInt(discount.value);
    if(reduction>subtotal)reduction=subtotal;
  }
  const taxable=subtotal-reduction;
  const tax=bpsAmount(taxable,taxBps);
  const total=taxable+tax;
  for(const amount of [subtotal,reduction,taxable,tax,total])integerPaise(amount);
  return {subtotalPaise:subtotal,discountPaise:reduction,
    taxablePaise:taxable,taxPaise:tax,totalPaise:total};
}
