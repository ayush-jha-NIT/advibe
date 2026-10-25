import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type { AuthSettings } from "./settings.js";
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;
export const RESET_LIFETIME_MS = 20 * 60 * 1000;
export const cookieName = (settings: AuthSettings): string =>
  settings.secureCookies ? "__Host-advibe_session" : "advibe_dev_session";
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const mac = (settings: AuthSettings, purpose: string, value: string): string =>
  createHmac("sha256", settings.secret).update(purpose).update(":").update(value).digest("hex");
export function constantTimeHexMatch(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(actual) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
export const makeCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const makeSessionToken = (): string => randomBytes(32).toString("base64url");
export const makeResetSecret = (): string => randomBytes(32).toString("base64url");
export function readSessionCookie(req: Request, settings: AuthSettings): string | null {
  const name = cookieName(settings);
  const matches = (req.headers.cookie || "").split(";").map(v => v.trim())
    .filter(v => v.startsWith(name + "="));
  if (matches.length !== 1) return null;
  const token = matches[0]?.slice(name.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function setSessionCookie(res: Response, token: string, settings: AuthSettings): void {
  res.cookie(cookieName(settings), token, { httpOnly: true, secure: settings.secureCookies,
    sameSite: "lax", path: "/", maxAge: SESSION_LIFETIME_MS });
}
export function clearSessionCookie(res: Response, settings: AuthSettings): void {
  res.clearCookie(cookieName(settings), { httpOnly: true, secure: settings.secureCookies,
    sameSite: "lax", path: "/" });
}
