import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { AuthSettings } from "./settings.js";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_MS = 30_000;

function decodeBase32(value: string): Buffer {
  let bits = 0, buffer = 0;
  const result: number[] = [];
  for (const ch of value.toUpperCase().replace(/=+$/, "")) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw new Error("Invalid MFA secret encoding");
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      result.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(result);
}
function encodeBase32(bytes: Buffer): string {
  let bits = 0, buffer = 0, encoded = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) encoded += alphabet[(buffer << (5 - bits)) & 31];
  return encoded;
}
export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}
export function totpForStep(secret: string, step: number): string {
  if (!Number.isSafeInteger(step) || step < 0) throw new Error("Invalid TOTP counter");
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const index = digest[digest.length - 1]! & 15;
  const value = (digest.readUInt32BE(index) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}
export function verifyTotpStep(
  secret: string, submitted: string, now = Date.now(),
): bigint | null {
  if (!/^[0-9]{6}$/.test(submitted)) return null;
  const current = Math.floor(now / STEP_MS);
  for (const delta of [-1, 0, 1]) {
    const step = current + delta;
    if (step < 0) continue;
    const expected = Buffer.from(totpForStep(secret, step));
    if (timingSafeEqual(expected, Buffer.from(submitted))) return BigInt(step);
  }
  return null;
}

function encryptionKey(settings: AuthSettings): Buffer {
  if (!settings.mfaEncryptionKey || !/^[0-9a-f]{64}$/i.test(settings.mfaEncryptionKey)) {
    throw new Error("MFA_ENCRYPTION_KEY must be a separate 32-byte hexadecimal secret");
  }
  return Buffer.from(settings.mfaEncryptionKey, "hex");
}
export function encryptTotpSecret(
  settings: AuthSettings, userId: string, secret: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(settings), iv);
  cipher.setAAD(Buffer.from("advibe-mfa-v1:" + userId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(v => v.toString("base64url")).join(".");
}
export function decryptTotpSecret(
  settings: AuthSettings, userId: string, encrypted: string,
): string {
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted MFA credential");
  const [ivText, tagText, bodyText] = parts as [string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(settings), Buffer.from(ivText, "base64url"));
  decipher.setAAD(Buffer.from("advibe-mfa-v1:" + userId));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyText, "base64url")), decipher.final()]).toString();
}

/**
 * Trusted operator only. NEVER expose this function over HTTP.
 * Pending records cannot be used to log in until the secret is activated.
 */
export async function provisionAdminMfa(
  db: PrismaClient, settings: AuthSettings, userId: string,
): Promise<{ secret: string; uri: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, include: { mfaCredential: true } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" ||
      !user.passwordHash || !user.emailVerifiedAt) throw new Error("Eligible admin required");
  if (user.mfaCredential?.enabledAt) throw new Error("Active MFA cannot be silently replaced");
  const secret = generateTotpSecret();
  await db.adminMfaCredential.upsert({
    where: { userId },
    create: { userId, secretCipher: encryptTotpSecret(settings, userId, secret) },
    update: { secretCipher: encryptTotpSecret(settings, userId, secret), lastUsedStep: -1n, enabledAt: null },
  });
  return { secret, uri: "otpauth://totp/" + encodeURIComponent("AdVibe:" + user.email) +
    "?secret=" + secret + "&issuer=AdVibe&algorithm=SHA1&digits=6&period=30" };
}

/** Require possession of the authenticator before enabling Admin MFA. */
export async function activateAdminMfa(
  db: PrismaClient, settings: AuthSettings, userId: string, code: string,
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, include: { mfaCredential: true } });
  if (user?.role !== "ADMIN" || user.status !== "ACTIVE" || !user.mfaCredential ||
      user.mfaCredential.enabledAt) throw new Error("Pending admin MFA enrollment required");
  const secret = decryptTotpSecret(settings, userId, user.mfaCredential.secretCipher);
  const step = verifyTotpStep(secret, code);
  if (step === null) throw new Error("Invalid authenticator code");
  const changed = await db.adminMfaCredential.updateMany({
    where: { userId, enabledAt: null, lastUsedStep: { lt: step } },
    data: { enabledAt: new Date(), lastUsedStep: step },
  });
  if (changed.count !== 1) throw new Error("MFA enrollment was already completed or code reused");
  await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
