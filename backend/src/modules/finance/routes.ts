import {createHash,randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {z} from "zod";
import type {AppConfig} from "../../config/env.js";
import type {AuthDependencies} from "../auth/routes.js";
import {resolvePrincipal,requireRole,requireBusinessMembership} from "../auth/policy.js";
import {mutation} from "../pricing/guard.js";
import {integerPaise,bpsAmount} from "../pricing/money.js";
import {executeIdempotent} from "../drivers/idempotency.js";
import {serializableTransaction} from "../../db/transaction.js";
import {HttpError} from "../../lib/http-error.js";
import {validateBody} from "../../middleware/validate.js";
import {approved,issuer,splitTax} from "./policy.js";
import {nextFinancialNumber} from "./worker.js";
import {createRefundGateway,verifyRefund,type RefundGateway} from "./provider.js";
const safe=(f:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void f(q,s).catch(n);};
const uuid=z.uuid();
const pathId=(req:Request,key:string)=>{const r=uuid.safeParse(req.params[key]);
 if(!r.success)throw new HttpError(404,"NOT_FOUND","Resource unavailable");return r.data;};
const gstin=z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/);
const stateCode=z.string().regex(/^[0-9]{2}$/);
const invoiceInput=z.strictObject({
 paymentOrderId:uuid,
 recipientName:z.string().trim().min(3).max(220),
 recipientAddress:z.string().trim().min(8).max(500),
 recipientGstin:gstin.nullish(),
 recipientStateCode:stateCode,
 placeOfSupplyCode:stateCode,
 description:z.string().trim().min(8).max(250),
});
const refundInput=z.strictObject({
 paymentOrderId:uuid,amountPaise:z.int().min(100).max(100000000000),
 reason:z.string().trim().min(16).max(500),
 policyReference:z.string().trim().min(8).max(140).regex(/^[A-Za-z0-9_.:\/-]+$/),
});
const empty=z.strictObject({});
const amount=(n:bigint)=>integerPaise(n);
const invoiceView=(x:{id:string;paymentOrderId:string;invoiceNumber:string;issuedAt:Date;
 supplierName:string;supplierAddress:string;supplierGstin:string;supplierStateCode:string;
 recipientName:string;recipientAddress:string;recipientGstin:string|null;
 recipientStateCode:string;placeOfSupplyCode:string;sacCode:string;description:string;
 taxPolicyVersion:string;taxMode:string;subtotalPaise:bigint;discountPaise:bigint;
 taxablePaise:bigint;cgstPaise:bigint;sgstPaise:bigint;igstPaise:bigint;totalPaise:bigint})=>({
 id:x.id,paymentOrderId:x.paymentOrderId,invoiceNumber:x.invoiceNumber,
 issuedAt:x.issuedAt.toISOString(),supplier:{name:x.supplierName,address:x.supplierAddress,
 gstin:x.supplierGstin,stateCode:x.supplierStateCode},
 recipient:{name:x.recipientName,address:x.recipientAddress,
 gstin:x.recipientGstin,stateCode:x.recipientStateCode},
 placeOfSupplyCode:x.placeOfSupplyCode,sacCode:x.sacCode,
 description:x.description,taxPolicyVersion:x.taxPolicyVersion,taxMode:x.taxMode,
 currency:"INR",subtotalPaise:amount(x.subtotalPaise),
 discountPaise:amount(x.discountPaise),taxablePaise:amount(x.taxablePaise),
 cgstPaise:amount(x.cgstPaise),sgstPaise:amount(x.sgstPaise),
 igstPaise:amount(x.igstPaise),totalPaise:amount(x.totalPaise),
 statutoryEInvoiceIrin:null,
});
const refundView=(x:{id:string;paymentOrderId:string;providerRefundId:string;
 amountPaise:bigint;state:string;createdAt:Date;succeededAt:Date|null})=>({
 id:x.id,paymentOrderId:x.paymentOrderId,amountPaise:amount(x.amountPaise),
 status:x.state.toLowerCase(),createdAt:x.createdAt.toISOString(),
 succeededAt:x.succeededAt?.toISOString()??null,
 // Never expose provider refund IDs in advertiser-visible views.
});
export interface FinanceDependencies{gateway?:RefundGateway}
export function createFinanceRouter(config:AppConfig,auth:AuthDependencies,
 deps:FinanceDependencies={}):Router{
 const {db,settings}=auth,router=Router();
 let vendor=deps.gateway;
 const gateway=()=>vendor??(vendor=createRefundGateway());
 const admin=async(req:Request)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADMIN");return p;
 };
 router.post("/admin/invoices",validateBody(invoiceInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  const seller=issuer(config);
  const input=invoiceInput.parse(req.body);
  if(input.recipientGstin&&input.recipientGstin.slice(0,2)!==input.recipientStateCode)
   throw new HttpError(422,"GSTIN_STATE_MISMATCH","Recipient state and GSTIN mismatch");
  if(input.recipientStateCode!==input.placeOfSupplyCode)
   throw new HttpError(422,"PLACE_OF_SUPPLY_INVALID","Recipient and place of supply conflict");
  const output=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/invoices","POST",input,async tx=>{
    const order=await tx.paymentOrder.findUnique({where:{id:input.paymentOrderId},
     include:{quote:true,business:true,payments:true}});
    if(!order||order.state!=="PAID"||order.requiresResolution||
     order.business.archivedAt||order.currency.trim()!=="INR")
     throw new HttpError(409,"INVOICE_ORDER_NOT_PAYABLE","Confirmed paid order required");
    const q=order.quote;
    const taxPolicy=await tx.taxPolicy.findUnique({where:{version:q.taxPolicyVersion}});
    if(!taxPolicy||bpsAmount(q.taxablePaise,taxPolicy.taxBps)!==q.taxPaise)
     throw new HttpError(409,"INVOICE_TAX_POLICY_INVALID",
      "Quoted tax basis points must match immutable approved policy version");
    if(q.currency.trim()!=="INR"||q.totalPaise!==order.amountPaise||
     q.taxablePaise+q.taxPaise!==q.totalPaise||
     q.subtotalPaise-q.discountPaise!==q.taxablePaise||
     !q.taxPolicyVersion)
     throw new HttpError(409,"INVOICE_QUOTE_INCONSISTENT","Quote monetary snapshot invalid");
    const ok=order.payments.some(x=>x.status==="SUCCESS"&&
     x.amountPaise===order.amountPaise&&x.currency.trim()==="INR");
    if(!ok)throw new HttpError(409,"INVOICE_PAYMENT_UNVERIFIED",
     "Exactly matched verified successful payment required");
    const mode=seller.stateCode===input.placeOfSupplyCode?"INTRA":"INTER";
    const tax=splitTax(q.taxPaise,mode==="INTRA");
    const number=await nextFinancialNumber(tx,"I");
    const doc=await tx.financeInvoice.create({data:{
     paymentOrderId:order.id,businessId:order.businessId,
     invoiceNumber:number,financialYear:number.slice(2,6),
     supplierName:seller.name,supplierAddress:seller.address,
     supplierGstin:seller.gstin,supplierStateCode:seller.stateCode,
     recipientName:input.recipientName,recipientAddress:input.recipientAddress,
     recipientGstin:input.recipientGstin??null,
     recipientStateCode:input.recipientStateCode,
     placeOfSupplyCode:input.placeOfSupplyCode,
     sacCode:seller.sacCode,description:input.description,
     taxPolicyVersion:q.taxPolicyVersion,taxMode:mode,
     subtotalPaise:q.subtotalPaise,discountPaise:q.discountPaise,
     taxablePaise:q.taxablePaise,cgstPaise:tax.cgstPaise,sgstPaise:tax.sgstPaise,
     igstPaise:tax.igstPaise,totalPaise:q.totalPaise,createdByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"finance.invoice_issued",resourceType:"finance_invoice",resourceId:doc.id}});
    return doc.id;
   });
  const doc=await db.financeInvoice.findUniqueOrThrow({where:{id:output.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:invoiceView(doc)});
 }));
 router.get("/payments/orders/:orderId/invoice",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER","ADMIN");
  const orderId=pathId(req,"orderId");
  const order=await db.paymentOrder.findUnique({where:{id:orderId}});
  if(!order)throw new HttpError(404,"NOT_FOUND","Invoice unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,order.businessId);
  const doc=await db.financeInvoice.findUnique({where:{paymentOrderId:order.id}});
  if(!doc)throw new HttpError(404,"NOT_FOUND","Invoice unavailable");
  res.set("Cache-Control","no-store").json({data:invoiceView(doc)});
 }));
 router.get("/payments/orders/:orderId/credit-notes",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER","ADMIN");
  const orderId=pathId(req,"orderId"),order=await db.paymentOrder.findUnique({where:{id:orderId}});
  if(!order)throw new HttpError(404,"NOT_FOUND","Order unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,order.businessId);
  const credit=await db.financeCreditNote.findMany({where:{invoice:{paymentOrderId:orderId}},
   orderBy:{issuedAt:"desc"},take:50});
  res.set("Cache-Control","no-store").json({data:credit.map(x=>({
   id:x.id,noteNumber:x.noteNumber,invoiceId:x.invoiceId,
   issuedAt:x.issuedAt.toISOString(),amountPaise:amount(x.amountPaise),
   taxablePaise:amount(x.taxablePaise),cgstPaise:amount(x.cgstPaise),
   sgstPaise:amount(x.sgstPaise),igstPaise:amount(x.igstPaise)}))});
 }));
 router.post("/admin/refunds",validateBody(refundInput),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  approved(config,"refund");
  gateway(); // Verify server-side Cashfree credentials before creating a refund instruction.
  const input=refundInput.parse(req.body);
  const reply=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/admin/refunds","POST",input,async tx=>{
    // Serialize on PaymentOrder to prevent two different keys over-refunding the same order.
    const found=await tx.paymentOrder.findUnique({where:{id:input.paymentOrderId}});
    if(!found)throw new HttpError(404,"NOT_FOUND","Order unavailable");
    await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id"=${found.id}::uuid FOR UPDATE`;
    const order=await tx.paymentOrder.findUnique({where:{id:found.id},
     include:{invoice:true,refunds:true}});
    if(!order||!order.invoice||order.currency.trim()!=="INR"||
     order.state!=="PAID"||order.requiresResolution)
     throw new HttpError(409,"REFUND_NOT_APPROVED","Paid invoiced order and policy approval required");
    const allocated=order.refunds.filter(x=>x.state!=="NEEDS_REVIEW")
     .reduce((sum,r)=>sum+r.amountPaise,0n);
    // A FAILED provider status remains NEEDS_REVIEW: manual review required
    // before other refunds can be created, to avoid remote duplicate reversals.
    if(order.refunds.some(x=>x.state==="NEEDS_REVIEW"))
     throw new HttpError(409,"REFUND_REQUIRES_REVIEW","Uncertain refund must be reviewed");
    if(BigInt(input.amountPaise)>order.amountPaise-allocated)
     throw new HttpError(409,"REFUND_EXCEEDS_PAYMENT","Total refunds exceed verified collected funds");
    const row=await tx.paymentRefund.create({data:{
     paymentOrderId:order.id,providerRefundId:"adv_b19_"+randomUUID().replaceAll("-",""),
     amountPaise:BigInt(input.amountPaise),reason:input.reason,
     policyReference:input.policyReference,reviewedByUserId:p.userId}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,
     action:"finance.refund_queued",resourceType:"payment_refund",resourceId:row.id,
     metadata:{policyReference:input.policyReference}}});
    await tx.outboxEvent.create({data:{aggregateType:"payment_refund",aggregateId:row.id,
     eventType:"refund.queued",payload:{refundId:row.id}}});
    return row.id;
   });
  const row=await db.paymentRefund.findUniqueOrThrow({where:{id:reply.resourceId}});
  res.status(201).set("Cache-Control","no-store").json({data:refundView(row)});
 }));
 router.get("/payments/orders/:orderId/refunds",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER","ADMIN");
  const orderId=pathId(req,"orderId"),order=await db.paymentOrder.findUnique({where:{id:orderId}});
  if(!order)throw new HttpError(404,"NOT_FOUND","Order unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,order.businessId);
  const rows=await db.paymentRefund.findMany({where:{paymentOrderId:orderId},
   orderBy:[{createdAt:"desc"},{id:"desc"}],take:100});
  res.set("Cache-Control","no-store").json({data:rows.map(refundView)});
 }));
 router.post("/admin/finance/reconcile/:orderId",validateBody(empty),safe(async(req,res)=>{
  const p=await admin(req);mutation(req,config,p,settings.secret);
  const orderId=pathId(req,"orderId");
  const order=await db.paymentOrder.findUnique({where:{id:orderId},
   include:{payments:true,refunds:true}});
  if(!order)throw new HttpError(404,"NOT_FOUND","Order unavailable");
  const gatewayClient=gateway();
  const remote=await gatewayClient.getOrder(order.providerOrderId);
  const payments=await gatewayClient.listPayments(order.providerOrderId);
  // Separately fetch provider-reported refunds by stable IDs. Never trust a webhook alone.
  const observed=await Promise.all(order.refunds.map(async r=>
   verifyRefund(await gatewayClient.getRefund(order.providerOrderId,r.providerRefundId),
    order.providerOrderId,r.providerRefundId,r.amountPaise)));
  const providerPaid=payments.filter(x=>x.status==="SUCCESS");
  const localPaid=order.payments.filter(x=>x.status==="SUCCESS");
  const incoming=providerPaid.reduce((sum,x)=>sum+x.amountPaise,0n);
  const localIncoming=localPaid.reduce((sum,x)=>sum+x.amountPaise,0n);
  const refunded=order.refunds.filter(x=>x.state==="SUCCEEDED")
   .reduce((sum,x)=>sum+x.amountPaise,0n);
  const remoteRefunded=observed.filter(x=>x.status==="SUCCESS")
   .reduce((sum,x)=>sum+x.amountPaise,0n);
  const paymentsAgree=providerPaid.length===localPaid.length&&
   providerPaid.every(x=>x.currency==="INR"&&localPaid.some(y=>
    y.providerPaymentId===x.paymentId&&y.amountPaise===x.amountPaise));
  const refundsAgree=order.refunds.every((x,i)=>
   (x.state==="SUCCEEDED")===(observed[i]?.status==="SUCCESS"));
  const matched=remote.orderId===order.providerOrderId&&remote.currency==="INR"&&
   remote.amountPaise===order.amountPaise&&remote.status==="PAID"&&
   order.state==="PAID"&&!order.requiresResolution&&paymentsAgree&&
   incoming===order.amountPaise&&localIncoming===incoming&&
   refunded===remoteRefunded&&refundsAgree&&refunded<=incoming;
  const state=matched?"MATCHED":"MISMATCH";
  const event=await serializableTransaction(db,async tx=>{
   const record=await tx.financeReconciliationEvent.create({data:{
    paymentOrderId:order.id,providerOrderId:order.providerOrderId,state,
    expectedPaise:order.amountPaise,providerPaise:remote.amountPaise,
    verifiedPaymentsPaise:incoming,confirmedRefundsPaise:refunded,
    providerRefundsPaise:remoteRefunded,
    evidenceHash:createHash("sha256").update(randomUUID()+":"+JSON.stringify({
     order:remote,payments,refunds:observed,status:state},
     (_key,value:unknown)=>typeof value==="bigint"?value.toString():value)).digest("hex"),checkedByUserId:p.userId}});
   if(!matched)await tx.paymentOrder.update({where:{id:order.id},
    data:{requiresResolution:true}});
   await tx.auditEvent.create({data:{actorUserId:p.userId,
    action:matched?"finance.reconciliation_matched":"finance.reconciliation_mismatch",
    resourceType:"payment_order",resourceId:order.id}});
   return record;
  });
  res.set("Cache-Control","no-store").json({data:{
   id:event.id,orderId:order.id,state:event.state.toLowerCase(),
   expectedPaise:amount(event.expectedPaise),
   providerPaise:amount(event.providerPaise),
   verifiedPaymentsPaise:amount(event.verifiedPaymentsPaise),
   confirmedRefundsPaise:amount(event.confirmedRefundsPaise),
   providerRefundsPaise:amount(event.providerRefundsPaise),
   checkedAt:event.checkedAt.toISOString()}});
 }));
 router.get("/admin/finance/reconciliation",safe(async(req,res)=>{
  await admin(req);
  const list=await db.financeReconciliationEvent.findMany({
   orderBy:[{checkedAt:"desc"},{id:"desc"}],take:50});
  res.set("Cache-Control","no-store").json({data:list.map(x=>({
   id:x.id,orderId:x.paymentOrderId,state:x.state.toLowerCase(),
   checkedAt:x.checkedAt.toISOString(),
   expectedPaise:amount(x.expectedPaise),providerPaise:amount(x.providerPaise),
   confirmedRefundsPaise:amount(x.confirmedRefundsPaise)}))});
 }));
 return router;
}
