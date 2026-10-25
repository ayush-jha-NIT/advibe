import { randomUUID } from "node:crypto";
import { Prisma, type Business, type PrismaClient } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import { serializableTransaction } from "../../db/transaction.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import type { AuthDependencies } from "../auth/routes.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { requireBusinessMembership, requireRole, resolvePrincipal,
  type AuthPrincipal } from "../auth/policy.js";
import { takeAuthRateSlot } from "../auth/throttle.js";
import { createOwnedBusiness } from "../businesses/repository.js";
import type { CaptchaVerifier } from "../enquiries/captcha.js";

const safe = (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => { void handler(req, res).catch(next); };
const uuid = z.uuid();
const accountInput = z.strictObject({
  displayName: z.string().trim().min(1).max(100).optional(),
  city: z.string().trim().min(1).max(100).nullable().optional(),
}).refine(body => Object.keys(body).length > 0);
const createBusinessInput = z.strictObject({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(100),
  legalName: z.string().trim().min(1).max(220).optional(),
});
const updateBusinessInput = z.strictObject({
  displayName: z.string().trim().min(1).max(160).optional(),
  city: z.string().trim().min(1).max(100).nullable().optional(),
  legalName: z.string().trim().min(1).max(220).nullable().optional(),
}).refine(body => Object.keys(body).length > 0);
const enquiryInput = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(320).transform(v => v.trim().toLowerCase()),
  subject: z.string().trim().min(5).max(120),
  message: z.string().trim().min(15).max(1500),
  consent: z.literal(true),
  captchaToken: z.string().min(20).max(2048),
});

function outputBusiness(business: Business) {
  return {
    id: business.id, slug: business.slug, displayName: business.displayName,
    legalName: business.legalName, city: business.city,
    verificationStatus: business.verificationStatus.toLowerCase(),
    createdAt: business.createdAt.toISOString(), updatedAt: business.updatedAt.toISOString(),
  };
}
function csrfOrigin(req: Request, config: AppConfig, principal: AuthPrincipal, secret: string): void {
  const origin = req.get("origin");
  if (origin && !config.corsOrigins.includes(origin)) {
    throw new HttpError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed");
  }
  if (req.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "CROSS_SITE_FORBIDDEN", "Cross-site request blocked");
  }
  if (config.nodeEnv === "production" && !origin &&
      !["same-site", "same-origin"].includes(req.get("sec-fetch-site") || "")) {
    throw new HttpError(403, "ORIGIN_REQUIRED", "Verified browser origin required");
  }
  const expected = mac({ secret } as AuthDependencies["settings"], "csrf", principal.tokenHash);
  if (!constantTimeHexMatch(req.get("x-csrf-token") || "", expected)) {
    throw new HttpError(403, "CSRF_FAILED", "CSRF token missing or invalid");
  }
  if (!req.is("application/json") && req.method !== "DELETE") {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type required");
  }
}
function checkPublicOrigin(req: Request, config: AppConfig): void {
  const origin = req.get("origin");
  if (origin && !config.corsOrigins.includes(origin)) {
    throw new HttpError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed");
  }
  if (req.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "CROSS_SITE_FORBIDDEN", "Cross-site request blocked");
  }
  if (!req.is("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type required");
  }
}
function businessIdParam(req: Request): string {
  const parsed = uuid.safeParse(req.params.businessId);
  if (!parsed.success) throw new HttpError(404, "NOT_FOUND", "Business not found");
  return parsed.data;
}
function formatAccount(user: {
  id: string; displayName: string; email: string; city: string | null; role: string; status: string;
}) {
  return {
    id: user.id, displayName: user.displayName, email: user.email, city: user.city,
    roles: [user.role.toLowerCase()], status: user.status.toLowerCase(),
  };
}

