import type {Actor,Campaign,DemoDatabase,Notice,Payment,PaymentStatus,Ticket} from "../../types/domain";

export type AccountProfileDraft={name:string;business:string;city:string};
export type SupportCategory="campaign"|"billing"|"creative"|"technical"|"other";
export type TicketDraft={subject:string;description:string;category:SupportCategory;campaignId:string};
export const supportCategories:readonly SupportCategory[]=["campaign","billing","creative","technical","other"];
export const paymentStates:readonly PaymentStatus[]=["unpaid","pending","paid","failed","refunded"];

export function ownerPayments(db:DemoDatabase,owner:string):Payment[]{
 const ids=new Set(db.campaigns.filter(c=>c.advertiserId===owner).map(c=>c.id));
 return db.payments.filter(p=>p.advertiserId===owner&&ids.has(p.campaignId))
  .sort((a,b)=>a.id.localeCompare(b.id));
}
export function paymentTotals(rows:readonly Payment[]){
 const sum=(status:PaymentStatus)=>rows.filter(p=>p.status===status).reduce((total,p)=>total+p.amountPaise,0);
 return {paidPaise:sum("paid"),pendingPaise:sum("pending"),refundedPaise:sum("refunded"),
  failedPaise:sum("failed"),count:rows.length};
}
export function filterPaymentRows(rows:readonly Payment[],campaigns:readonly Campaign[],query:string,status:PaymentStatus|"all"){
 const titles=new Map(campaigns.map(c=>[c.id,c.title.toLowerCase()]));
 const search=query.trim().toLowerCase();
 return rows.filter(p=>(status==="all"||p.status===status)
  &&(!search||[p.id,p.campaignId,p.providerReference??"",titles.get(p.campaignId)??""].some(s=>s.toLowerCase().includes(search))));
}
export function invoicePreview(db:DemoDatabase,owner:string,paymentId:string){
 const payment=ownerPayments(db,owner).find(p=>p.id===paymentId);
 if(!payment)return null;
 const campaign=db.campaigns.find(c=>c.id===payment.campaignId&&c.advertiserId===owner);
 const account=db.accounts.find(a=>a.id===owner&&a.role==="advertiser");
 if(!campaign||!account)return null;
 return {payment,campaign,account};
}
/** A display-only decision. Never treats a client-store value as payment authority. */
export function checkoutReadiness(db:DemoDatabase,owner:string,campaignId:string):{eligible:boolean;message:string;amountPaise:number|null}{
 const c=db.campaigns.find(c=>c.id===campaignId&&c.advertiserId===owner);
 if(!c)return {eligible:false,message:"Campaign unavailable for this advertiser.",amountPaise:null};
 if(c.paymentStatus==="paid"||ownerPayments(db,owner).some(p=>p.campaignId===c.id&&p.status==="paid"))
  return {eligible:false,message:"A fictional paid record already exists. No second charge is offered.",amountPaise:c.quoteEstimatePaise??null};
 if(c.status!=="approved")return {eligible:false,message:"Admin campaign approval is required before a payment can be requested.",amountPaise:c.quoteEstimatePaise??null};
 if(!Number.isSafeInteger(c.quoteEstimatePaise)||!c.quoteEstimatePaise||c.quoteEstimatePaise<=0)
  return {eligible:false,message:"No valid server-confirmable quote is attached to this campaign.",amountPaise:null};
 return {eligible:true,message:"Eligible for a future server-created checkout order. Real Cashfree checkout is not configured.",amountPaise:c.quoteEstimatePaise};
}
export function ownerNotices(db:DemoDatabase,owner:string):Notice[]{
 return db.notices.filter(n=>n.recipientId===owner).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function ownerTickets(db:DemoDatabase,owner:string):Ticket[]{
 return db.tickets.filter(t=>t.accountId===owner).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function validateAccountProfile(input:AccountProfileDraft):AccountProfileDraft{
 const name=input.name.trim().replace(/\s+/g," "),business=input.business.trim().replace(/\s+/g," "),city=input.city.trim().replace(/\s+/g," ");
 if(name.length<2||name.length>80)throw Error("Display name must contain 2–80 characters.");
 if(business.length<2||business.length>100)throw Error("Business name must contain 2–100 characters.");
 if(city.length<2||city.length>80)throw Error("City must contain 2–80 characters.");
 return {name,business,city};
}
export function validateTicketDraft(db:DemoDatabase,actor:Actor,input:TicketDraft):TicketDraft{
 if(actor.role!=="advertiser"||!db.accounts.some(a=>a.id===actor.accountId&&a.role==="advertiser"))
  throw Error("Only a provisioned demo advertiser can submit a ticket.");
 const subject=input.subject.trim().replace(/\s+/g," "),description=input.description.trim();
 if(subject.length<5||subject.length>120)throw Error("Ticket subject must contain 5–120 characters.");
 if(description.length<15||description.length>1200)throw Error("Description must contain 15–1200 characters.");
 if(!supportCategories.includes(input.category))throw Error("Select a valid support topic.");
 if(input.campaignId&&!db.campaigns.some(c=>c.id===input.campaignId&&c.advertiserId===actor.accountId))
  throw Error("The selected campaign is not associated with your demo account.");
 return {...input,subject,description};
}
export function filterTickets(rows:readonly Ticket[],query:string,status:Ticket["status"]|"all"){
 const needle=query.trim().toLowerCase();
 return rows.filter(t=>(status==="all"||t.status===status)
  &&(!needle||[t.id,t.subject,t.category??"",t.description??""].some(s=>s.toLowerCase().includes(needle))));
}
