import {Prisma,type PrismaClient} from "@prisma/client";
import {z} from "zod";
import {HttpError} from "../../lib/http-error.js";

export type ReportRange={from:string;to:string;start:Date;endExclusive:Date;days:number};
export function reportRange(query:Record<string,unknown>,maxDays=366):ReportRange{
 const allowed=new Set(["from","to"]);
 if(Object.keys(query).some(k=>!allowed.has(k)))
  throw new HttpError(422,"REPORT_FILTER_INVALID","Unsupported report date filter");
 const now=new Date();
 const today=now.toISOString().slice(0,10);
 const defaultStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-29))
  .toISOString().slice(0,10);
 const from=z.iso.date().safeParse(query.from??defaultStart);
 const to=z.iso.date().safeParse(query.to??today);
 if(!from.success||!to.success)
  throw new HttpError(422,"REPORT_FILTER_INVALID","Valid ISO dates required");
 const start=new Date(from.data+"T00:00:00.000Z");
 const endExclusive=new Date(new Date(to.data+"T00:00:00.000Z").getTime()+86400000);
 const days=Math.round((endExclusive.getTime()-start.getTime())/86400000);
 if(!Number.isFinite(days)||days<1||days>maxDays)
  throw new HttpError(422,"REPORT_RANGE_INVALID","Report period outside permitted bounds");
 return {from:from.data,to:to.data,start,endExclusive,days};
}
const str=(v:bigint|null|undefined)=>String(v??0n);
type Tx=Prisma.TransactionClient;
export async function collectReport(db:PrismaClient,range:ReportRange){
 return db.$transaction(async(tx:Tx)=>{
  const [newUsers,newBusinesses,newCampaigns,paidOrders,unallocated,
   refunds,driverEarnings,payouts,incidents,maintenance,exceptions]=await Promise.all([
    tx.user.count({where:{createdAt:{gte:range.start,lt:range.endExclusive}}}),
    tx.business.count({where:{createdAt:{gte:range.start,lt:range.endExclusive}}}),
    tx.campaign.count({where:{createdAt:{gte:range.start,lt:range.endExclusive}}}),
    tx.paymentOrder.aggregate({where:{state:"PAID",requiresResolution:false,
      paidAt:{gte:range.start,lt:range.endExclusive}},
      _sum:{amountPaise:true},_count:{_all:true}}),
    tx.paymentOrder.aggregate({where:{state:"PAID_UNALLOCATED",
      paidAt:{gte:range.start,lt:range.endExclusive}},
      _sum:{amountPaise:true},_count:{_all:true}}),
    tx.paymentRefund.aggregate({where:{state:"SUCCEEDED",
      succeededAt:{gte:range.start,lt:range.endExclusive}},
      _sum:{amountPaise:true},_count:{_all:true}}),
    tx.driverEarning.aggregate({where:{createdAt:{gte:range.start,lt:range.endExclusive}},
      _sum:{amountPaise:true},_count:{_all:true}}),
    tx.driverPayout.aggregate({where:{state:"PAID",
      paidAt:{gte:range.start,lt:range.endExclusive}},
      _sum:{amountPaise:true},_count:{_all:true}}),
    tx.supportTicket.count({where:{createdAt:{gte:range.start,lt:range.endExclusive}}}),
    tx.screenMaintenance.count({where:{openedAt:{gte:range.start,lt:range.endExclusive}}}),
    tx.financeReconciliationEvent.count({where:{state:"MISMATCH",
      checkedAt:{gte:range.start,lt:range.endExclusive}}}),
  ]);
  const gross=paidOrders._sum.amountPaise??0n;
  const refunded=refunds._sum.amountPaise??0n;
  return {
   period:{from:range.from,to:range.to,timezone:"UTC",asOf:new Date().toISOString()},
   definition:"Platform operations and confirmed cash flows, not profit, tax return or verified human impressions",
   counts:{
    newUsers,newBusinesses,newCampaigns,paidBookings:paidOrders._count._all,
    paidUnallocatedOrders:unallocated._count._all,
    confirmedRefunds:refunds._count._all,
    reviewedDriverEarnings:driverEarnings._count._all,
    confirmedDriverPayouts:payouts._count._all,
    newSupportTickets:incidents,newMaintenanceCases:maintenance,
    financeReconciliationMismatches:exceptions,
   },
   currency:"INR",
   financial:{
    confirmedBookingGrossPaise:str(gross),
    confirmedRefundsPaise:str(refunded),
    periodDifferencePaise:str(gross-refunded),
    paidUnallocatedGrossPaise:str(unallocated._sum.amountPaise),
    reviewedDriverEarningsPaise:str(driverEarnings._sum.amountPaise),
    confirmedDriverPayoutsPaise:str(payouts._sum.amountPaise),
   },
   limitations:{
    dataSource:"PostgreSQL",
    accountingBasis:"Each category uses its own completion timestamp; period difference is not profit or a reconciled bank balance",
    bookingRule:"Only PAID, allocated, currently non-exception orders are in confirmedBookingGrossPaise",
    exposureRule:"No device playback or projected viewer count is classified as human impressions",
   },
  };
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:10000});
}
export function exportCsv(columns:string[],rows:ReadonlyArray<ReadonlyArray<unknown>>):string{
 const cell=(raw:unknown)=>{
  const s=String(raw??"").replaceAll("\r"," ").replaceAll("\n"," ");
  const safe=/^[\s]*[=+@\-\t]/u.test(s)?"'"+s:s;
  return '"'+safe.replaceAll('"','""')+'"';
 };
 return "\uFEFF"+columns.map(cell).join(",")+"\r\n"+
  rows.map(row=>row.map(cell).join(",")).join("\r\n")+(rows.length?"\r\n":"");
}
