import type { PrismaClient, AccountRole, BusinessRole } from "@prisma/client";
import type { Request } from "express";
import { HttpError } from "../../lib/http-error.js";
import { hashToken, readSessionCookie } from "./security.js";
import type { AuthSettings } from "./settings.js";

export interface AuthPrincipal {
  userId: string;
  role: AccountRole;
  sessionId: string;
  expiresAt: Date;
  tokenHash: string;
  mfaVerifiedAt: Date | null;
}

/** Re-read role, status and MFA state from DB on EVERY protected request. */
export async function resolvePrincipal(
  req: Request, db: PrismaClient, settings: AuthSettings,
): Promise<AuthPrincipal> {
  const token = readSessionCookie(req, settings);
  if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { mfaCredential: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE" || !session.user.emailVerifiedAt ||
      !session.user.passwordHash) {
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  }
  if (session.user.role === "ADMIN" &&
      (!session.mfaVerifiedAt || !session.user.mfaCredential?.enabledAt ||
       session.mfaVerifiedAt < session.user.mfaCredential.enabledAt)) {
    throw new HttpError(401, "MFA_REQUIRED", "Admin MFA verification required");
  }
  if (session.user.role !== "ADMIN" && session.mfaVerifiedAt) {
    // Demotion does not turn an Admin-scoped session into a lower-privilege session.
    throw new HttpError(401, "SESSION_INVALIDATED", "Sign in again after a role change");
  }
  return {
    userId: session.userId, role: session.user.role, sessionId: session.id,
    expiresAt: session.expiresAt, tokenHash: session.tokenHash,
    mfaVerifiedAt: session.mfaVerifiedAt,
  };
}
export function requireRole(principal: AuthPrincipal, ...roles: AccountRole[]): void {
  if (!roles.includes(principal.role)) throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
}
/** An Admin role never implicitly grants access to every advertiser's private records. */
export async function requireBusinessMembership(
  db: PrismaClient, principal: AuthPrincipal, businessId: string,
  allowedRoles: BusinessRole[] = ["OWNER", "MANAGER", "VIEWER"],
): Promise<BusinessRole> {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(businessId)) {
    throw new HttpError(404, "NOT_FOUND", "Business not found");
  }
  const membership = await db.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: principal.userId } },
    select: { role: true, revokedAt: true },
  });
  if (!membership || membership.revokedAt || !allowedRoles.includes(membership.role)) {
    // indistinguishable from nonexistent business: no tenant existence oracle.
    throw new HttpError(404, "NOT_FOUND", "Business not found");
  }
  return membership.role;
}
