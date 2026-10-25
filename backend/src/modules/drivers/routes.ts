import { Prisma, type DriverApplication, type PrismaClient, type Vehicle, type VehicleType, type DriverExperience } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import { serializableTransaction } from "../../db/transaction.js";
import type { AuthDependencies } from "../auth/routes.js";
import { requireRole, resolvePrincipal, type AuthPrincipal } from "../auth/policy.js";
import { constantTimeHexMatch, mac } from "../auth/security.js";
import { driverStepInput, vehicleInput, type DriverStepInput } from "./schemas.js";
import { executeIdempotent } from "./idempotency.js";

const safe = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => { void fn(req, res).catch(next); };
const uuid = z.uuid();

function appOutput(value: DriverApplication) {
  return {
    id: value.id, state: value.state.toLowerCase(), completedStep: value.completedStep,
    version: value.version,
    city: value.city,
    experience: value.experience?.toLowerCase() ?? null,
    vehicleId: value.vehicleId,
    vehicleCategory: value.vehicleCategory?.toLowerCase() ?? null,
    screenChoice: value.screenChoice,
    agreementTemplateVersion: value.agreementTemplateVersion,
    confirmedReadiness: value.confirmedReadiness,
    submittedAt: value.submittedAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString(),
  };
}
function vehicleOutput(value: Vehicle) {
  return {
    id: value.id, type: value.type.toLowerCase(),
    model: value.model, year: value.year,
    verification: value.verification.toLowerCase(),
    registrationTokenPresent: value.registrationTokenHash !== null,
    createdAt: value.createdAt.toISOString(),
  };
}
function pathId(req: Request): string {
  const result = uuid.safeParse(req.params.applicationId);
  if (!result.success) throw new HttpError(404, "NOT_FOUND", "Application not found");
  return result.data;
}
function requiredCsrf(req: Request, config: AppConfig, principal: AuthPrincipal, secret: string): void {
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
  if (!constantTimeHexMatch(req.get("x-csrf-token") || "",
      mac({ secret } as AuthDependencies["settings"], "csrf", principal.tokenHash))) {
    throw new HttpError(403, "CSRF_FAILED", "CSRF token missing or invalid");
  }
  if (req.method === "PATCH" || (req.method === "POST" && req.path.endsWith("/vehicles"))) {
    if (!req.is("application/json")) {
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON body required");
    }
  }
}
function pageQuery(req: Request): { limit: number; cursor?: string } {
  const rawLimit = req.query.limit;
  if (rawLimit !== undefined && (typeof rawLimit !== "string" || !/^[1-9]\d{0,2}$/.test(rawLimit))) {
    throw new HttpError(422, "VALIDATION_ERROR", "Invalid page limit");
  }
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  if (limit > 100) throw new HttpError(422, "VALIDATION_ERROR", "Page limit must not exceed 100");
  if (req.query.cursor === undefined) return { limit };
  if (typeof req.query.cursor !== "string" ||
      !/^[A-Za-z0-9_-]{20,60}$/.test(req.query.cursor)) {
    throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
  }
  let value: string;
  try { value = Buffer.from(req.query.cursor, "base64url").toString("utf8"); }
  catch { throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor"); }
  if (!uuid.safeParse(value).success) throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
  return { limit, cursor: value };
}
const encoded = (id: string) => Buffer.from(id, "utf8").toString("base64url");
function safeProfile(user: { id: string; displayName: string; email: string; city: string | null; role: string; status: string }) {
  return { id: user.id, displayName: user.displayName, email: user.email,
    city: user.city, roles: [user.role.toLowerCase()], status: user.status.toLowerCase() };
}
function updateStep(input: DriverStepInput): Prisma.DriverApplicationUncheckedUpdateManyInput {
  switch (input.step) {
    case 1: return { city: input.city, experience: input.experience.toUpperCase() as DriverExperience };
    case 2: return { vehicleId: input.vehicleId, vehicleCategory: input.vehicleCategory.toUpperCase() as VehicleType };
    case 3: return { screenChoice: input.screenChoice };
    case 4: return { agreementTemplateVersion: input.agreementTemplateVersion };
    case 5: return { confirmedReadiness: input.confirmedReadiness };
  }
}

export function createDriverRouter(config: AppConfig, { db, settings }: AuthDependencies): Router {
  const router = Router();
  const driver = async (req: Request) => {
    const principal = await resolvePrincipal(req, db, settings);
    requireRole(principal, "DRIVER");
    return principal;
  };

  router.get("/me", safe(async (req, res) => {
    const principal = await driver(req);
    const profile = await db.user.findUniqueOrThrow({ where: { id: principal.userId },
      select: { id: true, displayName: true, email: true, city: true, role: true, status: true } });
    res.json({ data: safeProfile(profile) });
  }));

  router.get("/applications", safe(async (req, res) => {
    const principal = await driver(req);
    const { limit, cursor } = pageQuery(req);
    if (cursor && !(await db.driverApplication.findFirst({
      where: { id: cursor, driverUserId: principal.userId }, select: { id: true },
    }))) throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
    const applications = await db.driverApplication.findMany({
      where: { driverUserId: principal.userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const records = applications.slice(0, limit);
    res.json({ data: records.map(appOutput), meta: {
      limit, nextCursor: applications.length > limit && records.length
        ? encoded(records[records.length - 1]!.id) : null,
    } });
  }));

  router.post("/applications", safe(async (req, res) => {
    const principal = await driver(req);
    requiredCsrf(req, config, principal, settings.secret);
    // Body intentionally empty: server chooses driver ID and initial state.
    if (req.body !== undefined && (typeof req.body !== "object" ||
        req.body === null || Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
      throw new HttpError(422, "VALIDATION_ERROR", "Application creation accepts no input fields");
    }
    const record = await executeIdempotent(
      db, principal, req.get("idempotency-key"), "/api/v1/drivers/applications", "POST", {},
      async tx => {
        const created = await tx.driverApplication.create({ data: { driverUserId: principal.userId } });
        await tx.auditEvent.create({ data: { actorUserId: principal.userId,
          action: "driver.application_created", resourceType: "driver_application", resourceId: created.id } });
        return created.id;
      },
    );
    const application = await db.driverApplication.findFirst({
      where: { id: record.resourceId, driverUserId: principal.userId },
    });
    if (!application) throw new HttpError(404, "NOT_FOUND", "Application not found");
    res.status(201).json({ data: appOutput(application) });
  }));

  router.get("/applications/:applicationId", safe(async (req, res) => {
    const principal = await driver(req);
    const application = await db.driverApplication.findFirst({
      where: { id: pathId(req), driverUserId: principal.userId },
    });
    if (!application) throw new HttpError(404, "NOT_FOUND", "Application not found");
    res.json({ data: appOutput(application) });
  }));

  router.patch("/applications/:applicationId", validateBody(driverStepInput), safe(async (req, res) => {
    const principal = await driver(req);
    requiredCsrf(req, config, principal, settings.secret);
    const id = pathId(req);
    const input = driverStepInput.parse(req.body);
    const updated = await serializableTransaction(db, async tx => {
      const current = await tx.driverApplication.findFirst({
        where: { id, driverUserId: principal.userId },
      });
      if (!current) throw new HttpError(404, "NOT_FOUND", "Application not found");
      if (current.state !== "DRAFT") throw new HttpError(409, "APPLICATION_LOCKED", "Submitted drafts cannot be edited");
      if (current.version !== input.expectedVersion) {
        throw new HttpError(409, "VERSION_CONFLICT", "Draft changed; reload before saving");
      }
      if (input.step > current.completedStep + 1) {
        throw new HttpError(409, "STEP_OUT_OF_ORDER", "Complete earlier onboarding steps first");
      }
      if (input.step === 2) {
        const vehicle = await tx.vehicle.findFirst({ where: { id: input.vehicleId,
          driverUserId: principal.userId } });
        if (!vehicle || vehicle.type.toLowerCase() !== input.vehicleCategory ||
            vehicle.verification === "REJECTED") {
          throw new HttpError(422, "VEHICLE_INVALID", "Choose a vehicle registered to your account");
        }
      }
      const write = await tx.driverApplication.updateMany({
        where: { id, driverUserId: principal.userId, state: "DRAFT", version: current.version },
        data: { ...updateStep(input), completedStep: Math.max(current.completedStep, input.step),
          version: { increment: 1 } },
      });
      if (write.count !== 1) throw new HttpError(409, "VERSION_CONFLICT", "Draft changed; reload before saving");
      await tx.auditEvent.create({ data: { actorUserId: principal.userId,
        action: "driver.application_draft_saved", resourceType: "driver_application", resourceId: id,
        metadata: { step: input.step } } });
      return tx.driverApplication.findUniqueOrThrow({ where: { id } });
    });
    res.json({ data: appOutput(updated) });
  }));

  router.post("/applications/:applicationId/submit", safe(async (req, res) => {
    const principal = await driver(req);
    requiredCsrf(req, config, principal, settings.secret);
    const id = pathId(req);
    const record = await executeIdempotent(
      db, principal, req.get("idempotency-key"),
      "/api/v1/drivers/applications/" + id + "/submit", "POST", { applicationId: id },
      async tx => {
        const current = await tx.driverApplication.findFirst({
          where: { id, driverUserId: principal.userId }, include: { vehicle: true },
        });
        if (!current) throw new HttpError(404, "NOT_FOUND", "Application not found");
        if (current.state !== "DRAFT") throw new HttpError(409, "APPLICATION_LOCKED", "Application already submitted");
        if (current.completedStep !== 5 ||
            !current.city || !current.experience || !current.vehicleId ||
            !current.vehicleCategory || !current.vehicle ||
            current.vehicle.driverUserId !== principal.userId ||
            current.vehicle.verification === "REJECTED" ||
            current.vehicle.type !== current.vehicleCategory ||
            !current.screenChoice || !current.agreementTemplateVersion ||
            !current.confirmedReadiness) {
          throw new HttpError(422, "ONBOARDING_INCOMPLETE", "Complete all five onboarding steps before submitting");
        }
        const update = await tx.driverApplication.updateMany({
          where: { id, driverUserId: principal.userId, state: "DRAFT", version: current.version },
          data: { state: "SUBMITTED", submittedAt: new Date(), version: { increment: 1 } },
        });
        if (update.count !== 1) throw new HttpError(409, "VERSION_CONFLICT", "Draft changed; reload before submitting");
        await tx.auditEvent.create({ data: { actorUserId: principal.userId,
          action: "driver.application_submitted", resourceType: "driver_application", resourceId: id } });
        await tx.outboxEvent.create({ data: { aggregateType: "driver_application", aggregateId: id,
          eventType: "driver.application_submitted", payload: { applicationId: id } } });
        return id;
      },
    );
    const result = await db.driverApplication.findFirst({
      where: { id: record.resourceId, driverUserId: principal.userId },
    });
    if (!result) throw new HttpError(404, "NOT_FOUND", "Application not found");
    res.status(201).json({ data: appOutput(result) });
  }));

  router.get("/me/vehicles", safe(async (req, res) => {
    const principal = await driver(req);
    const { limit, cursor } = pageQuery(req);
    if (cursor && !(await db.vehicle.findFirst({
      where: { id: cursor, driverUserId: principal.userId }, select: { id: true },
    }))) throw new HttpError(422, "VALIDATION_ERROR", "Invalid cursor");
    const values = await db.vehicle.findMany({
      where: { driverUserId: principal.userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const records = values.slice(0, limit);
    res.json({ data: records.map(vehicleOutput), meta: {
      limit, nextCursor: values.length > limit && records.length
        ? encoded(records[records.length - 1]!.id) : null,
    } });
  }));

  router.post("/me/vehicles", validateBody(vehicleInput), safe(async (req, res) => {
    const principal = await driver(req);
    requiredCsrf(req, config, principal, settings.secret);
    const input = vehicleInput.parse(req.body);
    const vehicleTokenHash = input.registrationToken
      ? mac(settings, "vehicle-provider-token", input.registrationToken) : null;
    const result = await executeIdempotent(
      db, principal, req.get("idempotency-key"), "/api/v1/drivers/me/vehicles", "POST", {
        type: input.type, model: input.model, year: input.year, registrationTokenHash: vehicleTokenHash,
      }, async tx => {
        const count = await tx.vehicle.count({ where: { driverUserId: principal.userId } });
        if (count >= 10) throw new HttpError(409, "VEHICLE_LIMIT", "Maximum ten registered vehicles");
        const created = await tx.vehicle.create({ data: {
          driverUserId: principal.userId, type: input.type.toUpperCase() as VehicleType,
          model: input.model, year: input.year, registrationTokenHash: vehicleTokenHash,
        } });
        await tx.auditEvent.create({ data: { actorUserId: principal.userId,
          action: "driver.vehicle_added", resourceType: "vehicle", resourceId: created.id } });
        await tx.outboxEvent.create({ data: { aggregateType: "vehicle", aggregateId: created.id,
          eventType: "driver.vehicle_added", payload: { vehicleId: created.id } } });
        return created.id;
      },
    );
    const vehicle = await db.vehicle.findFirst({
      where: { id: result.resourceId, driverUserId: principal.userId },
    });
    if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found");
    res.status(201).json({ data: vehicleOutput(vehicle) });
  }));

  return router;
}
