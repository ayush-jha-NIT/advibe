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
import type { AuthEmail } from "../src/modules/auth/email.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";

const dbUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "test" || process.env.DB_TEST_ALLOWED !== "true" || !dbUrl) {
  throw new Error("B3 tests require disposable PostgreSQL");
}
const uri = new URL(dbUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(uri.hostname) ||
    !/(^|[_-])(ci|test)([_-]|$)/.test(uri.pathname.slice(1))) {
  throw new Error("Refusing to execute B3 tests against remote/non-test database");
}
const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
const settings = loadAuthSettings({
  AUTH_SECRET: "ci_only_dev_test_auth_secret_32_characters_long_value",
}, config);

test("B3 register, verification, session, reset, logout and security tests", async () => {
  const db = new PrismaClient();
  const sent: AuthEmail[] = [];
  const app = createApp(config, createLogger(config), async () => { await db.user.count(); }, {
    db, settings, sender: async email => { sent.push(email); },
  });
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    await db.$connect();
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/v1/auth/";
    const email = "b3-" + randomUUID().slice(0, 12) + "@example.invalid";
    const pwd = "AUniqueSecurePassphrase!2026";
    const post = (path: string, body: Record<string, unknown>, cookie?: string, csrf?: string, origin = "http://localhost:3000") => {
      const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin };
      if (cookie) headers.Cookie = cookie;
      if (csrf) headers["X-CSRF-Token"] = csrf;
      return fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
    };
    const get = (path: string, cookie?: string) => fetch(base + path, {
      headers: cookie ? { Cookie: cookie } : {},
    });
    const registration = { email, password: pwd, role: "advertiser", displayName: "Test B3" };
    assert.equal((await post("register", { ...registration, role: "admin" })).status, 422);
    assert.equal((await post("register", registration, undefined, undefined, "https://untrusted.example")).status, 403);
    const reg = await post("register", { ...registration, email: email.toUpperCase() });
    assert.equal(reg.status, 201);
    const registered = await reg.json() as { data: { challengeId: string } };
    assert.match(registered.data.challengeId, /^[0-9a-f-]{36}$/i);
    assert.equal(sent.length, 1);
    const code = sent[0]!.text.match(/code is (\d{6})\. Challenge ID: ([0-9a-f-]{36})/);
    assert.ok(code);
    assert.equal(code[2], registered.data.challengeId);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    assert.equal(user.status, "PENDING");
    assert.equal(user.role, "ADVERTISER");
    assert.ok(user.passwordHash?.startsWith("$argon2id$"));
    assert.equal((await post("login", { email, password: pwd })).status, 401);
    const wrongCode = code[1] === "000000" ? "000001" : "000000";
    assert.equal((await post("verify", { challengeId: code[2], code: wrongCode })).status, 401);
    assert.equal((await db.otpChallenge.findUniqueOrThrow({ where: { id: code[2] } })).attempts, 1);
    assert.equal((await post("verify", { challengeId: code[2], code: code[1] })).status, 201);
    assert.equal((await post("verify", { challengeId: code[2], code: code[1] })).status, 401);
    assert.equal((await post("login", { email, password: "AnotherIncorrectPassword!" })).status, 401);
    const login = await post("login", { email, password: pwd });
    assert.equal(login.status, 201);
    const cookieHeader = login.headers.get("set-cookie") || "";
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    const cookie = cookieHeader.split(";")[0]!;
    const loginBody = await login.json() as { data: { csrfToken: string; userId: string; role: string } };
    assert.equal(loginBody.data.userId, user.id);
    assert.equal(loginBody.data.role, "advertiser");
    assert.match(loginBody.data.csrfToken, /^[a-f0-9]{64}$/);
    assert.equal((await get("session")).status, 401);
    assert.equal((await get("session", cookie)).status, 200);
    assert.equal((await post("logout", {}, cookie)).status, 403);
    assert.equal((await post("logout", {}, cookie, "a".repeat(64))).status, 403);
    assert.equal((await get("session", cookie)).status, 200);

    const forgot = await post("forgot-password", { email });
    const unknown = await post("forgot-password", { email: "unknown-" + email });
    assert.equal(forgot.status, 201);
    assert.deepEqual(await unknown.json(), await forgot.json());
    const mail = sent.filter(m => m.subject.includes("password reset")).at(-1);
    assert.ok(mail);
    const token = mail.text.match(/#token=([A-Za-z0-9_.-]+)/)?.[1];
    assert.ok(token);
    const newPassword = "AnotherSecureLongPassword!2026";
    assert.equal((await post("reset-password", { resetToken: token, newPassword })).status, 201);
    assert.equal((await post("reset-password", { resetToken: token, newPassword })).status, 401);
    assert.equal((await get("session", cookie)).status, 401, "Reset revokes previous sessions");
    assert.equal((await post("login", { email, password: pwd })).status, 401);
    const login2 = await post("login", { email, password: newPassword });
    assert.equal(login2.status, 201);
    const token2 = (await login2.json() as { data: { csrfToken: string } }).data.csrfToken;
    const cookie2 = (login2.headers.get("set-cookie") || "").split(";")[0]!;
    assert.equal((await post("logout-all", {}, cookie2, token2)).status, 201);
    assert.equal((await get("session", cookie2)).status, 401);
    assert.equal((await post("register", registration)).status, 409);
    assert.equal((await post("resend-verification", { email: "missing-" + email })).status, 201);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.$disconnect();
  }
});

test("B3 blocks unprotected Admin login before B4 MFA", async () => {
  const db = new PrismaClient();
  await db.$connect();
  const email = "b3-admin-" + randomUUID().slice(0, 12) + "@example.invalid";
  const password = "AdminSecurePassphrase!2026";
  const user = await db.user.create({ data: { email, displayName: "Test Admin",
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    emailVerifiedAt: new Date(), status: "ACTIVE", role: "ADMIN" } });
  const app = createApp(config, createLogger(config), async () => {}, {
    db, settings, sender: async () => {},
  });
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const response = await fetch("http://127.0.0.1:" +
      (server.address() as AddressInfo).port + "/api/v1/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json",
        Origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 403);
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.$disconnect();
  }
});
