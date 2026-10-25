import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { activateAdminMfa, decryptTotpSecret, encryptTotpSecret, provisionAdminMfa, totpForStep, verifyTotpStep } from "../src/modules/auth/mfa.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";

const url = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "test" || process.env.DB_TEST_ALLOWED !== "true" || !url) {
  throw new Error("B4 security integration requires isolated PostgreSQL");
}
const connection = new URL(url);
if (!["localhost", "127.0.0.1", "::1"].includes(connection.hostname) ||
    !/(^|[_-])(ci|test)([_-]|$)/.test(connection.pathname.slice(1))) {
  throw new Error("B4 security tests refuse non-local or non-test databases");
}

test("RFC6238 TOTP, AES-GCM authenticated encryption and replay windows", () => {
  const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
  const settings = loadAuthSettings({ AUTH_SECRET: "b4_security_test_auth_secret_over_32_characters",
    MFA_ENCRYPTION_KEY: "3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57" }, config);
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(totpForStep(secret, 1), "287082");
  assert.equal(verifyTotpStep(secret, "287082", 59_000), 1n);
  assert.equal(verifyTotpStep(secret, "287082", 180_000), null);
  const userId = randomUUID();
  const encrypted = encryptTotpSecret(settings, userId, secret);
  assert.equal(decryptTotpSecret(settings, userId, encrypted), secret);
  assert.throws(() => decryptTotpSecret(settings, randomUUID(), encrypted));
});

