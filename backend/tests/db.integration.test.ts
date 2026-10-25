import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { assertDatabaseReady } from "../src/db/client.js";
import { createOwnedBusiness, listBusinessesForUser } from "../src/modules/businesses/repository.js";

// Tests intentionally leave audit rows immutable: run only against disposable local DB.
const url = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "test" || process.env.DB_TEST_ALLOWED !== "true" || !url) {
  throw new Error("B2 integration tests require NODE_ENV=test, DB_TEST_ALLOWED=true and an isolated database");
}
const parsed = new URL(url);
if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) ||
    !/(^|[_-])(ci|test)([_-]|$)/.test(parsed.pathname.slice(1))) {
  throw new Error("Refusing to run destructive test fixtures on a non-local/non-test database");
}

const db = new PrismaClient();
const prefix = randomUUID().slice(0, 12);
let ownerId = "";
let strangerId = "";
let businessId = "";
const slug = "b2-" + prefix;

before(async () => {
  await db.$connect();
  await assertDatabaseReady(db);
  const [owner, stranger] = await db.$transaction([
    db.user.create({ data: {
      email: "owner-" + prefix + "@example.invalid",
      displayName: "B2 Test Owner",
    } }),
    db.user.create({ data: {
      email: "stranger-" + prefix + "@example.invalid",
      displayName: "B2 Test Stranger",
    } }),
  ]);
  ownerId = owner.id;
  strangerId = stranger.id;
});

after(async () => { await db.$disconnect(); });

test("B2 migrations, database ping and UUID identity are functional", async () => {
  await assertDatabaseReady(db);
  assert.match(ownerId, /^[0-9a-f-]{36}$/i);
  const found = await db.user.findUniqueOrThrow({ where: { id: ownerId } });
  assert.equal(found.role, "ADVERTISER");
  assert.equal(found.status, "PENDING");
});

test("owner + membership + immutable audit + outbox commit atomically", async () => {
  const business = await createOwnedBusiness(db, ownerId, {
    slug, displayName: "B2 Transaction Fixture",
  });
  businessId = business.id;
  const [memberships, audit, outbox, visible, invisible] = await Promise.all([
    db.businessMembership.count({ where: { businessId } }),
    db.auditEvent.findFirst({ where: { resourceId: businessId, action: "business.created" } }),
    db.outboxEvent.findFirst({ where: { aggregateId: businessId, eventType: "business.created" } }),
    listBusinessesForUser(db, ownerId),
    listBusinessesForUser(db, strangerId),
  ]);
  assert.equal(memberships, 1);
  assert.ok(audit);
  assert.equal(audit?.actorUserId, ownerId);
  assert.ok(outbox);
  assert.ok(visible.some(item => item.id === businessId));
  assert.ok(!invisible.some(item => item.id === businessId));
});

test("duplicate business slug aborts complete transaction and leaves no partial side effects", async () => {
  const beforeCounts = await Promise.all([
    db.businessMembership.count({ where: { userId: strangerId } }),
    db.auditEvent.count({ where: { actorUserId: strangerId } }),
  ]);
  await assert.rejects(createOwnedBusiness(db, strangerId, {
    slug, displayName: "Conflict",
  }));
  const afterCounts = await Promise.all([
    db.businessMembership.count({ where: { userId: strangerId } }),
    db.auditEvent.count({ where: { actorUserId: strangerId } }),
  ]);
  assert.deepEqual(afterCounts, beforeCounts);
});

test("database enforces email normalization and membership uniqueness", async () => {
  await assert.rejects(db.user.create({ data: {
    email: "UpperCase-" + prefix + "@example.invalid", displayName: "Should Fail",
  }}));
  await assert.rejects(db.businessMembership.create({ data: {
    businessId, userId: ownerId, role: "VIEWER",
  }}));
});

test("audit events cannot be updated or deleted even through Prisma", async () => {
  const audit = await db.auditEvent.findFirstOrThrow({ where: { resourceId: businessId } });
  await assert.rejects(db.auditEvent.update({
    where: { id: audit.id }, data: { action: "business.changed" },
  }));
  await assert.rejects(db.auditEvent.delete({ where: { id: audit.id } }));
});

test("idempotency scope and key are protected by a unique DB constraint", async () => {
  const common = {
    actorScope: ownerId, requestPath: "/api/v1/example",
    key: "test-" + prefix, requestHash: "a".repeat(64),
    expiresAt: new Date(Date.now() + 60_000),
  };
  await db.idempotencyRecord.create({ data: common });
  await assert.rejects(db.idempotencyRecord.create({
    data: { ...common, requestHash: "b".repeat(64) },
  }), (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
});

test("OTP attempts cannot be negative, and invalid FK references are rejected", async () => {
  await assert.rejects(db.otpChallenge.create({ data: {
    userId: ownerId, email: "owner-" + prefix + "@example.invalid",
    codeHash: "a".repeat(64), purpose: "VERIFY_EMAIL",
    attempts: -1, expiresAt: new Date(Date.now() + 60_000),
  }}));
  await assert.rejects(db.businessMembership.create({ data: {
    businessId: randomUUID(), userId: ownerId, role: "VIEWER",
  }}));
});
