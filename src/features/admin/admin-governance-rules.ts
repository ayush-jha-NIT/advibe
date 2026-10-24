import type {Account,Actor,DemoDatabase,Ticket} from "../../types/domain";
import {assertDemoAdmin} from "./admin-rules.ts";
export function validateAccountChange(db:DemoDatabase,actor:Actor,id:string,active:boolean):Account{
 assertDemoAdmin(actor);
 const account=db.accounts.find(a=>a.id===id);
 if(!account)throw Error("Sample account not found.");
 if(account.role==="admin")throw Error("The demo Admin account cannot be disabled or modified.");
 if(account.active===active)throw Error("Account already has this example status.");
 return account;
}
export function validateTicketTransition(db:DemoDatabase,actor:Actor,id:string,target:Ticket["status"]):Ticket{
 assertDemoAdmin(actor);
 const item=db.tickets.find(t=>t.id===id);
 if(!item)throw Error("Sample ticket not found.");
 const permitted:Record<Ticket["status"],readonly Ticket["status"][]>={
  open:["in_progress","resolved"],in_progress:["open","resolved"],resolved:["in_progress"]
 };
 if(!permitted[item.status].includes(target))throw Error("Invalid demo ticket status transition.");
 return item;
}
export function adminKPIs(db:DemoDatabase){
 const paid=db.payments.filter(p=>p.status==="paid").reduce((sum,p)=>sum+p.amountPaise,0);
 const refunded=db.payments.filter(p=>p.status==="refunded").reduce((sum,p)=>sum+p.amountPaise,0);
 const settlementNet=db.settlements.reduce((sum,s)=>sum+s.grossPaise-s.deductionsPaise,0);
 return {accounts:db.accounts.length,advertisers:db.accounts.filter(a=>a.role==="advertiser").length,
  drivers:db.accounts.filter(a=>a.role==="driver").length,campaigns:db.campaigns.length,
  sampleImpressions:db.campaigns.reduce((sum,c)=>sum+c.impressions,0),
  samplePaidPaise:paid,sampleRefundedPaise:refunded,sampleSettlementNetPaise:settlementNet,
  screens:db.screens.length,activeScreens:db.screens.filter(s=>s.status==="online").length,
  unresolvedTickets:db.tickets.filter(t=>t.status!=="resolved").length};
}
export function campaignStatusGroups(db:DemoDatabase){
 const count=new Map<string,number>();
 for(const c of db.campaigns)count.set(c.status,(count.get(c.status)??0)+1);
 return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([status,number])=>({status,number}));
}
export function csvCell(input:unknown):string{
 const s=String(input??"");
 // Protect people opening exported demo data in spreadsheet programs from formula injection.
 const safe=/^[\s]*[=+\-@]/.test(s)?"'"+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function adminCampaignCSV(db:DemoDatabase):string{
 const header=["Campaign ID","Advertiser","Title","Status","Payment status","Start","End","Sample impressions"];
 const lines=db.campaigns.map(c=>[c.id,c.advertiserId,c.title,c.status,c.paymentStatus,c.startDate,c.endDate,c.impressions].map(csvCell).join(","));
 return ["DEMO DATA - NOT A PRODUCTION FINANCE OR DELIVERY REPORT",header.map(csvCell).join(","),...lines].join("\r\n");
}
export function adminAuditCSV(db:DemoDatabase):string{
 const columns=["Event ID","Actor","Entity","Entity ID","Action","Recorded at"];
 return ["DEMO AUDIT TRAIL - BROWSER-LOCAL",columns.map(csvCell).join(","),...db.auditEvents.map(e=>[e.id,e.actorId,e.entity,e.entityId,e.action,e.createdAt].map(csvCell).join(","))].join("\r\n");
}
