import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import argon2 from "argon2";
import { PrismaClient, type User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { hashToken, mac, makeSessionToken } from "../src/modules/auth/security.js";
import { loadAuthSettings } from "../src/modules/auth/settings.js";

const url = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "test" || process.env.DB_TEST_ALLOWED !== "true" || !url) {
  throw new Error("B5 database tests require NODE_ENV=test and DB_TEST_ALLOWED=true");
}
const target = new URL(url);
if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname) ||
    !/(^|[_-])(test|ci)([_-]|$)/.test(target.pathname.slice(1))) {
  throw new Error("B5 refuses non-local or non-test databases");
}

test("B5 profile, real business ownership and enquiry lifecycle", async () => {
  const db = new PrismaClient();
  const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
  const settings = loadAuthSettings({
    AUTH_SECRET: "ci_only_dev_test_auth_secret_32_characters_long_value",
  }, config);
  const hash = await argon2.hash("B5-Only!Test#SecurePassword2026", { type: argon2.argon2id });
  const seed = randomUUID().slice(0, 12);
  const email = (kind: string) => kind + "-" + seed + "@example.invalid";
  await db.$connect();
  const [owner, manager, viewer, stranger, driver] = await Promise.all(
    ["owner", "manager", "viewer", "stranger", "driver"].map(async kind => db.user.create({
      data: { email: email(kind), displayName: "B5 " + kind,
        passwordHash: hash, status: "ACTIVE", emailVerifiedAt: new Date(),
        role: kind === "driver" ? "DRIVER" : "ADVERTISER" },
    })),
  );
  type Identity = { user: User; cookie: string; csrf: string };
  async function identity(user: User): Promise<Identity> {
    const token = makeSessionToken();
    await db.session.create({
      data: { userId: user.id, tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1_800_000) },
    });
    return { user, cookie: "advibe_dev_session=" + token,
      csrf: mac(settings, "csrf", hashToken(token)) };
  }
  const [owned, managed, viewing, outside, driving] = await Promise.all(
    [owner, manager, viewer, stranger, driver].map(identity),
  );
  const verifyCalls: string[] = [];
  const app = createApp(config, createLogger(config), async () => { await db.user.count(); },
    { db, settings, sender: async () => { throw new Error("Unexpected email"); } },
    async token => { verifyCalls.push(token); return token.startsWith("verified-enquiry-captcha-token"); },
  );
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/v1";
    const fetchApi = (method: string, path: string, body?: object, who?: Identity,
      csrf = true, origin = "http://localhost:3000") => {
      const headers: Record<string, string> = { Origin: origin };
      if (body) headers["Content-Type"] = "application/json";
      if (who) headers.Cookie = who.cookie;
      if (who && csrf) headers["X-CSRF-Token"] = who.csrf;
      return fetch(base + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    };
    const get = (path: string, who?: Identity) => fetchApi("GET", path, undefined, who);
    const post = (path: string, body: object, who?: Identity, csrf = true) =>
      fetchApi("POST", path, body, who, csrf);
    const patch = (path: string, body: object, who?: Identity, csrf = true) =>
      fetchApi("PATCH", path, body, who, csrf);

    assert.equal((await get("/me")).status, 401);
    const me = await get("/me", owned);
    assert.equal(me.status, 200);
    const meData = await me.json() as { data: Record<string, unknown> };
    assert.equal(meData.data.id, owner.id);
    assert.deepEqual(meData.data.roles, ["advertiser"]);
    assert.equal(meData.data.email, owner.email);
    for (const key of ["passwordHash", "tokenHash", "emailVerifiedAt", "mfaCredential"]) {
      assert.equal(key in meData.data, false, "Profile must not expose auth internals");
    }
    assert.equal((await patch("/me", { displayName: "Updated" }, owned, false)).status, 403);
    assert.equal((await patch("/me", { role: "ADMIN", displayName: "Escalation" }, owned)).status, 422);
    assert.equal((await patch("/me", {}, owned)).status, 422);
    const edited = await patch("/me", { displayName: "B5 Founder", city: "Prayagraj" }, owned);
    assert.equal(edited.status, 200);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).city, "Prayagraj");
    assert.equal((await get("/me", owned)).status, 200);
    assert.equal((await patch("/me", { city: "Lucknow" }, driving)).status, 200,
      "Driver may edit only their own profile");
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: driver.id } })).city, "Lucknow");
    assert.equal((await get("/businesses", driving)).status, 403);

    const input = { slug: "b5-shop-" + seed, displayName: "Real Business",
      city: "Prayagraj", legalName: "Real Business Private Limited" };
    assert.equal((await post("/businesses", input, owned, false)).status, 403);
    assert.equal((await post("/businesses", input, driving)).status, 403);
    assert.equal((await post("/businesses", { ...input, verificationStatus: "APPROVED" }, owned)).status, 422);
    const created = await post("/businesses", input, owned);
    assert.equal(created.status, 201);
    const business = (await created.json() as { data: { id: string; verificationStatus: string;
      slug: string; city: string } }).data;
    assert.equal(business.verificationStatus, "pending");
    assert.equal(business.city, input.city);
    assert.equal(business.slug, input.slug);
    assert.match(business.id, /^[0-9a-f-]{36}$/);
    assert.equal((await post("/businesses", input, owned)).status, 409, "Duplicate slug must conflict");
    const membership = await db.businessMembership.findUniqueOrThrow({
      where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    });
    assert.equal(membership.role, "OWNER");
    assert.equal((await get("/businesses/me", owned)).status, 200);
    assert.equal((await get("/businesses/me", outside)).status, 404);
    const list = await get("/businesses?limit=1", owned);
    assert.equal(list.status, 200);
    const listed = await list.json() as { data: Array<{ id: string }>; meta: { limit: number } };
    assert.deepEqual(listed.data.map(v => v.id), [business.id]);
    assert.equal(listed.meta.limit, 1);
    assert.equal((await get("/businesses?limit=0", owned)).status, 422);
    assert.equal((await get("/businesses?cursor=bogus", owned)).status, 422);
    assert.equal((await get("/businesses/" + business.id, outside)).status, 404);
    assert.equal((await patch("/businesses/" + business.id, { displayName: "Intrusion" }, outside)).status, 404);

    await db.businessMembership.createMany({ data: [
      { businessId: business.id, userId: manager.id, role: "MANAGER" },
      { businessId: business.id, userId: viewer.id, role: "VIEWER" },
    ] });
    assert.equal((await get("/businesses/" + business.id, managed)).status, 200);
    assert.equal((await patch("/businesses/" + business.id,
      { displayName: "Nope" }, viewing)).status, 404, "Viewer cannot edit business");
    const update = await patch("/businesses/" + business.id,
      { displayName: "Manager Edited" }, managed);
    assert.equal(update.status, 200);
    assert.equal((await db.business.findUniqueOrThrow({ where: { id: business.id } })).displayName,
      "Manager Edited");
    assert.equal((await patch("/businesses/me", { displayName: "Owner Edited" }, owned)).status, 200);
    assert.equal((await patch("/businesses/" + business.id,
      { verificationStatus: "APPROVED" }, owned)).status, 422);

    // Revocation is immediately enforced for read and update.
    await db.businessMembership.update({
      where: { businessId_userId: { businessId: business.id, userId: manager.id } },
      data: { revokedAt: new Date() },
    });
    assert.equal((await get("/businesses/" + business.id, managed)).status, 404);
    assert.equal((await patch("/businesses/" + business.id, { city: "Kanpur" }, managed)).status, 404);

    const payload = { name: "Interested Customer", email: email("enquiry"),
      subject: "Advertising partnership", message: "Please tell me more about your advertising services.",
      consent: true, captchaToken: "verified-enquiry-captcha-token-" + seed };
    assert.equal((await post("/enquiries", { ...payload, consent: false })).status, 422);
    assert.equal((await post("/enquiries", { ...payload, captchaToken: "invalid-enquiry-captcha-token" })).status, 422);
    assert.equal((await fetchApi("POST", "/enquiries", payload, undefined, false,
      "https://untrusted.example")).status, 403);
    const enquiry = await post("/enquiries", payload);
    assert.equal(enquiry.status, 201);
    const receipt = await enquiry.json() as { data: Record<string, string> };
    assert.deepEqual(Object.keys(receipt.data), ["message"]);
    assert.equal(verifyCalls.length, 2);
    const stored = await db.enquiry.findFirstOrThrow({
      where: { email: payload.email }, orderBy: { createdAt: "desc" },
    });
    assert.equal(stored.status, "NEW");
    assert.equal(stored.name, payload.name);
    assert.equal(stored.message, payload.message);
    assert.equal(stored.consentAt instanceof Date, true);
    assert.match(stored.submitterHash, /^[a-f0-9]{64}$/);
    const outbox = await db.outboxEvent.findFirst({
      where: { aggregateType: "enquiry", aggregateId: stored.id, eventType: "enquiry.received" },
    });
    assert.ok(outbox, "Enquiry and durable outbox event committed together");
    assert.equal((await get("/enquiries")).status, 404, "No public enquiry listing");
    assert.equal((await post("/enquiries", payload)).status, 201);
    assert.equal((await post("/enquiries", payload)).status, 429, "Email rate limit rejects fourth attempt including failed captcha");

    assert.equal((await fetchApi("DELETE", "/businesses/" + business.id,
      undefined, viewing)).status, 404, "Viewer cannot archive a business");
    assert.equal((await fetchApi("DELETE", "/businesses/" + business.id,
      undefined, managed)).status, 404, "Former manager cannot archive business");
    assert.equal((await fetchApi("DELETE", "/businesses/" + business.id,
      undefined, owned, false)).status, 403, "Archival requires CSRF");
    const archive = await fetchApi("DELETE", "/businesses/" + business.id,
      undefined, owned);
    assert.equal(archive.status, 200);
    assert.ok((await db.business.findUniqueOrThrow({ where: { id: business.id } })).archivedAt);
    assert.equal((await get("/businesses/" + business.id, owned)).status, 404);
    assert.equal((await get("/businesses/me", owned)).status, 404);
    assert.equal((await get("/businesses", owned)).status, 200);
    assert.equal(await db.businessMembership.count({
      where: { businessId: business.id, revokedAt: null },
    }), 0, "Archival revokes active memberships");
    assert.equal(await db.auditEvent.count({
      where: { resourceType: "business", resourceId: business.id },
    }), 4, "Create + two updates + archive are append-only audited");
    assert.equal(await db.auditEvent.count({
      where: { actorUserId: owner.id, action: "account.profile_updated" },
    }), 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.$disconnect();
  }
});
