import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {
 checkoutReadiness,filterPaymentRows,filterTickets,invoicePreview,ownerNotices,ownerPayments,ownerTickets,
 paymentTotals,validateAccountProfile,validateTicketDraft
} from "../src/features/advertiser/account-model.ts";

test("billing records are scoped by payment owner AND campaign owner",()=>{
 const db=createDemoSeed();
 db.payments.push({id:"pay-other",campaignId:"cmp-2",advertiserId:"adv-1",amountPaise:99900,status:"paid",provider:"demo"});
 const p=ownerPayments(db,"adv-1");
 assert.deepEqual(p.map(x=>x.id),["pay-1"]);
 assert.equal(ownerPayments(db,"adv-2").length,0);
 assert.deepEqual(paymentTotals(p),{paidPaise:188800,pendingPaise:0,refundedPaise:0,failedPaise:0,count:1});
 assert.equal(invoicePreview(db,"adv-2","pay-1"),null);
 assert.equal(invoicePreview(db,"adv-1","pay-1").campaign.title,"Festival Week");
 assert.equal(filterPaymentRows(p,db.campaigns,"FESTIVAL","all").length,1);
 assert.equal(filterPaymentRows(p,db.campaigns,"DEMO-ONLY-001","paid").length,1);
 assert.equal(filterPaymentRows(p,db.campaigns,"Festival","failed").length,0);
});
test("checkout preview never treats client data as a verified payment",()=>{
 const db=createDemoSeed();
 assert.equal(checkoutReadiness(db,"adv-1","cmp-3").eligible,false);
 assert.equal(checkoutReadiness(db,"adv-1","cmp-1").eligible,false);
 assert.equal(checkoutReadiness(db,"adv-1","cmp-2").eligible,false);
 const approved={...db.campaigns.find(c=>c.id==="cmp-3"),status:"approved",quoteEstimatePaise:188800};
 const fake={...db,campaigns:db.campaigns.map(c=>c.id==="cmp-3"?approved:c)};
 assert.deepEqual(checkoutReadiness(fake,"adv-1","cmp-3"),{
  eligible:true,message:"Eligible for a future server-created checkout order. Real Cashfree checkout is not configured.",amountPaise:188800
 });
 assert.equal(db.campaigns.find(c=>c.id==="cmp-3").paymentStatus,"unpaid");
});
test("notifications are scoped and filtered by account, never by title",()=>{
 const db=createDemoSeed();
 assert.deepEqual(ownerNotices(db,"adv-1").map(n=>n.id),["not-1"]);
 assert.deepEqual(ownerNotices(db,"adm-1").map(n=>n.id),["not-3"]);
 assert.deepEqual(ownerNotices(db,"unknown"),[]);
});
test("profile validation allows only non-sensitive display fields",()=>{
 assert.deepEqual(validateAccountProfile({name:"  Demo  Manager ",business:"  Brand  Co ",city:" Prayagraj "}),
  {name:"Demo Manager",business:"Brand Co",city:"Prayagraj"});
 assert.throws(()=>validateAccountProfile({name:"J",business:"Brand",city:"Delhi"}),/Display name/);
 assert.throws(()=>validateAccountProfile({name:"Demo User",business:"B",city:"Delhi"}),/Business name/);
});
test("support ticket validation checks ownership and usable text",()=>{
 const db=createDemoSeed(),actor={role:"advertiser",accountId:"adv-1"};
 const draft={subject:"  Campaign issue ",description:"Details of a sample issue and the campaign status",category:"campaign",campaignId:"cmp-1"};
 assert.equal(validateTicketDraft(db,actor,draft).subject,"Campaign issue");
 assert.throws(()=>validateTicketDraft(db,{role:"advertiser",accountId:"adv-2"},draft),/not associated/);
 assert.throws(()=>validateTicketDraft(db,actor,{...draft,campaignId:"cmp-2"}),/not associated/);
 assert.throws(()=>validateTicketDraft(db,actor,{...draft,description:"Too short"}),/15–1200/);
 assert.throws(()=>validateTicketDraft(db,actor,{...draft,category:"invalid"}),/valid support topic/);
 assert.throws(()=>validateTicketDraft(db,{role:"driver",accountId:"drv-1"},draft),/provisioned/);
});
test("support lists use account ownership and optional status, search",()=>{
 const db=createDemoSeed();
 db.tickets.push({id:"tkt-new",accountId:"adv-1",subject:"Billing status question",status:"open",createdAt:"2026-10-24",category:"billing"});
 const rows=ownerTickets(db,"adv-1");
 assert.equal(rows.length,1);
 assert.deepEqual(filterTickets(rows,"BILLING","open").map(x=>x.id),["tkt-new"]);
 assert.equal(filterTickets(rows,"", "resolved").length,0);
 assert.equal(ownerTickets(db,"adv-2").length,0);
});