export function createAccountsRouter(
  config: AppConfig, { db, settings }: AuthDependencies, verifyCaptcha: CaptchaVerifier,
): Router {
  const router = Router();
  const principalFor = (req: Request) => resolvePrincipal(req, db, settings);
  const mutation = (req: Request, p: AuthPrincipal) => csrfOrigin(req, config, p, settings.secret);

  router.get("/me", safe(async (req, res) => {
    const p = await principalFor(req);
    const user = await db.user.findUniqueOrThrow({
      where: { id: p.userId },
      select: { id: true, displayName: true, email: true, city: true, role: true, status: true },
    });
    res.json({ data: formatAccount(user) });
  }));

  router.patch("/me", validateBody(accountInput), safe(async (req, res) => {
    const p = await principalFor(req);
    mutation(req, p);
    const changes = accountInput.parse(req.body);
    const updated = await serializableTransaction(db, async tx => {
      const user = await tx.user.update({
        where: { id: p.userId },
        data: { ...changes },
        select: { id: true, displayName: true, email: true, city: true, role: true, status: true },
      });
      await tx.auditEvent.create({ data: {
        actorUserId: p.userId, action: "account.profile_updated",
        resourceType: "user", resourceId: p.userId,
      } });
      return user;
    });
    res.json({ data: formatAccount(updated) });
  }));

  router.post("/businesses", validateBody(createBusinessInput), safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER");
    mutation(req, p);
    const input = createBusinessInput.parse(req.body);
    let business: Business;
    try {
      business = await createOwnedBusiness(db, p.userId, input);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "BUSINESS_EXISTS", "Business slug is already registered");
      }
      if (error instanceof Error && error.message.startsWith("Maximum ten")) {
        throw new HttpError(409, "BUSINESS_LIMIT", "Maximum active business count reached");
      }
      throw error;
    }
    res.status(201).json({ data: outputBusiness(business) });
  }));

  // A legacy single-business alias; requires the same current DB membership as detail reads.
  router.get("/businesses/me", safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER", "ADMIN");
    const entry = await db.businessMembership.findFirst({
      where: { userId: p.userId, revokedAt: null, business: { archivedAt: null } },
      include: { business: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (!entry) throw new HttpError(404, "NOT_FOUND", "Business not found");
    res.json({ data: outputBusiness(entry.business) });
  }));

  router.patch("/businesses/me", validateBody(updateBusinessInput), safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER");
    mutation(req, p);
    const owned = await db.business.findFirst({
      where: { ownerUserId: p.userId, archivedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (!owned) throw new HttpError(404, "NOT_FOUND", "Business not found");
    const business = await updateBusiness(db, p, owned.id, updateBusinessInput.parse(req.body));
    res.json({ data: outputBusiness(business) });
  }));

  router.get("/businesses", safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER", "ADMIN");
    const n = Number(req.query.limit ?? "20");
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new HttpError(422, "VALIDATION_ERROR", "limit must be between 1 and 100");
    }
    let cursor: string | undefined;
    if (req.query.cursor !== undefined) {
      if (typeof req.query.cursor !== "string") throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
      try { cursor = Buffer.from(req.query.cursor, "base64url").toString("utf8"); }
      catch { throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor"); }
      if (!uuid.safeParse(cursor).success) throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
      const visible = await db.businessMembership.findFirst({
        where: { id: cursor, userId: p.userId, revokedAt: null, business: { archivedAt: null } },
        select: { id: true },
      });
      if (!visible) throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
    }
    const memberships = await db.businessMembership.findMany({
      where: { userId: p.userId, revokedAt: null, business: { archivedAt: null } },
      include: { business: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: n + 1,
    });
    const items = memberships.slice(0, n);
    const next = memberships.length > n && items.length
      ? Buffer.from(items[items.length - 1]!.id, "utf8").toString("base64url") : null;
    res.json({ data: items.map(row => outputBusiness(row.business)),
      meta: { nextCursor: next, limit: n } });
  }));

  router.get("/businesses/:businessId", safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER", "ADMIN");
    const businessId = businessIdParam(req);
    await requireBusinessMembership(db, p, businessId);
    const business = await db.business.findFirst({
      where: { id: businessId, archivedAt: null,
        memberships: { some: { userId: p.userId, revokedAt: null } } },
    });
    if (!business) throw new HttpError(404, "NOT_FOUND", "Business not found");
    res.json({ data: outputBusiness(business) });
  }));

  router.patch("/businesses/:businessId", validateBody(updateBusinessInput), safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER");
    mutation(req, p);
    const businessId = businessIdParam(req);
    const business = await updateBusiness(db, p, businessId, updateBusinessInput.parse(req.body));
    res.json({ data: outputBusiness(business) });
  }));

  router.delete("/businesses/:businessId", safe(async (req, res) => {
    const p = await principalFor(req);
    requireRole(p, "ADVERTISER");
    mutation(req, p);
    const id = businessIdParam(req);
    await serializableTransaction(db, async tx => {
      const closed = await tx.business.updateMany({
        where: { id, ownerUserId: p.userId, archivedAt: null,
          memberships: { some: { userId: p.userId, revokedAt: null, role: "OWNER" } } },
        data: { archivedAt: new Date() },
      });
      if (closed.count !== 1) throw new HttpError(404, "NOT_FOUND", "Business not found");
      await tx.businessMembership.updateMany({
        where: { businessId: id, revokedAt: null }, data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({ data: {
        actorUserId: p.userId, action: "business.archived", resourceType: "business", resourceId: id,
      } });
      await tx.outboxEvent.create({ data: {
        aggregateType: "business", aggregateId: id,
        eventType: "business.archived", payload: { businessId: id },
      } });
    });
    res.json({ data: { message: "Business archived" } });
  }));

  router.post("/enquiries", validateBody(enquiryInput), safe(async (req, res) => {
    checkPublicOrigin(req, config);
    const input = enquiryInput.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    await takeAuthRateSlot(db, settings, "enquiry-ip", ip, 10, 3600);
    await takeAuthRateSlot(db, settings, "enquiry-email", input.email, 3, 3600);
    const valid = await verifyCaptcha(input.captchaToken, ip);
    if (!valid) throw new HttpError(422, "CAPTCHA_FAILED", "Enquiry verification failed");
    const now = new Date();
    const id = randomUUID();
    const submitterHash = mac(settings, "enquiry-submitter", ip);
    await db.$transaction([
      db.enquiry.create({ data: { id, name: input.name, email: input.email,
        subject: input.subject, message: input.message, consentAt: now,
        captchaVerifiedAt: now, submitterHash } }),
      db.outboxEvent.create({ data: { aggregateType: "enquiry", aggregateId: id,
        eventType: "enquiry.received", payload: { enquiryId: id } } }),
    ]);
    res.status(201).json({ data: { message: "Your enquiry has been received" } });
  }));

  return router;
}

async function updateBusiness(
  db: PrismaClient, principal: AuthPrincipal, id: string,
  values: z.output<typeof updateBusinessInput>,
): Promise<Business> {
  return serializableTransaction(db, async tx => {
    const updated = await tx.business.updateMany({
      where: { id, archivedAt: null, memberships: { some: {
        userId: principal.userId, revokedAt: null, role: { in: ["OWNER", "MANAGER"] },
      } } },
      data: values,
    });
    if (updated.count !== 1) throw new HttpError(404, "NOT_FOUND", "Business not found");
    const business = await tx.business.findUniqueOrThrow({ where: { id } });
    await tx.auditEvent.create({ data: {
      actorUserId: principal.userId, action: "business.updated", resourceType: "business", resourceId: id,
    } });
    await tx.outboxEvent.create({ data: {
      aggregateType: "business", aggregateId: id,
      eventType: "business.updated", payload: { businessId: id },
    } });
    return business;
  });
}
