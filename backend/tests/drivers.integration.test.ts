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
if (process.env.NODE_ENV !== "test" || process.env.DB_TEST_ALLOWED !== "true" || !url)
  throw new Error("B6 integration tests require disposable local PostgreSQL");
const dbHost = new URL(url);
if (!["localhost", "127.0.0.1", "::1"].includes(dbHost.hostname) ||
    !/(^|[_-])(test|ci)([_-]|$)/.test(dbHost.pathname.slice(1)))
  throw new Error("B6 tests refuse non-test or remote databases");

test("B6 driver onboarding, vehicles, draft resume and submission boundaries", async () => {
  const db = new PrismaClient();
  const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
  const settings = loadAuthSettings({
    AUTH_SECRET: "ci_only_dev_test_auth_secret_32_characters_long_value",
  }, config);
  await db.$connect();
  const seed = randomUUID().slice(0, 10);
  const pass = await argon2.hash("B6-Test-Strong-Password-2026!", { type: argon2.argon2id });
  const users = await Promise.all(["driver1", "driver2", "advertiser"].map(async who =>
    db.user.create({ data: {
      email: "b6-" + who + "-" + seed + "@example.invalid", displayName: "B6 Test " + who,
      passwordHash: pass, status: "ACTIVE", emailVerifiedAt: new Date(),
      role: who === "advertiser" ? "ADVERTISER" : "DRIVER",
    } })));
  const [driver1, driver2, advertiser] = users as [User, User, User];
  type Identity = { cookie: string; csrf: string };
  async function session(user: User): Promise<Identity> {
    const token = makeSessionToken();
    await db.session.create({ data: { userId: user.id, tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 600_000) } });
    return { cookie: "advibe_dev_session=" + token,
      csrf: mac(settings, "csrf", hashToken(token)) };
  }
  const sessions = await Promise.all([driver1, driver2, advertiser].map(session));
  const [alice, bob, ad] = sessions as [Identity, Identity, Identity];
  const app = createApp(config, createLogger(config), async () => { await db.user.count(); },
    { db, settings, sender: async () => {} }, async () => false);
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/v1";
    function send(method: string, path: string, identity?: Identity, body?: object,
      key?: string, csrf = true, origin = "http://localhost:3000") {
      const headers: Record<string, string> = { Origin: origin };
      if (identity) headers.Cookie = identity.cookie;
      if (identity && csrf) headers["X-CSRF-Token"] = identity.csrf;
      if (key) headers["Idempotency-Key"] = key;
      if (body) headers["Content-Type"] = "application/json";
      return fetch(base + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    const get = (path: string, who?: Identity) => send("GET", path, who);
    const post = (path: string, who: Identity, body?: object, key?: string) => send("POST", path, who, body, key);
    const patch = (path: string, who: Identity, body: object, csrf = true) =>
      send("PATCH", path, who, body, undefined, csrf);
    assert.equal((await get("/drivers/me")).status, 401);
    assert.equal((await get("/drivers/me", ad)).status, 403);
    const me = await get("/drivers/me", alice);
    assert.equal(me.status, 200);
    const meData = (await me.json() as { data: { id: string; roles: string[]; passwordHash?: string } }).data;
    assert.equal(meData.id, driver1.id);
    assert.deepEqual(meData.roles, ["driver"]);
    assert.equal(meData.passwordHash, undefined);

    const vehiclePath = "/drivers/me/vehicles";
    const vehicleInput = { type: "auto", model: "Onboarding test auto", year: 2022,
      registrationToken: "veh_tok_opaqueproviderreference123" };
    const vehicleKey = "vehicle-" + seed;
    assert.equal((await post(vehiclePath, alice, vehicleInput)).status, 422);
    assert.equal((await send("POST", vehiclePath, alice, vehicleInput, vehicleKey, false)).status, 403);
    assert.equal((await post(vehiclePath, ad, vehicleInput, vehicleKey)).status, 403);
    assert.equal((await post(vehiclePath, alice,
      { ...vehicleInput, type: "truck" }, vehicleKey)).status, 422);
    const createdVehicle = await post(vehiclePath, alice, vehicleInput, vehicleKey);
    assert.equal(createdVehicle.status, 201);
    const vehicle = (await createdVehicle.json() as { data: { id: string; type: string; verification: string;
      registrationToken?: string; registrationTokenPresent: boolean } }).data;
    assert.equal(vehicle.type, "auto");
    assert.equal(vehicle.verification, "pending");
    assert.equal(vehicle.registrationToken, undefined);
    assert.equal(vehicle.registrationTokenPresent, true);
    assert.equal((await post(vehiclePath, alice, vehicleInput, vehicleKey)).status, 201);
    assert.equal(await db.vehicle.count({ where: { driverUserId: driver1.id } }), 1);
    assert.equal((await post(vehiclePath, alice, { ...vehicleInput, model: "Changed" }, vehicleKey)).status, 409);
    const dbVehicle = await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } });
    assert.match(dbVehicle.registrationTokenHash || "", /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(dbVehicle).includes(vehicleInput.registrationToken));

    const foreignVehicleResponse = await post(vehiclePath, bob,
      { type: "bike", model: "Second driver's bike", year: 2023 }, "second-vehicle-" + seed);
    assert.equal(foreignVehicleResponse.status, 201);
    const foreignVehicle = (await foreignVehicleResponse.json() as { data: { id: string } }).data;
    const bobVehicles = await get(vehiclePath, bob);
    assert.equal(bobVehicles.status, 200);
    const bobData = await bobVehicles.json() as { data: Array<{ id: string }> };
    assert.deepEqual(bobData.data.map(v => v.id), [foreignVehicle.id]);

    const applications = "/drivers/applications";
    assert.equal((await post(applications, alice)).status, 422);
    assert.equal((await post(applications, ad, {}, "ad-create-" + seed)).status, 403);
    const createKey = "draft-create-" + seed;
    const create = await post(applications, alice, {}, createKey);
    assert.equal(create.status, 201);
    const newDraft = (await create.json() as { data: { id: string; state: string; completedStep: number;
      version: number } }).data;
    assert.equal(newDraft.state, "draft");
    assert.equal(newDraft.completedStep, 0);
    assert.equal(newDraft.version, 0);
    assert.equal((await post(applications, alice, {}, createKey)).status, 201);
    assert.equal(await db.driverApplication.count({ where: { driverUserId: driver1.id } }), 1);
    assert.equal((await post(applications, alice, {}, "different-key-" + seed)).status, 409);
    const path = applications + "/" + newDraft.id;
    assert.equal((await get(path, bob)).status, 404);
    assert.equal((await get(path, ad)).status, 403);
    assert.equal((await post(path + "/submit", alice, {}, "early-submit-" + seed)).status, 422);
    assert.equal((await patch(path, alice,
      { step: 3, expectedVersion: 0, screenChoice: "rear_window" })).status, 409);
    assert.equal((await patch(path, alice,
      { step: 1, expectedVersion: 0, city: "Prayagraj", experience: "new" }, false)).status, 403);
    assert.equal((await patch(path, alice,
      { step: 1, expectedVersion: 0, city: "Prayagraj", experience: "new", state: "APPROVED" })).status, 422);

    const steps: Array<Record<string, unknown>> = [
      { step: 1, city: "Prayagraj", experience: "one_to_three" },
      { step: 2, vehicleId: vehicle.id, vehicleCategory: "auto" },
      { step: 3, screenChoice: "rear_window_provisional" },
      { step: 4, agreementTemplateVersion: "driver-draft-v1" },
      { step: 5, confirmedReadiness: true },
    ];
    let version = 0;
    for (const body of steps) {
      if (body.step === 2) {
        assert.equal((await patch(path, alice, { ...body, expectedVersion: version,
          vehicleId: foreignVehicle.id, vehicleCategory: "bike" })).status, 422,
          "Cross-driver vehicle cannot be selected");
      }
      const response = await patch(path, alice, { ...body, expectedVersion: version });
      assert.equal(response.status, 200, "Step " + body.step + " save");
      const saved = (await response.json() as { data: { version: number; completedStep: number } }).data;
      version++;
      assert.equal(saved.version, version);
      assert.equal(saved.completedStep, version);
      assert.equal((await patch(path, alice, { ...body, expectedVersion: version - 1 })).status, 409,
        "Optimistic concurrency blocks stale writers");
    }
    const resumed = await get(path, alice);
    assert.equal(resumed.status, 200);
    const persisted = (await resumed.json() as { data: {
      completedStep: number; city: string; vehicleId: string; confirmedReadiness: boolean;
      agreementTemplateVersion: string; state: string;
    } }).data;
    assert.equal(persisted.completedStep, 5);
    assert.equal(persisted.city, "Prayagraj");
    assert.equal(persisted.vehicleId, vehicle.id);
    assert.equal(persisted.confirmedReadiness, true);
    assert.equal(persisted.agreementTemplateVersion, "driver-draft-v1");
    assert.equal(persisted.state, "draft");
    const submitKey = "submit-b6-" + seed;
    assert.equal((await send("POST", path + "/submit", alice, {}, submitKey, false)).status, 403);
    assert.equal((await post(path + "/submit", bob, {}, submitKey)).status, 404);
    const submit = await post(path + "/submit", alice, {}, submitKey);
    assert.equal(submit.status, 201);
    const submitted = (await submit.json() as { data: { state: string; submittedAt: string;
      version: number } }).data;
    assert.equal(submitted.state, "submitted");
    assert.ok(submitted.submittedAt);
    assert.equal(submitted.version, 6);
    assert.equal((await post(path + "/submit", alice, {}, submitKey)).status, 201);
    assert.equal((await post(path + "/submit", alice, {}, "submit-again-" + seed)).status, 409);
    assert.equal((await patch(path, alice, { ...steps[0], expectedVersion: 6 })).status, 409);
    assert.equal(await db.outboxEvent.count({ where: {
      aggregateType: "driver_application", aggregateId: newDraft.id,
      eventType: "driver.application_submitted",
    } }), 1);
    assert.equal(await db.auditEvent.count({ where: {
      actorUserId: driver1.id, resourceType: "driver_application",
      resourceId: newDraft.id,
    } }), 7, "Create, five saves, submit audited");

    const another = await post(applications, alice, {}, "second-draft-" + seed);
    assert.equal(another.status, 201, "After submission another draft may be created");
    const page1 = await get(applications + "?limit=1", alice);
    assert.equal(page1.status, 200);
    const page = await page1.json() as { data: Array<{ id: string }>; meta: {
      nextCursor: string | null; limit: number;
    } };
    assert.equal(page.data.length, 1);
    assert.ok(page.meta.nextCursor);
    const page2 = await get(applications + "?limit=1&cursor=" + page.meta.nextCursor, alice);
    assert.equal(page2.status, 200);
    assert.notEqual((await page2.json() as { data: Array<{ id: string }> }).data[0]!.id, page.data[0]!.id);
    assert.equal((await get(applications + "?limit=1&cursor=bogus", alice)).status, 422);
    assert.equal((await get(applications, bob)).status, 200);
    assert.deepEqual((await (await get(applications, bob)).json() as { data: unknown[] }).data, []);

    // PostgreSQL composite FK also rejects driver A selecting driver B's vehicle through raw ORM writes.
    await assert.rejects(db.driverApplication.create({ data: {
      driverUserId: driver2.id, vehicleId: vehicle.id, vehicleCategory: "AUTO",
    } }));
    assert.equal((await get("/drivers/me/vehicles", alice)).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    await db.$disconnect();
  }
});
