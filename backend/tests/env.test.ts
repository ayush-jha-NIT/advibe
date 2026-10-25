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
