import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config/env.js";

test("B1 environment provides safe development defaults", () => {
  const config = loadConfig({});
  assert.equal(config.port, 4000);
  assert.deepEqual(config.corsOrigins, ["http://localhost:3000"]);
  assert.equal(config.trustProxy, false);
});

test("rejects malformed port, invalid log levels and untrusted CORS origins", () => {
  assert.throws(() => loadConfig({ PORT: "0" }), /PORT/);
  assert.throws(() => loadConfig({ PORT: "65536" }), /PORT/);
  assert.throws(() => loadConfig({ LOG_LEVEL: "verbose" }), /LOG_LEVEL/);
  assert.throws(() => loadConfig({ CORS_ORIGINS: "*" }), /CORS_ORIGINS/);
  assert.throws(() => loadConfig({ CORS_ORIGINS: "https:\/\/ok.example\/path" }), /CORS_ORIGINS/);
  assert.throws(() => loadConfig({ CORS_ORIGINS: "null" }), /CORS_ORIGINS/);
});

test("production requires an explicit HTTPS origin", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /explicit CORS_ORIGINS/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", CORS_ORIGINS: "http://site.example" }), /HTTPS/);
  const config = loadConfig({ NODE_ENV: "production", CORS_ORIGINS: "https://app.example,https://admin.example", TRUST_PROXY: "true" });
  assert.deepEqual(config.corsOrigins, ["https://app.example", "https://admin.example"]);
  assert.equal(config.trustProxy, true);
});

import { loadDatabaseConfig } from "../src/db/config.js";

test("B2 startup requires both runtime and direct database URLs", () => {
  assert.throws(() => loadDatabaseConfig({}), /DATABASE_URL/);
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: "postgresql://dev:pw@localhost:5432/test" }), /DIRECT_URL/);
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: "https://example.com", DIRECT_URL: "postgresql://u:p@localhost/a" }), /DATABASE_URL/);
});

test("B2 rejects non-TLS production database URLs", () => {
  assert.throws(() => loadDatabaseConfig({
    NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@database.example/db",
    DIRECT_URL: "postgresql://u:p@database.example/db?sslmode=require",
  }), /sslmode/);
  const value = "postgresql://u:p@database.example/db?sslmode=require";
  const result = loadDatabaseConfig({ NODE_ENV: "production", DATABASE_URL: value, DIRECT_URL: value });
  assert.equal(result.runtimeUrl, value);
});
