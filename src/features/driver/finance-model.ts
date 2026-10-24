import type {DemoDatabase,Settlement} from "../../types/domain";
export type SettlementStatus=Settlement["status"];
export const settlementStatuses:readonly SettlementStatus[]=["pending","processed","failed"];
export function driverSettlements(db:DemoDatabase,driverId:string):Settlement[]{
 const campaigns=new Set(db.campaigns.map(c=>c.id));
 return db.settlements.filter(s=>s.driverId===driverId&&campaigns.has(s.campaignId))
  .sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd)||a.id.localeCompare(b.id));
}
export function settlementNet(s:Settlement):number{
 if(!Number.isSafeInteger(s.grossPaise)||!Number.isSafeInteger(s.deductionsPaise)||
 s.grossPaise<0||s.deductionsPaise<0||s.deductionsPaise>s.grossPaise)
 throw Error("Invalid fictional settlement amounts.");
 return s.grossPaise-s.deductionsPaise;
}
export function settlementSummary(rows:readonly Settlement[]){
 const out={total:rows.length,grossPaise:0,deductionsPaise:0,netPaise:0,pendingPaise:0,processedPaise:0,failedPaise:0};
 for(const item of rows){
  const net=settlementNet(item);
  out.grossPaise+=item.grossPaise;out.deductionsPaise+=item.deductionsPaise;out.netPaise+=net;
  if(item.status==="pending")out.pendingPaise+=net;
  if(item.status==="processed")out.processedPaise+=net;
  if(item.status==="failed")out.failedPaise+=net;
 }
 return out;
}
export function filteredDriverSettlements(rows:readonly Settlement[],db:DemoDatabase,query:string,status:SettlementStatus|"all",from:string,to:string):Settlement[]{
 const needle=query.trim().toLowerCase();
 return rows.filter(row=>(status==="all"||row.status===status)&&
  (!from||row.periodEnd>=from)&&(!to||row.periodStart<=to)&&
  (!needle||[row.id,row.campaignId,db.campaigns.find(c=>c.id===row.campaignId)?.title??""].some(text=>text.toLowerCase().includes(needle))));
}
export function monthlySettlementSeries(rows:readonly Settlement[]){
 const map=new Map<string,{month:string;pending:number;processed:number;failed:number}>();
 for(const row of rows){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.periodEnd))continue;
  const month=row.periodEnd.slice(0,7);
  const bucket=map.get(month)??{month,pending:0,processed:0,failed:0};
  bucket[row.status]+=settlementNet(row)/100;
  map.set(month,bucket);
 }
 return [...map.values()].sort((a,b)=>a.month.localeCompare(b.month));
}
export function settlementCSV(rows:readonly Settlement[],db:DemoDatabase):string{
 const csv=(value:string|number)=>'"'+String(value).replaceAll('"','""')+'"';
 const fields=["Settlement ID","Campaign","Period start","Period end","Gross INR","Deductions INR","Net INR","Demo status"];
 const lines=rows.map(s=>[s.id,db.campaigns.find(c=>c.id===s.campaignId)?.title??s.campaignId,s.periodStart,s.periodEnd,
  (s.grossPaise/100).toFixed(2),(s.deductionsPaise/100).toFixed(2),(settlementNet(s)/100).toFixed(2),s.status].map(csv).join(","));
 return ["DEMO RECORDS ONLY - NOT A PAYOUT PROOF",fields.map(csv).join(","),...lines].join("\r\n");
}
