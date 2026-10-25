import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { Prisma, type PrismaClient } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { validateBody } from "../../middleware/validate.js";
import type { EmailSender } from "./email.js";
import { emailSchema, loginSchema, registerSchema, resetSchema, verifySchema } from "./schemas.js";
import { CHALLENGE_LIFETIME_MS, RESET_LIFETIME_MS, SESSION_LIFETIME_MS,
  clearSessionCookie, constantTimeHexMatch, hashToken, mac, makeCode, makeResetSecret,
  makeSessionToken, readSessionCookie, setSessionCookie } from "./security.js";
import type { AuthSettings } from "./settings.js";
import { takeAuthRateSlot } from "./throttle.js";

export interface AuthDependencies {
  db: PrismaClient;
  settings: AuthSettings;
  sender: EmailSender;
}
const argonOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
const invalid = (message = "Invalid or expired credential"): HttpError =>
  new HttpError(401, "INVALID_CREDENTIALS", message);
const asyncRoute = (f: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => { void f(req, res).catch(next); };

function safeUser(user: { id: string; role: string }, expiresAt: Date, csrfToken: string) {
  return { userId: user.id, role: user.role.toLowerCase(), expiresAt: expiresAt.toISOString(), csrfToken };
}

function requestIp(req: Request): string {
  // req.ip respects only audited Express TRUST_PROXY configuration.
  return req.ip || req.socket.remoteAddress || "unknown";
}

/** Explicit Origin and Fetch Metadata checks for all public auth state mutations. */
function publicMutationGuard(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const origin = req.get("origin");
    if (origin && !config.corsOrigins.includes(origin)) {
      return next(new HttpError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed"));
    }
    if (req.get("sec-fetch-site") === "cross-site") {
      return next(new HttpError(403, "CROSS_SITE_FORBIDDEN", "Cross-site request blocked"));
    }
    if (!req.is("application/json")) {
      return next(new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type required"));
    }
    next();
  };
}

async function getSession(req: Request, db: PrismaClient, settings: AuthSettings) {
  const principal = await resolvePrincipal(req, db, settings);
  return {
    session: {
      id: principal.sessionId, userId: principal.userId,
      expiresAt: principal.expiresAt,
      user: { id: principal.userId, role: principal.role },
    },
    csrfToken: mac(settings, "csrf", principal.tokenHash),
  };
}

async function ensureCsrf(req: Request, db: PrismaClient, settings: AuthSettings) {
  const result = await getSession(req, db, settings);
  const submitted = req.get("x-csrf-token") || "";
  if (!constantTimeHexMatch(submitted, result.csrfToken)) {
    throw new HttpError(403, "CSRF_FAILED", "CSRF token missing or invalid");
  }
  return result;
}

async function issueChallenge(
  db: PrismaClient, settings: AuthSettings,
  user: { id: string; email: string }, purpose: "VERIFY_EMAIL" | "PASSWORD_RESET",
) {
  const id = randomUUID();
  const code = purpose === "VERIFY_EMAIL" ? makeCode() : makeResetSecret();
  const digest = mac(settings, purpose, id + "." + code);
  await db.$transaction(async tx => {
    await tx.otpChallenge.updateMany({
      where: { userId: user.id, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await tx.otpChallenge.create({
      data: { id, userId: user.id, email: user.email, purpose, codeHash: digest,
        expiresAt: new Date(Date.now() + (purpose === "VERIFY_EMAIL"
          ? CHALLENGE_LIFETIME_MS : RESET_LIFETIME_MS)) },
    });
  });
  return { id, code };
}

async function sendVerification(sender: EmailSender, to: string, challenge: { id: string; code: string }) {
  await sender({
    to, subject: "AdVibe email verification",
    text: "Your AdVibe verification code is " + challenge.code +
      ". Challenge ID: " + challenge.id +
      ". The code expires in 10 minutes. If you did not request this, ignore this email.",
  });
}

export function createAuthRouter(
  config: AppConfig, { db, settings, sender }: AuthDependencies,
): Router {
  const router = Router();
  const guard = publicMutationGuard(config);

  router.post("/register", guard, validateBody(registerSchema), asyncRoute(async (req, res) => {
    const input = registerSchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "register-ip", requestIp(req), 12, 3600);
    await takeAuthRateSlot(db, settings, "register-email", input.email, 4, 3600);
    const hash = await argon2.hash(input.password, argonOptions);
    let user;
    try {
      user = await db.user.create({ data: {
        email: input.email, passwordHash: hash, displayName: input.displayName,
        role: input.role === "driver" ? "DRIVER" : "ADVERTISER",
        status: "PENDING",
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "ACCOUNT_EXISTS", "Account already registered");
      }
      throw error;
    }
    const challenge = await issueChallenge(db, settings, user, "VERIFY_EMAIL");
    try {
      await sendVerification(sender, user.email, challenge);
    } catch {
      // User remains pending; resend-verification can recover delivery.
      throw new HttpError(503, "DELIVERY_UNAVAILABLE", "Verification email unavailable; retry verification request");
    }
    res.status(201).json({ data: { message: "Verification email sent", challengeId: challenge.id } });
  }));

  router.post("/resend-verification", guard, validateBody(emailSchema), asyncRoute(async (req, res) => {
    const { email } = emailSchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "resend-ip", requestIp(req), 12, 3600);
    await takeAuthRateSlot(db, settings, "resend-email", email, 3, 3600);
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.status === "PENDING" && !user.emailVerifiedAt) {
      const challenge = await issueChallenge(db, settings, user, "VERIFY_EMAIL");
      try { await sendVerification(sender, user.email, challenge); } catch { /* avoid account enumeration */ }
    }
    res.status(201).json({ data: { message: "If verification is pending, a new code has been sent" } });
  }));

  router.post("/verify", guard, validateBody(verifySchema), asyncRoute(async (req, res) => {
    const { challengeId, code } = verifySchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "verify-ip", requestIp(req), 35, 3600);
    await takeAuthRateSlot(db, settings, "verify-challenge", challengeId, 10, 3600);
    const challenge = await db.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || !challenge.userId || challenge.purpose !== "VERIFY_EMAIL" ||
        challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
      throw invalid("Invalid or expired verification code");
    }
    if (!constantTimeHexMatch(challenge.codeHash, mac(settings, "VERIFY_EMAIL", challengeId + "." + code))) {
      await db.otpChallenge.updateMany({
        where: { id: challengeId, consumedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      throw invalid("Invalid or expired verification code");
    }
    await db.$transaction(async tx => {
      const consumed = await tx.otpChallenge.updateMany({
        where: { id: challengeId, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw invalid("Verification code already used");
      const activated = await tx.user.updateMany({
        where: { id: challenge.userId!, status: "PENDING", emailVerifiedAt: null },
        data: { status: "ACTIVE", emailVerifiedAt: new Date() },
      });
      if (activated.count !== 1) throw invalid("Account is not eligible for verification");
      await tx.auditEvent.create({ data: {
        actorUserId: challenge.userId, action: "auth.email_verified",
        resourceType: "user", resourceId: challenge.userId!,
      } });
    });
    res.status(201).json({ data: { message: "Email verified. Sign in to continue" } });
  }));

  router.post("/login", guard, validateBody(loginSchema), asyncRoute(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "login-ip", requestIp(req), 30, 900);
    await takeAuthRateSlot(db, settings, "login-email", email, 8, 900);
    const user = await db.user.findUnique({ where: { email } });
    // Verify an Argon2id hash on unknown accounts too, to reduce timing-based enumeration.
    const dummyHash = await argon2.hash("invalid-placeholder-password", argonOptions);
    const validPassword = await argon2.verify(user?.passwordHash || dummyHash, password);
    if (!user || !user.passwordHash || !validPassword || user.status !== "ACTIVE" ||
        !user.emailVerifiedAt) throw invalid();
    if (user.role === "ADMIN") {
      throw new HttpError(403, "ADMIN_MFA_REQUIRED", "Admin sign-in is disabled until MFA is implemented");
    }
    const token = makeSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    await db.$transaction(async tx => {
      const oldToken = readSessionCookie(req, settings);
      if (oldToken) await tx.session.updateMany({
        where: { tokenHash: hashToken(oldToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.session.create({ data: {
        userId: user.id, tokenHash: hashToken(token), expiresAt,
      } });
      await tx.auditEvent.create({ data: {
        actorUserId: user.id, action: "auth.login", resourceType: "session", resourceId: user.id,
      } });
    });
    setSessionCookie(res, token, settings);
    res.status(201).json({ data: safeUser(user, expiresAt, mac(settings, "csrf", hashToken(token))) });
  }));

  router.get("/session", asyncRoute(async (req, res) => {
    const { session, csrfToken } = await getSession(req, db, settings);
    res.json({ data: safeUser(session.user, session.expiresAt, csrfToken) });
  }));

  router.post("/logout", asyncRoute(async (req, res) => {
    const { session } = await ensureCsrf(req, db, settings);
    await db.session.updateMany({ where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() } });
    clearSessionCookie(res, settings);
    res.status(201).json({ data: { message: "Signed out" } });
  }));

  router.post("/logout-all", asyncRoute(async (req, res) => {
    const { session } = await ensureCsrf(req, db, settings);
    await db.session.updateMany({ where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() } });
    clearSessionCookie(res, settings);
    res.status(201).json({ data: { message: "All sessions revoked" } });
  }));

  router.post("/forgot-password", guard, validateBody(emailSchema), asyncRoute(async (req, res) => {
    const { email } = emailSchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "forgot-ip", requestIp(req), 15, 3600);
    await takeAuthRateSlot(db, settings, "forgot-email", email, 3, 3600);
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.status === "ACTIVE" && user.emailVerifiedAt && user.role !== "ADMIN") {
      const challenge = await issueChallenge(db, settings, user, "PASSWORD_RESET");
      const resetToken = challenge.id + "." + challenge.code;
      try {
        await sender({ to: user.email, subject: "AdVibe password reset",
          text: "To reset your AdVibe password open: " + settings.webOrigin +
            "/reset-password#token=" + resetToken +
            "\nThis link expires in 20 minutes. If you did not request it, ignore this email.",
        });
      } catch { /* never disclose whether an account exists */ }
    }
    res.status(201).json({ data: { message: "If your account is eligible, reset instructions have been sent" } });
  }));

  router.post("/reset-password", guard, validateBody(resetSchema), asyncRoute(async (req, res) => {
    const { resetToken, newPassword } = resetSchema.parse(req.body);
    await takeAuthRateSlot(db, settings, "reset-ip", requestIp(req), 20, 3600);
    const dot = resetToken.indexOf(".");
    const id = resetToken.slice(0, dot);
    const secret = resetToken.slice(dot + 1);
    const challenge = await db.otpChallenge.findUnique({ where: { id } });
    if (!challenge || !challenge.userId || challenge.purpose !== "PASSWORD_RESET" ||
        challenge.consumedAt || challenge.expiresAt <= new Date() ||
        !constantTimeHexMatch(challenge.codeHash, mac(settings, "PASSWORD_RESET", id + "." + secret))) {
      throw invalid("Invalid or expired reset token");
    }
    const hash = await argon2.hash(newPassword, argonOptions);
    await db.$transaction(async tx => {
      const consumed = await tx.otpChallenge.updateMany({
        where: { id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw invalid("Reset token already used");
      const changed = await tx.user.updateMany({
        where: { id: challenge.userId!, status: "ACTIVE", role: { not: "ADMIN" } },
        data: { passwordHash: hash },
      });
      if (changed.count !== 1) throw invalid("Account is not eligible for reset");
      await tx.session.updateMany({
        where: { userId: challenge.userId!, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.otpChallenge.updateMany({
        where: { userId: challenge.userId!, purpose: "PASSWORD_RESET", consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.auditEvent.create({ data: {
        actorUserId: challenge.userId, action: "auth.password_reset",
        resourceType: "user", resourceId: challenge.userId!,
      } });
    });
    clearSessionCookie(res, settings);
    res.status(201).json({ data: { message: "Password updated. Sign in again" } });
  }));
  return router;
}
