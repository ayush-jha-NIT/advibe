import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 43000 + process.pid % 1000;
const child = spawn(process.execPath, ["dist/server.js"], {
  cwd,
  env: { ...process.env, NODE_ENV: "test", HOST: "127.0.0.1", PORT: String(port),
    CORS_ORIGINS: "http://localhost:3000", LOG_LEVEL: "silent" },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", chunk => { stderr += String(chunk); });
try {
  let response;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error("Compiled API exited early: " + stderr.slice(0, 1000));
    try {
      response = await fetch("http://127.0.0.1:" + port + "/api/v1/health", {
        signal: AbortSignal.timeout(700),
      });
      break;
    } catch {
      await sleep(100);
    }
  }
  assert.ok(response, "Compiled backend did not start");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { message: "ok" } });
  const ready = await fetch("http://127.0.0.1:" + port + "/api/v1/ready");
  assert.equal(ready.status, 200);
  const missing = await fetch("http://127.0.0.1:" + port + "/api/v1/auth/login");
  assert.equal(missing.status, 404, "Production auth must not be a placeholder 200");
  process.stdout.write("B1 compiled HTTP smoke passed\n");
} finally {
  child.kill("SIGTERM");
  if (child.exitCode === null) await Promise.race([once(child, "exit"), sleep(2500)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
