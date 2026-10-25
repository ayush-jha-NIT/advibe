import { z } from "zod";
const email = z.email().max(320).transform(value => value.trim().toLowerCase());
const password = z.string().min(12).max(128);
export const registerSchema = z.strictObject({
  email, password, displayName: z.string().trim().min(1).max(100),
  role: z.enum(["advertiser", "driver"]),
});
export const loginSchema = z.strictObject({
  email, password: z.string().min(1).max(256),
});
export const verifySchema = z.strictObject({
  challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/),
});
export const emailSchema = z.strictObject({ email });
export const resetSchema = z.strictObject({
  resetToken: z.string().regex(/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/i),
  newPassword: password,
});
