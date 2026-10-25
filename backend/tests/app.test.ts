import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type Express } from "express";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { requestContext } from "../src/middleware/request-context.js";
import { validateBody } from "../src/middleware/validate.js";

const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
const logger = createLogger(config);

async function withServer<T>(app: Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    return await run("http://127.0.0.1:" + address.port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("health and readiness are HTTP 200 with server request IDs and security headers", async () => {
  await withServer(createApp(config, logger), async baseUrl => {
    for (const path of ["/api/v1/health", "/api/v1/ready"]) {
      const response = await fetch(baseUrl + path);
      assert.equal(response.status, 200);
      const body: unknown = await response.json();
      assert.deepEqual(body, { data: { message: path.endsWith("ready") ? "ready" : "ok" } });
      assert.match(response.headers.get("x-request-id") ?? "", /^[\da-f-]{36}$/i);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(response.headers.has("x-content-type-options"));
      assert.equal(response.headers.get("x-powered-by"), null);
    }
  });
});

test("readiness responds with sanitized 503 while draining", async () => {
  const app = createApp(config, logger);
  app.locals.ready = false;
  await withServer(app, async baseUrl => {
    const response = await fetch(baseUrl + "/api/v1/ready");
    assert.equal(response.status, 503);
    const body = await response.json() as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, "NOT_READY");
    assert.equal(body.error.requestId, response.headers.get("x-request-id"));
  });
});

test("unknown routes return the standard error envelope, not HTML", async () => {
  await withServer(createApp(config, logger), async baseUrl => {
    const response = await fetch(baseUrl + "/api/v1/no-such-route");
    assert.equal(response.status, 404);
    const body = await response.json() as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, "NOT_FOUND");
    assert.equal(body.error.requestId, response.headers.get("x-request-id"));
  });
});

test("CORS allows exact configured origins only, without wildcard credentials", async () => {
  await withServer(createApp(config, logger), async baseUrl => {
    const allowed = await fetch(baseUrl + "/api/v1/health", {
      headers: { Origin: "http://localhost:3000" },
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
    const denied = await fetch(baseUrl + "/api/v1/health", {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });
});

test("invalid JSON and oversized bodies fail safely without reflection", async () => {
  await withServer(createApp(config, logger), async baseUrl => {
    const invalid = await fetch(baseUrl + "/api/v1/health", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"password":',
    });
    assert.equal(invalid.status, 400);
    const badJson = await invalid.json() as { error: { code: string; message: string } };
    assert.equal(badJson.error.code, "INVALID_JSON");
    assert.ok(!badJson.error.message.includes("password"));

    const oversized = await fetch(baseUrl + "/api/v1/health", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: "x".repeat(70_000) }),
    });
    assert.equal(oversized.status, 413);
    const tooLarge = await oversized.json() as { error: { code: string } };
    assert.equal(tooLarge.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("Zod middleware accepts valid input and returns bounded structured errors", async () => {
  const app = express();
  app.use(requestContext(logger));
  app.use(express.json());
  app.post("/example", validateBody(z.object({
    title: z.string().min(3),
    count: z.number().int().positive(),
  }).strict()), (req, res) => res.json({ data: req.body }));
  app.use(errorHandler(logger));

  await withServer(app, async baseUrl => {
    const valid = await fetch(baseUrl + "/example", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Screen", count: 2 }),
    });
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), { data: { title: "Screen", count: 2 } });

    const invalid = await fetch(baseUrl + "/example", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", count: -1, injected: true }),
    });
    assert.equal(invalid.status, 422);
    const body = await invalid.json() as { error: { code: string; details: Array<{ field: string }> } };
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.ok(body.error.details.some(detail => detail.field === "title"));
  });
});
