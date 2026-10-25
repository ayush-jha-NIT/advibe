import { createHmac, randomUUID } from "node:crypto";
import type { DriverDocument } from "@prisma/client";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { AuthDependencies } from "../auth/routes.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { resolvePrincipal, requireRole, type AuthPrincipal } from "../auth/policy.js";
import { executeIdempotent } from "../drivers/idempotency.js";
import { createPrivateKycStorage, type PrivateKycStorage } from "./storage.js";
import { getKycPolicy, type KycPolicy } from "./settings.js";

export interface KycDependencies { storage?: PrivateKycStorage; policy?: KycPolicy; }
const safe = (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => { void handler(req, res).catch(next); };
const uploadInput = z.strictObject({
  applicationId: z.uuid(), kind: z.enum(["licence","registration","insurance","other"]),
  contentType: z.enum(["application/pdf","image/jpeg","image/png"]),
  sizeBytes: z.int().min(1).max(10 * 1024 * 1024),
});
const scanInput = z.strictObject({
  eventId: z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),
  documentId: z.uuid(), verdict: z.enum(["clean","rejected"]),
  sha256: z.string().regex(/^[0-9a-f]{64}$/), versionId: z.string().min(1).max(200),
  timestamp: z.int().positive(),
});
const agreementInput = z.strictObject({
  templateVersion: z.string().min(1).max(100),
  templateSha256: z.string().regex(/^[0-9a-f]{64}$/),
  privacyVersion: z.string().min(1).max(100),
  acceptAgreement: z.literal(true), privacyConsent: z.literal(true),
});
const docDecision = z.strictObject({
  decision: z.enum(["verified","rejected"]), reason: z.string().trim().min(8).max(1000),
});
const reviewInput = z.strictObject({
  decision: z.enum(["approved","rejected","changes_requested"]),
  reason: z.string().trim().min(8).max(2000),
});
function documentOutput(d: DriverDocument) {
  return { id: d.id, applicationId: d.applicationId, kind: d.kind.toLowerCase(),
    contentType: d.contentType, sizeBytes: d.sizeBytes, status: d.status.toLowerCase(),
    uploadedAt: d.uploadedAt?.toISOString() ?? null,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    retentionUntil: d.retentionUntil.toISOString() };
}
function csrf(req: Request, config: AppConfig, principal: AuthPrincipal, settings: AuthDependencies["settings"]): void {
  const origin = req.get("origin");
  if (origin && !config.corsOrigins.includes(origin)) throw new HttpError(403, "ORIGIN_FORBIDDEN", "Origin not permitted");
  if (req.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "CROSS_SITE_FORBIDDEN", "Cross-site mutation blocked");
  if (config.nodeEnv === "production" && !origin &&
      !["same-origin","same-site"].includes(req.get("sec-fetch-site") || "")) {
    throw new HttpError(403, "ORIGIN_REQUIRED", "Verified origin required");
  }
  if (!constantTimeHexMatch(req.get("x-csrf-token") || "", mac(settings, "csrf", principal.tokenHash)))
    throw new HttpError(403, "CSRF_FAILED", "CSRF token required");
  if (!req.is("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON body required");
}
function idParam(req: Request, key: string): string {
  const parsed = z.uuid().safeParse(req.params[key]);
  if (!parsed.success) throw new HttpError(404,"NOT_FOUND","Resource not found");
  return parsed.data;
}
function page(req: Request): {limit:number; cursor?:string} {
  const raw = req.query.limit;
  const n = raw === undefined ? 20 : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100 || (raw !== undefined && typeof raw !== "string"))
    throw new HttpError(422, "VALIDATION_ERROR", "Invalid limit");
  if (req.query.cursor === undefined) return { limit:n };
  if (typeof req.query.cursor !== "string") throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
  let id: string;
  try { id = Buffer.from(req.query.cursor,"base64url").toString("utf8"); }
  catch { throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor"); }
  if (!z.uuid().safeParse(id).success) throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
  return { limit:n, cursor:id };
}
function encode(id:string) { return Buffer.from(id).toString("base64url"); }

export function createKycRouter(config: AppConfig, auth: AuthDependencies,
  injected: KycDependencies = {}): Router {
  const { db, settings } = auth;
  const storage = injected.storage ?? createPrivateKycStorage();
  const policy = () => injected.policy ?? getKycPolicy();
  const router = Router();
  const driver = async (req:Request) => {
    const p = await resolvePrincipal(req,db,settings); requireRole(p,"DRIVER"); return p;
  };
  const admin = async (req:Request) => {
    const p = await resolvePrincipal(req,db,settings); requireRole(p,"ADMIN"); return p;
  };
  router.post("/drivers/documents/upload-intents", validateBody(uploadInput), safe(async (req,res) => {
    const p = await driver(req); csrf(req,config,p,settings);
    const selected = uploadInput.parse(req.body);
    const pol = policy(); // Refuse uploads until legal retention and scan provider policy exist.
    const key = req.get("idempotency-key");
    const result = await executeIdempotent(db,p,key,"/api/v1/drivers/documents/upload-intents","POST",selected, async tx => {
      const app = await tx.driverApplication.findFirst({
        where: { id:selected.applicationId, driverUserId:p.userId, state: { in:["SUBMITTED","CHANGES_REQUESTED"] } },
      });
      if (!app) throw new HttpError(404,"NOT_FOUND","Submitted application not found");
      const id = randomUUID();
      await tx.driverDocument.create({ data: {
        id, applicationId:app.id,driverUserId:p.userId,kind:selected.kind.toUpperCase() as
          "LICENCE"|"REGISTRATION"|"INSURANCE"|"OTHER",
        contentType:selected.contentType,sizeBytes:selected.sizeBytes,
        storageKey:"kyc/"+p.userId+"/"+app.id+"/"+id,
        uploadExpiresAt:new Date(Date.now()+5*60_000),
        retentionUntil:new Date(Date.now()+pol.retentionDays*86_400_000),
      } });
      await tx.auditEvent.create({ data:{ actorUserId:p.userId,action:"kyc.upload_intent_created",
        resourceType:"driver_document",resourceId:id } });
      return id;
    });
    const doc = await db.driverDocument.findFirst({
      where:{id:result.resourceId,driverUserId:p.userId},
    });
    if (!doc) throw new HttpError(404,"NOT_FOUND","Document not found");
    if (doc.status !== "PENDING_UPLOAD" || doc.uploadExpiresAt<=new Date()) {
      throw new HttpError(409,"UPLOAD_INTENT_EXPIRED","Create a new private upload intent");
    }
    const signed = await storage.presignPut(doc.storageKey,doc.contentType,doc.sizeBytes);
    res.status(201).json({data:{assetId:doc.id,uploadUrl:signed.url,
      expiresAt:doc.uploadExpiresAt.toISOString(), requiredHeaders:signed.headers}});
  }));

  router.post("/drivers/documents/:documentId/complete", safe(async (req,res) => {
    const p = await driver(req);csrf(req,config,p,settings);
    const id = idParam(req,"documentId");
    const doc = await db.driverDocument.findFirst({where:{id,driverUserId:p.userId}});
    if (!doc) throw new HttpError(404,"NOT_FOUND","Document not found");
    if (doc.status!=="PENDING_UPLOAD") throw new HttpError(409,"DOCUMENT_LOCKED","Document already finalized");
    const head = await storage.head(doc.storageKey);
    if (head.sizeBytes!==doc.sizeBytes || head.contentType!==doc.contentType || !head.versionId)
      throw new HttpError(422,"UPLOAD_MISMATCH","Uploaded private object metadata does not match");
    const changed = await db.driverDocument.updateMany({
      where:{id,driverUserId:p.userId,status:"PENDING_UPLOAD"},
      data:{status:"UPLOADED",storageVersionId:head.versionId,uploadedAt:new Date()},
    });
    if(changed.count!==1)throw new HttpError(409,"DOCUMENT_LOCKED","Document already finalized");
    res.status(201).json({data:{message:"Uploaded document awaits independent scan"}});
  }));

  router.get("/drivers/applications/:applicationId/documents",safe(async(req,res)=>{
    const p=await driver(req);const id=idParam(req,"applicationId");
    const app=await db.driverApplication.findFirst({where:{id,driverUserId:p.userId},select:{id:true}});
    if(!app)throw new HttpError(404,"NOT_FOUND","Application not found");
    const docs=await db.driverDocument.findMany({where:{applicationId:id,driverUserId:p.userId},
      orderBy:[{createdAt:"desc"},{id:"desc"}]});
    res.json({data:docs.map(documentOutput)});
  }));

  router.post("/drivers/applications/:applicationId/accept-agreement",validateBody(agreementInput),safe(async(req,res)=>{
    const p=await driver(req);csrf(req,config,p,settings);
    const id=idParam(req,"applicationId");
    const input=agreementInput.parse(req.body);const pol=policy();
    if (input.templateVersion!==pol.agreementVersion || input.templateSha256!==pol.agreementSha256 ||
        input.privacyVersion!==pol.privacyVersion)
      throw new HttpError(409,"AGREEMENT_VERSION_CHANGED","Review the current published agreement and privacy notice");
    const result=await serializableTransaction(db,async tx=>{
      const app=await tx.driverApplication.findFirst({where:{id,driverUserId:p.userId,
        state:{in:["DRAFT","SUBMITTED","CHANGES_REQUESTED"]}}});
      if(!app)throw new HttpError(404,"NOT_FOUND","Application not found");
      if(app.agreementTemplateVersion!==input.templateVersion)
        throw new HttpError(409,"AGREEMENT_NOT_SELECTED","Select the current agreement version in onboarding");
      const existing=await tx.driverAgreement.findFirst({where:{
        applicationId:id,templateVersion:input.templateVersion,templateSha256:input.templateSha256}});
      if(existing)return existing;
      const receipt=await tx.driverAgreement.create({data:{
        applicationId:id,driverUserId:p.userId,templateVersion:pol.agreementVersion,
        templateSha256:pol.agreementSha256,privacyVersion:pol.privacyVersion,
        acceptedIpHash:mac(settings,"agreement-ip",req.ip||req.socket.remoteAddress||"unknown"),
      }});
      await tx.auditEvent.create({data:{actorUserId:p.userId,action:"driver.agreement_accepted",
        resourceType:"driver_agreement",resourceId:receipt.id}});
      return receipt;
    });
    res.status(201).json({data:{id:result.id,applicationId:id,templateVersion:result.templateVersion,
      templateSha256:result.templateSha256,privacyVersion:result.privacyVersion,
      acceptedAt:result.acceptedAt.toISOString()}});
  }));

  router.post("/drivers/applications/:applicationId/reopen",safe(async(req,res)=>{
    const p=await driver(req);csrf(req,config,p,settings);const id=idParam(req,"applicationId");
    const result=await serializableTransaction(db,async tx=>{
      const changed=await tx.driverApplication.updateMany({where:{id,driverUserId:p.userId,
        state:"CHANGES_REQUESTED"},data:{state:"DRAFT",submittedAt:null,version:{increment:1}}});
      if(changed.count!==1)throw new HttpError(409,"REOPEN_UNAVAILABLE","Application is not awaiting changes");
      await tx.auditEvent.create({data:{actorUserId:p.userId,action:"driver.application_reopened",
        resourceType:"driver_application",resourceId:id}});
      return tx.driverApplication.findUniqueOrThrow({where:{id}});
    });
    res.status(201).json({data:{id:result.id,state:"draft",version:result.version}});
  }));

  router.post("/webhooks/kyc/document-scan",validateBody(scanInput),safe(async(req,res)=>{
    const pol=policy();
    const input=scanInput.parse(req.body);
    if(Math.abs(Date.now()-input.timestamp)>300_000)throw new HttpError(401,"INVALID_SIGNATURE","Expired scan notification");
    const canonical=JSON.stringify([input.eventId,input.documentId,input.verdict,input.sha256,
      input.versionId,input.timestamp]);
    const expected=createHmac("sha256",pol.scanSecret).update(canonical).digest("hex");
    if(!constantTimeHexMatch(req.get("x-kyc-signature")||"",expected))
      throw new HttpError(401,"INVALID_SIGNATURE","Invalid scan notification");
    const applied=await serializableTransaction(db,async tx=>{
      const doc=await tx.driverDocument.findUnique({where:{id:input.documentId}});
      if(!doc || doc.status!=="UPLOADED" || doc.storageVersionId!==input.versionId)
        throw new HttpError(409,"INVALID_SCAN_STATE","Document is not ready for this scan");
      const event=await tx.kycScanEvent.create({data:{providerEventId:input.eventId,
        documentId:doc.id,verdict:input.verdict,digest:input.sha256}});
      const changed=await tx.driverDocument.updateMany({where:{id:doc.id,status:"UPLOADED",
        storageVersionId:input.versionId},data:{status:input.verdict==="clean"?"SCAN_CLEAN":"SCAN_REJECTED",
        sha256:input.sha256,scannedAt:new Date()}});
      if(changed.count!==1)throw new HttpError(409,"INVALID_SCAN_STATE","Document scan already processed");
      return event.id;
    });
    res.status(201).json({data:{received:true,eventId:applied}});
  }));

  router.get("/admin/driver-applications",safe(async(req,res)=>{
    await admin(req);const {limit,cursor}=page(req);
    if(cursor && !await db.driverApplication.findUnique({where:{id:cursor},select:{id:true}}))
      throw new HttpError(422,"VALIDATION_ERROR","Invalid cursor");
    const results=await db.driverApplication.findMany({where:{state:{not:"DRAFT"}},
      orderBy:[{createdAt:"desc"},{id:"desc"}],take:limit+1,
      ...(cursor?{cursor:{id:cursor},skip:1}:{})});
    const values=results.slice(0,limit);
    res.json({data:values.map(v=>({id:v.id,state:v.state.toLowerCase(),
      completedStep:v.completedStep,submittedAt:v.submittedAt?.toISOString()??null})),
      meta:{limit,nextCursor:results.length>limit&&values.length?encode(values[values.length-1]!.id):null}});
  }));

  router.get("/admin/driver-applications/:applicationId",safe(async(req,res)=>{
    await admin(req);const id=idParam(req,"applicationId");
    const app=await db.driverApplication.findUnique({where:{id},include:{
      documents:true,agreements:true,reviews:{orderBy:{createdAt:"desc"},take:10},
    }});
    if(!app || app.state==="DRAFT")throw new HttpError(404,"NOT_FOUND","Application not found");
    res.json({data:{id:app.id,driverUserId:app.driverUserId,state:app.state.toLowerCase(),
      completedStep:app.completedStep,submittedAt:app.submittedAt?.toISOString(),
      vehicleId:app.vehicleId,agreementTemplateVersion:app.agreementTemplateVersion,
      documents:app.documents.map(documentOutput),
      agreements:app.agreements.map(v=>({id:v.id,templateVersion:v.templateVersion,
        templateSha256:v.templateSha256,privacyVersion:v.privacyVersion,
        acceptedAt:v.acceptedAt.toISOString()})),
      reviews:app.reviews.map(v=>({id:v.id,decision:v.decision.toLowerCase(),reason:v.reason,
        createdAt:v.createdAt.toISOString()}))}});
  }));

  router.get("/admin/driver-documents/:documentId/download-url",safe(async(req,res)=>{
    const p=await admin(req);const id=idParam(req,"documentId");
    const doc=await db.driverDocument.findUnique({where:{id}});
    if(!doc || !doc.storageVersionId || doc.status==="PENDING_UPLOAD" ||
       doc.retentionUntil<=new Date())throw new HttpError(404,"NOT_FOUND","Document unavailable");
    const url=await storage.presignGet(doc.storageKey,doc.storageVersionId);
    await db.auditEvent.create({data:{actorUserId:p.userId,action:"kyc.document_accessed",
      resourceType:"driver_document",resourceId:id}});
    res.json({data:{url,expiresInSeconds:60}});
  }));

  router.post("/admin/driver-documents/:documentId/decision",validateBody(docDecision),safe(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings);
    const id=idParam(req,"documentId");const input=docDecision.parse(req.body);
    const doc=await db.driverDocument.findUnique({where:{id}});
    if(!doc || !["SCAN_CLEAN","SCAN_REJECTED"].includes(doc.status))
      throw new HttpError(409,"DOCUMENT_NOT_READY","Only independently scanned documents can be reviewed");
    if(doc.retentionUntil<=new Date())throw new HttpError(409,"DOCUMENT_EXPIRED","Document retention expired");
    if(input.decision==="verified"){
      if(doc.status!=="SCAN_CLEAN" || doc.uploadExpiresAt>new Date())
        throw new HttpError(409,"DOCUMENT_NOT_READY","Clean scan and completed upload window required");
      const head=await storage.head(doc.storageKey);
      if(head.versionId!==doc.storageVersionId || head.sizeBytes!==doc.sizeBytes ||
         head.contentType!==doc.contentType)
        throw new HttpError(409,"DOCUMENT_VERSION_CHANGED","Private document version changed since scanning");
    }
    const updated=await serializableTransaction(db,async tx=>{
      const changed=await tx.driverDocument.updateMany({where:{id,status:doc.status},
        data:{status:input.decision==="verified"?"VERIFIED":"REJECTED",
          reviewedByUserId:p.userId,reviewedAt:new Date()}});
      if(changed.count!==1)throw new HttpError(409,"DOCUMENT_NOT_READY","Document review already completed");
      await tx.auditEvent.create({data:{actorUserId:p.userId,
        action:"kyc.document_"+input.decision,resourceType:"driver_document",resourceId:id,
        metadata:{reason:input.reason}}});
      return tx.driverDocument.findUniqueOrThrow({where:{id}});
    });
    res.status(201).json({data:documentOutput(updated)});
  }));

  router.post("/admin/driver-applications/:applicationId/decision",validateBody(reviewInput),safe(async(req,res)=>{
    const p=await admin(req);csrf(req,config,p,settings);
    const id=idParam(req,"applicationId");const input=reviewInput.parse(req.body);
    const pol=policy();
    const result=await executeIdempotent(db,p,req.get("idempotency-key"),
      "/api/v1/admin/driver-applications/"+id+"/decision","POST",input,async tx=>{
        const app=await tx.driverApplication.findUnique({where:{id},
          include:{documents:true,agreements:true}});
        if(!app || !["SUBMITTED","UNDER_REVIEW"].includes(app.state))
          throw new HttpError(409,"REVIEW_NOT_ALLOWED","Application not available for review");
        const evidence=app.documents.filter(d=>d.status==="VERIFIED"&&d.retentionUntil>new Date());
        const kinds=new Set(evidence.map(d=>d.kind));
        const accepted=app.agreements.some(a=>a.templateVersion===pol.agreementVersion &&
          a.templateSha256===pol.agreementSha256 && a.privacyVersion===pol.privacyVersion &&
          a.templateVersion===app.agreementTemplateVersion);
        if(input.decision==="approved" &&
          (!accepted || !(["LICENCE","REGISTRATION","INSURANCE"] as const).every(kind=>kinds.has(kind))))
          throw new HttpError(422,"EVIDENCE_INCOMPLETE","Verified documents and current agreement required");
        const newState=input.decision.toUpperCase() as "APPROVED"|"REJECTED"|"CHANGES_REQUESTED";
        const changed=await tx.driverApplication.updateMany({where:{id,state:app.state},
          data:{state:newState,version:{increment:1}}});
        if(changed.count!==1)throw new HttpError(409,"REVIEW_CONFLICT","Application changed");
        const review=await tx.driverApplicationReview.create({data:{applicationId:id,
          adminUserId:p.userId,decision:newState,reason:input.reason,evidence:{
            documentIds:evidence.map(d=>d.id),agreementAccepted:accepted,
            requiredDocumentKinds:["LICENCE","REGISTRATION","INSURANCE"],
          }}});
        await tx.auditEvent.create({data:{actorUserId:p.userId,action:"driver.application_reviewed",
          resourceType:"driver_application",resourceId:id,metadata:{reviewId:review.id,decision:input.decision}}});
        await tx.outboxEvent.create({data:{aggregateType:"driver_application",aggregateId:id,
          eventType:"driver.application_reviewed",payload:{applicationId:id,decision:input.decision}}});
        return id;
      });
    const app=await db.driverApplication.findUnique({where:{id:result.resourceId}});
    if(!app)throw new HttpError(404,"NOT_FOUND","Application not found");
    res.status(201).json({data:{id:app.id,state:app.state.toLowerCase(),
      completedStep:app.completedStep,submittedAt:app.submittedAt?.toISOString()??null}});
  }));

  return router;
}
