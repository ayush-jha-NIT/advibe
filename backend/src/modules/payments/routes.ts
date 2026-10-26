import { randomUUID } from "node:crypto";
import { Router,type Request,type Response,type NextFunction } from "express";
import type { AppConfig } from "../../config/env.js";
import type { AuthDependencies } from "../auth/routes.js";
import { resolvePrincipal,requireRole,requireBusinessMembership } from "../auth/policy.js";
import { mutation } from "../pricing/guard.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { orderInput,uuid } from "./schemas.js";
import { createCashfreeGateway,type CashfreeGateway } from "./provider.js";
import { orderView,paymentView } from "./serialize.js";
import { settlePayment } from "./settle.js";
import { assertVerifiedPayment } from "./verify.js";
import { createPaymentWebhookRouter } from "./webhook.js";

export interface PaymentDependencies{gateway?:CashfreeGateway;webhookSecret?:string}
const safe=(f:(q:Request,s:Response)=>Promise<void>)=>
 (q:Request,s:Response,n:NextFunction):void=>{void f(q,s).catch(n);};
const supported=(config:AppConfig)=>{
 if(config.nodeEnv==="production"&&
   (process.env.PAYMENTS_ENABLED!=="true"||
    process.env.BOOKING_HOLDS_ENABLED!=="true"||
    process.env.PRICING_TAX_POLICY_APPROVED!=="true"||
    process.env.CASHFREE_ENV!=="production"))
  throw new HttpError(503,"PAYMENTS_NOT_ENABLED","Production payment processing is not approved");
};
export function createPaymentRoutes(config:AppConfig,auth:AuthDependencies,
 injected:PaymentDependencies={}):{api:Router;webhooks:Router}{
 const {db,settings}=auth;
 // Lazy resolution: unconfigured vendor secrets must never break unrelated API modules.
 let cached:CashfreeGateway|undefined=injected.gateway;
 const provider=()=>cached??(cached=createCashfreeGateway());
 const api=Router();
 api.post("/payments/orders",validateBody(orderInput),safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);supported(config);
  const input=orderInput.parse(req.body);
  const h=await db.reservationHold.findUnique({where:{id:input.reservationHoldId}});
  if(!h||h.campaignId!==input.campaignId||h.quoteId!==input.quoteId)
   throw new HttpError(404,"NOT_FOUND","Reservation unavailable");
  await requireBusinessMembership(db,p,h.businessId,["OWNER","MANAGER"]);
  const created=await executeIdempotent(db,p,req.get("idempotency-key"),
   "/api/v1/payments/orders","POST",input,async tx=>{
    const hold=await tx.reservationHold.findUnique({where:{id:h.id},
      include:{quote:true,campaign:true,business:true}});
    const member=await tx.businessMembership.findUnique({where:{
     businessId_userId:{businessId:h.businessId,userId:p.userId}}});
    if(!hold||!member||member.revokedAt||!["OWNER","MANAGER"].includes(member.role)||
       hold.business.archivedAt)
     throw new HttpError(404,"NOT_FOUND","Reservation unavailable");
    if(hold.state!=="HELD"||hold.expiresAt<=new Date()||
       hold.quote.expiresAt<=new Date()||
       hold.campaign.status!=="APPROVED"||hold.quote.totalPaise<100n||
       hold.quote.totalPaise>100000000000n)
     throw new HttpError(409,"RESERVATION_NOT_PAYABLE","Active priced hold required");
    const o=await tx.paymentOrder.create({data:{
     businessId:hold.businessId,campaignId:hold.campaignId,quoteId:hold.quoteId,
     reservationHoldId:hold.id,createdByUserId:p.userId,
     providerOrderId:"adv_"+randomUUID().replaceAll("-",""),
     amountPaise:hold.quote.totalPaise}});
    await tx.auditEvent.create({data:{actorUserId:p.userId,action:"payment.order_prepared",
     resourceType:"payment_order",resourceId:o.id}});
    return o.id;
   });
  let order=await db.paymentOrder.findUniqueOrThrow({where:{id:created.resourceId},
   include:{hold:true}});
  if(order.state==="CREATING"){
   const user=await db.user.findUniqueOrThrow({where:{id:p.userId}});
   const result=await provider().createOrder({providerOrderId:order.providerOrderId,
    amountPaise:order.amountPaise,customerId:p.userId,
    customerPhone:input.customerPhone,customerEmail:user.email,expiresAt:order.hold.expiresAt});
   if(result.providerOrderId!==order.providerOrderId||
      result.orderAmountPaise!==order.amountPaise||result.currency!=="INR"||
      !result.paymentSessionId||result.paymentSessionId.length>350)
    throw new HttpError(503,"CASHFREE_ORDER_MISMATCH","Cashfree order mismatch");
   await db.paymentOrder.updateMany({where:{id:order.id,state:"CREATING"},
    data:{state:"ACTIVE",providerSessionId:result.paymentSessionId}});
   order=await db.paymentOrder.findUniqueOrThrow({where:{id:order.id},
    include:{hold:true}});
  }
  res.status(201).set("Cache-Control","no-store").json({data:orderView(order)});
 }));
 api.get("/payments/orders/:orderId",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);
  requireRole(p,"ADVERTISER","ADMIN");
  const id=uuid.safeParse(req.params.orderId);
  if(!id.success)throw new HttpError(404,"NOT_FOUND","Order unavailable");
  const o=await db.paymentOrder.findUnique({where:{id:id.data}});
  if(!o)throw new HttpError(404,"NOT_FOUND","Order unavailable");
  if(p.role==="ADVERTISER")await requireBusinessMembership(db,p,o.businessId);
  res.set("Cache-Control","no-store").json({data:orderView(o)});
 }));
 api.get("/payments",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);
  requireRole(p,"ADVERTISER","ADMIN");
  const limit=req.query.limit===undefined?20:Number(req.query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>50||
    Object.keys(req.query).some(x=>x!=="limit"&&x!=="cursor"))
   throw new HttpError(422,"VALIDATION_ERROR","Invalid payment query");
  const cursor=req.query.cursor;
  if(cursor!==undefined&&(typeof cursor!=="string"||!uuid.safeParse(cursor).success))
   throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
  const rows=await db.paymentAttempt.findMany({where:{
    ...(cursor?{id:{gt:cursor as string}}:{}),
    ...(p.role==="ADVERTISER"?{order:{business:{archivedAt:null,
      memberships:{some:{userId:p.userId,revokedAt:null}}}}}:{}),
   },take:limit+1,orderBy:{id:"asc"}});
  const page=rows.slice(0,limit);
  res.set("Cache-Control","no-store").json({data:page.map(paymentView),meta:{
   limit,nextCursor:rows.length>limit?page[page.length-1]?.id??null:null}});
 }));
 api.post("/reservations/holds/:holdId/confirm",safe(async(req,res)=>{
  const p=await resolvePrincipal(req,db,settings);requireRole(p,"ADVERTISER");
  mutation(req,config,p,settings.secret);supported(config);
  const idem=req.get("idempotency-key");
  if(!idem||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(idem))
   throw new HttpError(422,"IDEMPOTENCY_REQUIRED","Valid Idempotency-Key required");
  const id=uuid.safeParse(req.params.holdId);
  if(!id.success)throw new HttpError(404,"NOT_FOUND","Hold unavailable");
  if(Object.keys(req.body??{}).length)
   throw new HttpError(422,"VALIDATION_ERROR","Confirmation accepts an empty JSON object");
  const order=await db.paymentOrder.findUnique({where:{reservationHoldId:id.data}});
  if(!order)throw new HttpError(404,"NOT_FOUND","Payment order unavailable");
  await requireBusinessMembership(db,p,order.businessId,["OWNER","MANAGER"]);
  if(order.state==="PAID"||order.state==="PAID_UNALLOCATED"){
   res.json({data:orderView(order)});return;
  }
  const remote=await provider().getOrder(order.providerOrderId);
  if(remote.providerOrderId!==order.providerOrderId||
     remote.currency!=="INR"||remote.amountPaise!==order.amountPaise||
     remote.status!=="PAID")
   throw new HttpError(409,"PAYMENT_NOT_VERIFIED","Provider has not confirmed full payment");
  const transactions=await provider().listPayments(order.providerOrderId);
  const succeeded=transactions.filter(x=>x.status==="SUCCESS");
  if(succeeded.length===0)
   throw new HttpError(409,"PAYMENT_NOT_VERIFIED","No successful Cashfree payment");
  for(const verified of succeeded){
   assertVerifiedPayment(verified,order,verified.providerPaymentId);
   await settlePayment(db,order.id,verified);
  }
  const current=await db.paymentOrder.findUniqueOrThrow({where:{id:order.id}});
  res.json({data:orderView(current)});
 }));
 return {api,webhooks:createPaymentWebhookRouter(db,{
  createOrder:async x=>provider().createOrder(x),
  getOrder:async x=>provider().getOrder(x),
  getPayment:async (x,y)=>provider().getPayment(x,y),
  listPayments:async x=>provider().listPayments(x),
 },
   injected.webhookSecret??process.env.CASHFREE_CLIENT_SECRET??"")};
}