test("B4 admin password -> MFA ticket -> replay-safe TOTP -> session; tenant isolation", async () => {
  const db = new PrismaClient();
  const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
  const settings = loadAuthSettings({
    AUTH_SECRET: "b4_security_test_auth_secret_over_32_characters",
    MFA_ENCRYPTION_KEY: "3f4e8bb1976542ac8ef51b03d9607a2acb8970645a1ed3c0b7d14982f63a0e57",
  }, config);
  const prefix = randomUUID().slice(0, 10);
  const password = "B4TestPassphraseSecure#2026";
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  await db.$connect();
  const [admin, advertiser, stranger] = await Promise.all([
    db.user.create({ data: { email: "b4-admin-" + prefix + "@example.invalid",
      displayName: "B4 Admin", role: "ADMIN", status: "ACTIVE",
      emailVerifiedAt: new Date(), passwordHash: hash } }),
    db.user.create({ data: { email: "b4-owner-" + prefix + "@example.invalid",
      displayName: "B4 Owner", status: "ACTIVE",
      emailVerifiedAt: new Date(), passwordHash: hash } }),
    db.user.create({ data: { email: "b4-outsider-" + prefix + "@example.invalid",
      displayName: "B4 Outsider", role: "DRIVER", status: "ACTIVE",
      emailVerifiedAt: new Date(), passwordHash: hash } }),
  ]);
  const business = await db.business.create({ data: {
    ownerUserId: advertiser.id, slug: "b4-business-" + prefix,
    displayName: "B4 Tenant Scope Test" } });
  await db.businessMembership.create({ data: { businessId: business.id,
    userId: advertiser.id, role: "OWNER" } });

  const app = createApp(config, createLogger(config), async () => { await db.user.count(); },
    { db, settings, sender: async () => {} });
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/v1/auth";
    const post = (path: string, data: Record<string, unknown>, cookie?: string, csrf?: string) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json", Origin: "http://localhost:3000",
      };
      if (cookie) headers.Cookie = cookie;
      if (csrf) headers["X-CSRF-Token"] = csrf;
      return fetch(base + path, { method: "POST", headers, body: JSON.stringify(data) });
    };
    const get = (path: string, cookie?: string, extraHeaders?: Record<string, string>) =>
      fetch(base + path, { headers: { ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders } });

    const enrollment = await provisionAdminMfa(db, settings, admin.id);
    assert.match(enrollment.uri, /^otpauth:\/\/totp\//);
    const encrypted = await db.adminMfaCredential.findUniqueOrThrow({ where: { userId: admin.id } });
    assert.ok(!encrypted.secretCipher.includes(enrollment.secret));
    assert.equal(decryptTotpSecret(settings, admin.id, encrypted.secretCipher), enrollment.secret);
    assert.throws(() => decryptTotpSecret(settings, stranger.id, encrypted.secretCipher));
    assert.equal((await post("/login", { email: admin.email, password })).status, 403,
      "Unactivated Admin TOTP is not enough");
    const nowStep = Math.floor(Date.now() / 30_000);
    await activateAdminMfa(db, settings, admin.id, totpForStep(enrollment.secret, nowStep - 1));
    await assert.rejects(activateAdminMfa(db, settings, admin.id, totpForStep(enrollment.secret, nowStep - 1)));

    const passwordOk = await post("/login", { email: admin.email, password });
    assert.equal(passwordOk.status, 202);
    assert.equal(passwordOk.headers.get("set-cookie"), null, "Password alone must not issue an admin cookie");
    const pending = await passwordOk.json() as { data: { challengeId: string; ticket: string } };
    assert.match(pending.data.ticket, /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await get("/admin-security")).status, 401);
    const invalidTicket = await post("/mfa/verify", {
      ...pending.data, ticket: "a".repeat(43), code: totpForStep(enrollment.secret, nowStep),
    });
    assert.equal(invalidTicket.status, 401);
    const badCode = await post("/mfa/verify", {
      ...pending.data, code: "999999" === totpForStep(enrollment.secret, nowStep) ? "999998" : "999999",
    });
    assert.equal(badCode.status, 401);
    const mfa = await post("/mfa/verify", {
      ...pending.data, code: totpForStep(enrollment.secret, Math.floor(Date.now() / 30_000)),
    });
    assert.equal(mfa.status, 201);
    assert.match(mfa.headers.get("set-cookie") || "", /HttpOnly/);
    const adminCookie = (mfa.headers.get("set-cookie") || "").split(";")[0]!;
    const adminData = await mfa.json() as { data: { role: string; csrfToken: string } };
    assert.equal(adminData.data.role, "admin");
    assert.equal((await get("/admin-security", adminCookie)).status, 200);
    assert.equal((await get("/session", adminCookie)).status, 200);
    const persisted = await db.session.findFirstOrThrow({ where: { userId: admin.id,
      revokedAt: null }, orderBy: { createdAt: "desc" } });
    assert.ok(persisted.mfaVerifiedAt);
    assert.equal((await post("/mfa/verify", {
      ...pending.data, code: totpForStep(enrollment.secret, Math.floor(Date.now() / 30_000)),
    })).status, 401, "Challenge consumption is one-time");

    // A second password challenge cannot reuse an already accepted TOTP step.
    const nextLogin = await post("/login", { email: admin.email, password });
    assert.equal(nextLogin.status, 202);
    const second = await nextLogin.json() as { data: { ticket: string; challengeId: string } };
    assert.equal((await post("/mfa/verify", {
      ...second.data, code: totpForStep(enrollment.secret, Math.floor(Date.now() / 30_000)),
    })).status, 401);

    const ownerLogin = await post("/login", { email: advertiser.email, password });
    assert.equal(ownerLogin.status, 201);
    const ownerCookie = (ownerLogin.headers.get("set-cookie") || "").split(";")[0]!;
    const outsiderLogin = await post("/login", { email: stranger.email, password });
    assert.equal(outsiderLogin.status, 201);
    const outsiderCookie = (outsiderLogin.headers.get("set-cookie") || "").split(";")[0]!;
    const path = "/permissions/businesses/" + business.id;
    assert.equal((await get(path, ownerCookie)).status, 200);
    assert.equal((await get(path, outsiderCookie)).status, 404,
      "Cross-tenant private business must not be visible to other authenticated users");
    assert.equal((await get(path, adminCookie)).status, 404,
      "Admin is not automatically the business owner");
    assert.equal((await get("/admin-security", ownerCookie, {
      "X-Role": "ADMIN", "X-User-ID": admin.id,
    })).status, 403, "Client-supplied role and user IDs must be ignored");
    assert.equal((await get("/admin-security", outsiderCookie)).status, 403);
    const scoped = await get("/permissions", ownerCookie);
    assert.equal(scoped.status, 200);
    const scope = await scoped.json() as { data: { businesses: Array<{ businessId: string }> } };
    assert.deepEqual(scope.data.businesses.map(v => v.businessId), [business.id]);
    assert.equal((await get("/permissions", outsiderCookie)).status, 200);

    // Session roles are resolved from the database on every request.
    await db.businessMembership.updateMany({
      where: { businessId: business.id, userId: advertiser.id }, data: { revokedAt: new Date() },
    });
    assert.equal((await get(path, ownerCookie)).status, 404);
    await db.user.update({ where: { id: advertiser.id }, data: { role: "ADMIN" } });
    assert.equal((await get("/admin-security", ownerCookie)).status, 401,
      "Promoting a logged-in user must not grant Admin without new MFA");
    await db.user.update({ where: { id: admin.id }, data: { role: "DRIVER" } });
    assert.equal((await get("/session", adminCookie)).status, 401,
      "Demoted Admin sessions must be invalidated");
    const mfaAudit = await db.auditEvent.count({ where: {
      actorUserId: admin.id, action: "auth.admin_mfa_login",
    } });
    assert.equal(mfaAudit, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.$disconnect();
  }
});
